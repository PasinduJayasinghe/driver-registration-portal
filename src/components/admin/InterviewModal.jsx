"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Modal from "@/components/admin/Modal";
import {
  scheduleInterviewAction,
  recordInterviewOutcomeAction,
} from "@/app/admin/(authed)/pipeline-actions";

const MODES = [
  { value: "IN_PERSON", label: "In person" },
  { value: "PHONE", label: "Phone" },
  { value: "VIDEO", label: "Video call" },
];

const OUTCOMES = [
  {
    value: "PASSED",
    label: "Passed",
    hint: "Went well — move to a hire decision.",
    icon: "thumb_up",
  },
  {
    value: "FAILED",
    label: "Did not pass",
    hint: "Interviewed but not suitable.",
    icon: "thumb_down",
  },
  {
    value: "NO_SHOW",
    label: "No show",
    hint: "Candidate did not attend.",
    icon: "person_off",
  },
];

const FIELD_CLASS =
  "w-full px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none placeholder:text-on-surface-variant/60";

function SubmitButton({ label, pendingLabel, icon }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[18px]">
        {pending ? "hourglass_top" : icon}
      </span>
      {pending ? pendingLabel : label}
    </button>
  );
}

function ErrorBanner({ state }) {
  if (state?.ok !== false || !state?.message) return null;
  return (
    <div className="px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm border border-error-container/50">
      {state.message}
    </div>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return <span className="text-label-sm text-error">{children}</span>;
}

/**
 * Book or rebook an interview. `defaultValue` pre-fills when rescheduling so
 * the admin adjusts an existing slot instead of retyping it.
 */
export function ScheduleInterviewModal({
  open,
  onClose,
  driver,
  existing,
  defaultScheduledAt,
}) {
  async function action(prevState, formData) {
    const result = await scheduleInterviewAction(prevState, formData);
    if (result?.ok) onClose?.();
    return result;
  }
  const [state, formAction] = useActionState(action, null);

  const isReschedule = Boolean(existing);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReschedule ? "Reschedule interview" : "Schedule interview"}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="driverId" value={driver?.id ?? ""} />

        <ErrorBanner state={state} />

        <div className="px-3 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/40">
          <div className="text-body-md font-semibold text-on-surface">
            {driver?.fullName}
          </div>
          <div className="text-label-sm text-on-surface-variant font-mono">
            {driver?.employeeId}
          </div>
        </div>

        {isReschedule ? (
          <p className="text-label-sm text-on-surface-variant/90">
            The existing slot will be marked cancelled and replaced with the one
            below, so the change stays on the candidate&apos;s record.
          </p>
        ) : null}

        <div className="flex flex-col gap-1">
          <label
            htmlFor="scheduledAt"
            className="text-label-md font-semibold text-on-surface"
          >
            Date &amp; time<span className="text-error ml-1">*</span>
          </label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            required
            defaultValue={defaultScheduledAt ?? ""}
            className={FIELD_CLASS}
          />
          <FieldError>{state?.fieldErrors?.scheduledAt}</FieldError>
          <span className="text-label-sm text-on-surface-variant/70">
            Entered and displayed in office time.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="mode"
              className="text-label-md font-semibold text-on-surface"
            >
              Type
            </label>
            <select
              id="mode"
              name="mode"
              defaultValue={existing?.mode ?? "IN_PERSON"}
              className={FIELD_CLASS}
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <FieldError>{state?.fieldErrors?.mode}</FieldError>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="durationMins"
              className="text-label-md font-semibold text-on-surface"
            >
              Duration (mins)
            </label>
            <input
              id="durationMins"
              name="durationMins"
              type="number"
              min={5}
              max={480}
              step={5}
              defaultValue={existing?.durationMins ?? 30}
              className={FIELD_CLASS}
            />
            <FieldError>{state?.fieldErrors?.durationMins}</FieldError>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="location"
            className="text-label-md font-semibold text-on-surface"
          >
            Location / joining link
          </label>
          <input
            id="location"
            name="location"
            defaultValue={existing?.location ?? ""}
            placeholder="Office, or a meeting link"
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="interviewerEmail"
            className="text-label-md font-semibold text-on-surface"
          >
            Interviewer email
          </label>
          <input
            id="interviewerEmail"
            name="interviewerEmail"
            type="email"
            defaultValue={existing?.interviewerEmail ?? ""}
            placeholder="name@example.com"
            className={FIELD_CLASS}
          />
          <FieldError>{state?.fieldErrors?.interviewerEmail}</FieldError>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="notes"
            className="text-label-md font-semibold text-on-surface"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={existing?.notes ?? ""}
            placeholder="Anything the interviewer should know"
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container text-label-md"
          >
            Cancel
          </button>
          <SubmitButton
            label={isReschedule ? "Reschedule" : "Schedule"}
            pendingLabel="Saving..."
            icon="event"
          />
        </div>
      </form>
    </Modal>
  );
}

/**
 * Record what happened at a booked interview. Deliberately does not decide
 * hire/reject — that stays an explicit separate action at the INTERVIEWED stage.
 */
export function InterviewOutcomeModal({ open, onClose, driver }) {
  async function action(prevState, formData) {
    const result = await recordInterviewOutcomeAction(prevState, formData);
    if (result?.ok) onClose?.();
    return result;
  }
  const [state, formAction] = useActionState(action, null);

  return (
    <Modal open={open} onClose={onClose} title="Record interview outcome">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="driverId" value={driver?.id ?? ""} />

        <ErrorBanner state={state} />

        <div className="px-3 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/40">
          <div className="text-body-md font-semibold text-on-surface">
            {driver?.fullName}
          </div>
          <div className="text-label-sm text-on-surface-variant font-mono">
            {driver?.employeeId}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-label-md font-semibold text-on-surface mb-1">
            How did it go?<span className="text-error ml-1">*</span>
          </legend>
          {OUTCOMES.map((o, i) => (
            <label
              key={o.value}
              className="flex items-start gap-3 px-3.5 py-3 rounded-xl border border-outline-variant/50 cursor-pointer hover:bg-surface-container/60 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/10"
            >
              <input
                type="radio"
                name="outcome"
                value={o.value}
                defaultChecked={i === 0}
                className="mt-1 accent-[var(--color-primary)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-2 text-body-md font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">
                    {o.icon}
                  </span>
                  {o.label}
                </span>
                <span className="text-label-sm text-on-surface-variant">
                  {o.hint}
                </span>
              </span>
            </label>
          ))}
          <FieldError>{state?.fieldErrors?.outcome}</FieldError>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="outcome-notes"
            className="text-label-md font-semibold text-on-surface"
          >
            Interview notes
          </label>
          <textarea
            id="outcome-notes"
            name="notes"
            rows={3}
            placeholder="What stood out? Anything to check before deciding?"
            className={FIELD_CLASS}
          />
        </div>

        <p className="text-label-sm text-on-surface-variant/80">
          The candidate moves to <strong>Interviewed</strong>, where you can hire
          or reject them.
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container text-label-md"
          >
            Cancel
          </button>
          <SubmitButton
            label="Save outcome"
            pendingLabel="Saving..."
            icon="how_to_reg"
          />
        </div>
      </form>
    </Modal>
  );
}
