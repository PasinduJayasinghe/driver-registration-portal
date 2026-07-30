"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { clockInAction, clockOutAction } from "@/app/(employee)/clock/actions";
import { formatTime, formatDuration, durationMs } from "@/lib/time";

function SubmitButton({ pendingLabel, label, icon, color }) {
  const { pending } = useFormStatus();
  const base =
    "w-full inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-title-md font-bold tracking-[0.05em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md";
  const cls =
    color === "red"
      ? "bg-error text-on-error hover:bg-on-error-container"
      : "bg-primary text-on-primary hover:bg-primary-container";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${base} ${cls}`}
    >
      <span className="material-symbols-outlined text-[32px]">
        {pending ? "hourglass_top" : icon}
      </span>
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function ClockButton({ openEntry }) {
  const [, inDispatch] = useActionState(clockInAction, null);
  const [, outDispatch] = useActionState(clockOutAction, null);

  if (openEntry) {
    const elapsed = durationMs(openEntry.clockIn, new Date());
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 flex flex-col items-center gap-2">
          <div className="text-label-md font-semibold tracking-[0.05em] text-on-surface-variant uppercase">
            Clocked in since
          </div>
          <div className="text-display-lg font-extrabold text-primary">
            {formatTime(openEntry.clockIn)}
          </div>
          <div className="text-label-md text-on-surface-variant">
            Elapsed: {formatDuration(elapsed)}
          </div>
        </div>
        <form action={outDispatch}>
          <SubmitButton
            label="Clock Out"
            pendingLabel="Clocking out..."
            icon="logout"
            color="red"
          />
        </form>
      </div>
    );
  }

  return (
    <form action={inDispatch}>
      <SubmitButton
        label="Clock In"
        pendingLabel="Clocking in..."
        icon="login"
      />
    </form>
  );
}
