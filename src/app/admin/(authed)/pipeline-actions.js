"use server";

// Recruitment pipeline actions.
//
// SECURITY: every export in a "use server" module is a directly invocable
// endpoint. Each one calls requireAdmin() first, and each stage move is checked
// against the TRANSITIONS table rather than trusting whatever status the client
// submitted — otherwise a crafted request could jump a candidate straight to
// APPROVED, which is the state that grants clock access and payroll.

import { revalidatePath } from "next/cache";
import { db, unwrap } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canTransition, stageLabel, STAGES } from "@/lib/pipeline";
import { officeLocalToUtc } from "@/lib/time";

const INTERVIEW_MODES = new Set(["IN_PERSON", "PHONE", "VIDEO"]);
const RECORDABLE_OUTCOMES = new Set(["PASSED", "FAILED", "NO_SHOW"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message, fieldErrors) {
  return { ok: false, message, fieldErrors: fieldErrors ?? {} };
}

function ok(message) {
  return { ok: true, message };
}

function findCandidate(id) {
  return unwrap(
    db().from("Driver").select("id, status").eq("id", id).maybeSingle()
  );
}

// A stage move touches the candidate list, the dashboard funnel, and — when
// someone is hired or un-hired — the employee roster and its dependants.
function revalidatePipeline() {
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/payroll");
  revalidatePath("/admin/time-entries");
  revalidatePath("/admin/reports");
}

/**
 * Moves a candidate to `toStatus`, recording an audit event in the same
 * transaction so the trail can never drift from the status.
 *
 * `allowSameStage` covers rescheduling, where the candidate legitimately stays
 * at INTERVIEW_SCHEDULED while the underlying booking changes.
 *
 * `interviewOps` are extra apply_driver_transition parameters (p_cancel_*,
 * p_complete_*, p_schedule_*) for interview changes that must commit together
 * with the stage move. See supabase/migrations/20261107000000_move_off_prisma.sql.
 */
async function applyTransition({
  id,
  toStatus,
  note,
  actorEmail,
  allowSameStage = false,
  interviewOps = {},
}) {
  const driver = await unwrap(
    db()
      .from("Driver")
      .select("id, status, fullName")
      .eq("id", id)
      .maybeSingle()
  );
  if (!driver) return fail("Candidate not found.");

  const from = driver.status;
  const sameStage = from === toStatus;
  if (!(allowSameStage && sameStage) && !canTransition(from, toStatus)) {
    return fail(
      `Can't move ${driver.fullName} from ${stageLabel(from)} to ${stageLabel(toStatus)}.`
    );
  }

  // reviewedAt/reviewedByEmail continue to mean "who made the final call", which
  // is what /admin/employees already renders. Only the terminal stages set them,
  // and reopening clears the previous decision, matching the old resetDriver.
  let review = "keep";
  if (toStatus === STAGES.APPROVED || toStatus === STAGES.REJECTED) {
    review = "set";
  } else if (toStatus === STAGES.PENDING) {
    review = "clear";
  }

  try {
    await unwrap(
      db().rpc("apply_driver_transition", {
        p_driver_id: id,
        // The stage the move was validated against. If it changed since the
        // read above, the database rejects the whole call.
        p_expected_status: from,
        p_to_status: toStatus,
        p_actor_email: actorEmail,
        p_note: note || null,
        p_review: review,
        ...interviewOps,
      })
    );
  } catch (error) {
    if (error?.hint === "stage_conflict") {
      return fail(
        `${driver.fullName} was just moved by someone else. Refresh and try again.`
      );
    }
    throw error;
  }

  revalidatePipeline();
  return ok(`${driver.fullName} moved to ${stageLabel(toStatus)}.`);
}

/**
 * Generic stage move, used by the plain buttons on each pipeline row
 * (Shortlist, Hire, Reject, and the "move back" escapes).
 */
export async function moveDriverStageAction(formData) {
  const actorEmail = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const toStatus = String(formData.get("toStatus") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !toStatus) return;

  await applyTransition({ id, toStatus, note, actorEmail });
}

/**
 * Books an interview and moves the candidate to INTERVIEW_SCHEDULED.
 *
 * Rescheduling is the same call: any still-open interview is marked CANCELLED
 * rather than edited, so the fact that a slot moved stays on the record.
 */
export async function scheduleInterviewAction(_prevState, formData) {
  const actorEmail = await requireAdmin();

  const driverId = String(formData.get("driverId") ?? "").trim();
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  const durationRaw = String(formData.get("durationMins") ?? "30").trim();
  const mode = String(formData.get("mode") ?? "IN_PERSON").trim();
  const location = String(formData.get("location") ?? "").trim();
  const interviewerEmail = String(formData.get("interviewerEmail") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors = {};
  if (!driverId) return fail("Missing candidate.");

  // Interpreted in office time, not the server's — see officeLocalToUtc.
  const scheduledAt = officeLocalToUtc(scheduledAtRaw);
  if (!scheduledAt) {
    fieldErrors.scheduledAt = "Pick a date and time.";
  }

  const durationMins = Number(durationRaw);
  if (!Number.isInteger(durationMins) || durationMins < 5 || durationMins > 480) {
    fieldErrors.durationMins = "Duration must be between 5 and 480 minutes.";
  }
  if (!INTERVIEW_MODES.has(mode)) {
    fieldErrors.mode = "Choose an interview type.";
  }
  if (interviewerEmail && !EMAIL_RE.test(interviewerEmail)) {
    fieldErrors.interviewerEmail = "Enter a valid email address.";
  }
  if (Object.keys(fieldErrors).length) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const driver = await findCandidate(driverId);
  if (!driver) return fail("Candidate not found.");

  const isReschedule = driver.status === STAGES.INTERVIEW_SCHEDULED;
  if (
    !isReschedule &&
    !canTransition(driver.status, STAGES.INTERVIEW_SCHEDULED)
  ) {
    return fail(
      `${stageLabel(driver.status)} candidates can't have an interview booked.`
    );
  }

  return applyTransition({
    id: driverId,
    toStatus: STAGES.INTERVIEW_SCHEDULED,
    note: isReschedule ? "Interview rescheduled" : "Interview scheduled",
    actorEmail,
    allowSameStage: true,
    interviewOps: {
      // Supersede any live booking before adding the new one.
      p_cancel_open_interviews: true,
      p_schedule_at: scheduledAt.toISOString(),
      p_duration_mins: durationMins,
      p_mode: mode,
      p_location: location || null,
      p_interviewer_email: interviewerEmail || null,
      p_interview_notes: notes || null,
    },
  });
}

/**
 * Records what happened at the interview and moves the candidate to
 * INTERVIEWED, where the hire/reject decision is made.
 *
 * The outcome is stored rather than branching straight to a decision: "did not
 * pass" is a fact about the interview, while rejecting is a separate choice an
 * admin should make explicitly.
 */
export async function recordInterviewOutcomeAction(_prevState, formData) {
  const actorEmail = await requireAdmin();

  const driverId = String(formData.get("driverId") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!driverId) return fail("Missing candidate.");
  if (!RECORDABLE_OUTCOMES.has(outcome)) {
    return fail("Choose an interview outcome.", {
      outcome: "Choose an outcome.",
    });
  }

  const driver = await findCandidate(driverId);
  if (!driver) return fail("Candidate not found.");
  if (driver.status !== STAGES.INTERVIEW_SCHEDULED) {
    return fail("This candidate has no interview awaiting an outcome.");
  }

  const open = await unwrap(
    db()
      .from("Interview")
      .select("id, notes")
      .eq("driverId", driverId)
      .eq("outcome", "PENDING")
      .order("scheduledAt", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  // Append rather than overwrite — the note written when the interview was
  // booked (location, what to cover) is still worth keeping next to the
  // feedback written afterwards.
  const mergedNotes = notes
    ? [open?.notes, notes].filter(Boolean).join("\n\n")
    : open?.notes ?? null;

  const interviewOps = open
    ? {
        p_complete_interview_id: open.id,
        p_complete_outcome: outcome,
        p_complete_notes: mergedNotes,
      }
    : {};

  return applyTransition({
    id: driverId,
    toStatus: STAGES.INTERVIEWED,
    note: `Interview outcome: ${outcome}`,
    actorEmail,
    interviewOps,
  });
}

/**
 * Cancels a booked interview and returns the candidate to SHORTLISTED so they
 * can be rebooked, rather than stranding them at INTERVIEW_SCHEDULED with a
 * slot that will never happen.
 */
export async function cancelInterviewAction(formData) {
  const actorEmail = await requireAdmin();
  const driverId = String(formData.get("driverId") ?? "").trim();
  if (!driverId) return;

  await applyTransition({
    id: driverId,
    toStatus: STAGES.SHORTLISTED,
    note: "Interview cancelled",
    actorEmail,
    interviewOps: { p_cancel_open_interviews: true },
  });
}
