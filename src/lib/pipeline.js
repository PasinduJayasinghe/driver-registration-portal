// Recruitment pipeline: stages, legal moves, and the labels for both.
//
// This module is the single source of truth. Server actions validate against
// TRANSITIONS here, and the UI builds its buttons from the same table, so a
// button can never offer a move the action would reject. No server-only imports
// — client components render from this too.
//
// APPROVED means HIRED. It is the only stage that makes someone an employee,
// and everything outside this pipeline (payroll, clock access, reports,
// /admin/employees) keys off it. Treat it as the terminal success state.

export const STAGES = {
  PENDING: "PENDING",
  SHORTLISTED: "SHORTLISTED",
  INTERVIEW_SCHEDULED: "INTERVIEW_SCHEDULED",
  INTERVIEWED: "INTERVIEWED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

// Funnel order. Drives the tab order and the dashboard funnel.
export const PIPELINE_ORDER = [
  STAGES.PENDING,
  STAGES.SHORTLISTED,
  STAGES.INTERVIEW_SCHEDULED,
  STAGES.INTERVIEWED,
  STAGES.APPROVED,
  STAGES.REJECTED,
];

// Stages a candidate is still actively being considered in — i.e. work the
// admin still owes someone. Excludes both terminal states.
export const ACTIVE_STAGES = [
  STAGES.PENDING,
  STAGES.SHORTLISTED,
  STAGES.INTERVIEW_SCHEDULED,
  STAGES.INTERVIEWED,
];

export const STAGE_META = {
  PENDING: {
    label: "Applied",
    short: "Applied",
    tone: "pending",
    icon: "inbox",
    description: "New applications awaiting an initial screening.",
    // What the admin is expected to do next while a candidate sits here.
    nextAction: "Screen the application",
    // Days at this stage before it counts as stalled. Screening should be quick;
    // a post-interview decision reasonably takes a little longer.
    staleAfterDays: 3,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    short: "Shortlisted",
    tone: "info",
    icon: "star",
    description: "Passed screening. Book an interview to move them forward.",
    nextAction: "Schedule an interview",
    staleAfterDays: 5,
  },
  INTERVIEW_SCHEDULED: {
    label: "Interview scheduled",
    short: "Interview",
    tone: "warning",
    icon: "event",
    description: "Interview booked. Record the outcome once it has happened.",
    nextAction: "Run the interview",
    staleAfterDays: 1,
  },
  INTERVIEWED: {
    label: "Interviewed",
    short: "Interviewed",
    tone: "warning",
    icon: "how_to_reg",
    description: "Interview done. Waiting on a hire or reject decision.",
    nextAction: "Make a decision",
    staleAfterDays: 3,
  },
  APPROVED: {
    label: "Hired",
    short: "Hired",
    tone: "positive",
    icon: "badge",
    description: "Hired. Now a Fenix Cars employee with payroll and time records.",
    nextAction: null,
    staleAfterDays: null,
  },
  REJECTED: {
    label: "Rejected",
    short: "Rejected",
    tone: "negative",
    icon: "block",
    description: "Not proceeding.",
    nextAction: null,
    staleAfterDays: null,
  },
};

// Legal moves out of each stage. Anything not listed is rejected by the server.
//
// Forward moves are the happy path; the backward ones exist because real
// recruiting is messy — interviews get cancelled, rejections get reversed, and
// a second round sends someone from INTERVIEWED back to INTERVIEW_SCHEDULED.
export const TRANSITIONS = {
  PENDING: [STAGES.SHORTLISTED, STAGES.REJECTED, STAGES.APPROVED],
  SHORTLISTED: [
    STAGES.INTERVIEW_SCHEDULED,
    STAGES.REJECTED,
    STAGES.APPROVED,
    STAGES.PENDING,
  ],
  INTERVIEW_SCHEDULED: [
    STAGES.INTERVIEWED,
    STAGES.REJECTED,
    STAGES.SHORTLISTED,
  ],
  // A second round loops back to INTERVIEW_SCHEDULED.
  INTERVIEWED: [STAGES.APPROVED, STAGES.REJECTED, STAGES.INTERVIEW_SCHEDULED],
  APPROVED: [STAGES.REJECTED],
  REJECTED: [STAGES.PENDING],
};

export function canTransition(from, to) {
  if (!from || !to) return false;
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function stageLabel(status) {
  return STAGE_META[status]?.label ?? status;
}

export function stageTone(status) {
  return STAGE_META[status]?.tone ?? "neutral";
}

export const INTERVIEW_MODE_LABELS = {
  IN_PERSON: "In person",
  PHONE: "Phone",
  VIDEO: "Video call",
};

export const INTERVIEW_OUTCOME_LABELS = {
  PENDING: "Awaiting outcome",
  PASSED: "Passed",
  FAILED: "Did not pass",
  NO_SHOW: "No show",
  CANCELLED: "Cancelled",
};

// Interviews that are still "live" — a cancelled or completed one shouldn't be
// treated as the candidate's upcoming booking.
export const OPEN_INTERVIEW_OUTCOMES = ["PENDING"];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days between `since` and now. Used for the "waiting N days" column.
 */
export function daysWaiting(since, now = new Date()) {
  if (!since) return null;
  const ms = now.getTime() - new Date(since).getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / DAY_MS);
}

/**
 * True when a candidate has sat at their stage past its tolerance. This is the
 * signal that turns a passive list into something that tells you what to do —
 * without it a pipeline is just a table nobody revisits.
 */
export function isStalled(status, stageChangedAt, now = new Date()) {
  const limit = STAGE_META[status]?.staleAfterDays;
  if (limit == null || !stageChangedAt) return false;
  const days = daysWaiting(stageChangedAt, now);
  return days != null && days >= limit;
}

/**
 * Bucket an interview relative to now, for the "today / overdue" callouts.
 * `overdue` means the slot has passed but no outcome was ever recorded — the
 * single most common way a candidate silently falls out of a hiring process.
 */
export function interviewTiming(scheduledAt, now = new Date()) {
  if (!scheduledAt) return null;
  const when = new Date(scheduledAt);
  const diff = when.getTime() - now.getTime();
  if (diff < -2 * 60 * 60 * 1000) return "overdue";
  if (diff < 0) return "in_progress";
  if (diff < DAY_MS) return "today";
  if (diff < 7 * DAY_MS) return "this_week";
  return "upcoming";
}
