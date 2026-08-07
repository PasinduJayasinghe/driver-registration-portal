"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ScheduleInterviewModal,
  InterviewOutcomeModal,
} from "@/components/admin/InterviewModal";
import {
  moveDriverStageAction,
  cancelInterviewAction,
} from "@/app/admin/(authed)/pipeline-actions";
import { STAGES } from "@/lib/pipeline";

// Buttons are derived from the candidate's current stage, and every stage move
// they offer is one the TRANSITIONS table in @/lib/pipeline permits — the
// server re-checks the same table, so the UI can never present a move that
// would be refused.

const TONE_CLASS = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container border border-transparent",
  success:
    "bg-green-600 text-white hover:bg-green-700 border border-transparent",
  danger: "bg-error text-on-error hover:bg-on-error-container border border-transparent",
  quiet:
    "border border-outline text-on-surface-variant hover:bg-surface-container",
};

function ActionButton({ tone = "quiet", icon, children, ...rest }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap ${
        TONE_CLASS[tone] ?? TONE_CLASS.quiet
      }`}
      {...rest}
    >
      <span className="material-symbols-outlined text-[16px]">
        {pending ? "hourglass_top" : icon}
      </span>
      {children}
    </button>
  );
}

// One-click stage move. A plain form so it works without JS and gets automatic
// pending state from useFormStatus.
function StageForm({ id, toStatus, tone, icon, label, confirm }) {
  return (
    <form
      action={moveDriverStageAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="toStatus" value={toStatus} />
      <ActionButton tone={tone} icon={icon}>
        {label}
      </ActionButton>
    </form>
  );
}

export default function PipelineActions({ driver, interview }) {
  const [scheduling, setScheduling] = useState(false);
  const [recording, setRecording] = useState(false);

  const id = driver.id;
  const status = driver.status;

  function OpenScheduleButton({ label, icon = "event", tone = "primary" }) {
    return (
      <button
        type="button"
        onClick={() => setScheduling(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors whitespace-nowrap ${TONE_CLASS[tone]}`}
      >
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </button>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status === STAGES.PENDING ? (
          <>
            <StageForm
              id={id}
              toStatus={STAGES.SHORTLISTED}
              tone="primary"
              icon="star"
              label="Shortlist"
            />
            <StageForm
              id={id}
              toStatus={STAGES.REJECTED}
              tone="danger"
              icon="close"
              label="Reject"
            />
            {/* Escape hatch: hiring without an interview stays possible, since
                internal transfers and known hires shouldn't need a fake one. */}
            <StageForm
              id={id}
              toStatus={STAGES.APPROVED}
              tone="quiet"
              icon="bolt"
              label="Hire directly"
              confirm={`Hire ${driver.fullName} immediately, skipping the interview stages?`}
            />
          </>
        ) : null}

        {status === STAGES.SHORTLISTED ? (
          <>
            <OpenScheduleButton label="Schedule interview" />
            <StageForm
              id={id}
              toStatus={STAGES.REJECTED}
              tone="danger"
              icon="close"
              label="Reject"
            />
            <StageForm
              id={id}
              toStatus={STAGES.PENDING}
              tone="quiet"
              icon="undo"
              label="Back"
            />
          </>
        ) : null}

        {status === STAGES.INTERVIEW_SCHEDULED ? (
          <>
            <button
              type="button"
              onClick={() => setRecording(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors whitespace-nowrap ${TONE_CLASS.primary}`}
            >
              <span className="material-symbols-outlined text-[16px]">
                how_to_reg
              </span>
              Record outcome
            </button>
            <OpenScheduleButton
              label="Reschedule"
              icon="edit_calendar"
              tone="quiet"
            />
            <form
              action={cancelInterviewAction}
              onSubmit={(e) => {
                if (
                  !window.confirm(
                    `Cancel the interview for ${driver.fullName}? They return to Shortlisted so you can rebook.`
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="driverId" value={id} />
              <ActionButton tone="quiet" icon="event_busy">
                Cancel
              </ActionButton>
            </form>
          </>
        ) : null}

        {status === STAGES.INTERVIEWED ? (
          <>
            <StageForm
              id={id}
              toStatus={STAGES.APPROVED}
              tone="success"
              icon="check"
              label="Hire"
              confirm={`Hire ${driver.fullName}? They become an employee with time tracking and payroll.`}
            />
            <StageForm
              id={id}
              toStatus={STAGES.REJECTED}
              tone="danger"
              icon="close"
              label="Reject"
            />
            {/* Second round: rebooking returns them to INTERVIEW_SCHEDULED. */}
            <OpenScheduleButton
              label="Another round"
              icon="event_repeat"
              tone="quiet"
            />
          </>
        ) : null}

        {status === STAGES.APPROVED ? (
          <StageForm
            id={id}
            toStatus={STAGES.REJECTED}
            tone="quiet"
            icon="person_remove"
            label="Un-hire"
            confirm={`Move ${driver.fullName} out of the employee roster? They lose clock access. Time and payroll records are kept.`}
          />
        ) : null}

        {status === STAGES.REJECTED ? (
          <StageForm
            id={id}
            toStatus={STAGES.PENDING}
            tone="quiet"
            icon="undo"
            label="Reopen"
          />
        ) : null}
      </div>

      <ScheduleInterviewModal
        open={scheduling}
        onClose={() => setScheduling(false)}
        driver={driver}
        existing={status === STAGES.INTERVIEW_SCHEDULED ? interview : null}
        defaultScheduledAt={
          status === STAGES.INTERVIEW_SCHEDULED
            ? interview?.scheduledAtInput
            : undefined
        }
      />
      <InterviewOutcomeModal
        open={recording}
        onClose={() => setRecording(false)}
        driver={driver}
      />
    </>
  );
}
