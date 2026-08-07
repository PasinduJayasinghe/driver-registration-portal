"use server";

// Recruitment pipeline actions.
//
// SECURITY: every export in a "use server" module is a directly invocable
// endpoint. Each one calls requireAdmin() first, and each stage move is checked
// against the TRANSITIONS table rather than trusting whatever status the client
// submitted — otherwise a crafted request could jump a candidate straight to
// APPROVED, which is the state that grants clock access and payroll.

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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
 */
async function applyTransition({
  id,
  toStatus,
  note,
  actorEmail,
  allowSameStage = false,
  extraOps = [],
}) {
  const driver = await prisma.driver.findUnique({
    where: { id },
    select: { id: true, status: true, fullName: true },
  });
  if (!driver) return fail("Candidate not found.");

  const from = driver.status;
  const sameStage = from === toStatus;
  if (!(allowSameStage && sameStage) && !canTransition(from, toStatus)) {
    return fail(
      `Can't move ${driver.fullName} from ${stageLabel(from)} to ${stageLabel(toStatus)}.`
    );
  }

  const now = new Date();
  const data = { status: toStatus, stageChangedAt: now };

  // reviewedAt/reviewedByEmail continue to mean "who made the final call", which
  // is what /admin/employees already renders. Only the terminal stages set them.
  if (toStatus === STAGES.APPROVED || toStatus === STAGES.REJECTED) {
    data.reviewedAt = now;
    data.reviewedByEmail = actorEmail;
  }
  // Reopening clears the previous decision, matching the old resetDriver.
  if (toStatus === STAGES.PENDING) {
    data.reviewedAt = null;
    data.reviewedByEmail = null;
  }

  await prisma.$transaction([
    prisma.driver.update({ where: { id }, data }),
    prisma.driverStageEvent.create({
      data: {
        driverId: id,
        fromStatus: from,
        toStatus,
        actorEmail,
        note: note || null,
      },
    }),
    ...extraOps,
  ]);

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

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, status: true },
  });
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
    extraOps: [
      // Supersede any live booking before adding the new one.
      prisma.interview.updateMany({
        where: { driverId, outcome: "PENDING" },
        data: { outcome: "CANCELLED", completedAt: new Date() },
      }),
      prisma.interview.create({
        data: {
          driverId,
          scheduledAt,
          durationMins,
          mode,
          location: location || null,
          interviewerEmail: interviewerEmail || null,
          notes: notes || null,
          scheduledByEmail: actorEmail,
        },
      }),
    ],
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

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, status: true },
  });
  if (!driver) return fail("Candidate not found.");
  if (driver.status !== STAGES.INTERVIEW_SCHEDULED) {
    return fail("This candidate has no interview awaiting an outcome.");
  }

  const open = await prisma.interview.findFirst({
    where: { driverId, outcome: "PENDING" },
    orderBy: { scheduledAt: "desc" },
    select: { id: true, notes: true },
  });

  // Append rather than overwrite — the note written when the interview was
  // booked (location, what to cover) is still worth keeping next to the
  // feedback written afterwards.
  const mergedNotes = notes
    ? [open?.notes, notes].filter(Boolean).join("\n\n")
    : open?.notes ?? null;

  const extraOps = open
    ? [
        prisma.interview.update({
          where: { id: open.id },
          data: {
            outcome,
            completedAt: new Date(),
            notes: mergedNotes,
          },
        }),
      ]
    : [];

  return applyTransition({
    id: driverId,
    toStatus: STAGES.INTERVIEWED,
    note: `Interview outcome: ${outcome}`,
    actorEmail,
    extraOps,
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
    extraOps: [
      prisma.interview.updateMany({
        where: { driverId, outcome: "PENDING" },
        data: { outcome: "CANCELLED", completedAt: new Date() },
      }),
    ],
  });
}
