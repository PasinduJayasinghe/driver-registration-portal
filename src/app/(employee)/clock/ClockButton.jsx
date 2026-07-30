"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { clockInAction, clockOutAction } from "@/app/(employee)/clock/actions";
import { formatTime, durationMs } from "@/lib/time";
import { springSnappy, springSoft, easeIos } from "@/lib/motion";

// Elapsed time, ticking once a second.
//
// The server renders this value once, so without a client-side timer the
// "elapsed" figure silently freezes at page-load time — on a screen whose whole
// purpose is showing how long you have been on shift, that reads as broken.
function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  return since ? Math.max(0, now - new Date(since).getTime()) : 0;
}

// h/m/s split out so each unit can animate independently.
function splitDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function TimeUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[38px] leading-[42px] font-extrabold tracking-[-0.03em] text-on-surface tabular">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant/70 font-semibold">
        {label}
      </div>
    </div>
  );
}

function SubmitButton({ pendingLabel, label, icon, tone }) {
  const { pending } = useFormStatus();
  const reduce = useReducedMotion();

  const toneCls =
    tone === "stop"
      ? "bg-error text-on-error hover:bg-on-error-container"
      : "bg-primary text-on-primary hover:bg-primary-container";

  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileTap={reduce || pending ? undefined : { scale: 0.98 }}
      transition={springSnappy}
      className={`w-full inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-title-lg font-bold transition-[background-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-ios)] disabled:opacity-60 disabled:cursor-not-allowed shadow-[var(--shadow-e2)] hover:shadow-[var(--shadow-e3)] ${toneCls}`}
    >
      <span
        className={`material-symbols-outlined text-[28px] ${
          pending ? "animate-spin" : ""
        }`}
      >
        {pending ? "progress_activity" : icon}
      </span>
      {pending ? pendingLabel : label}
    </motion.button>
  );
}

export default function ClockButton({ openEntry }) {
  const [, inDispatch] = useActionState(clockInAction, null);
  const [, outDispatch] = useActionState(clockOutAction, null);
  const reduce = useReducedMotion();

  const elapsed = useElapsed(openEntry?.clockIn);
  const { hours, minutes, seconds } = splitDuration(elapsed);

  if (openEntry) {
    return (
      <motion.div
        className="flex flex-col gap-4"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSoft}
      >
        <div className="relative bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-[var(--shadow-e1)] flex flex-col items-center gap-4 overflow-hidden">
          {/* Faint pulsing wash behind the timer. Signals "running" without a
              spinner, which would imply the page is waiting on something. */}
          {!reduce ? (
            <motion.div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-24 bg-primary/[0.05] blur-2xl"
              animate={{ opacity: [0.45, 0.85, 0.45] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: easeIos }}
            />
          ) : null}

          <div className="relative flex items-center gap-2">
            <motion.span
              className="w-2 h-2 rounded-full bg-green-500"
              animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: easeIos }}
            />
            <span className="text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant/80">
              On the clock since {formatTime(openEntry.clockIn)}
            </span>
          </div>

          <div className="relative flex items-start gap-5">
            <TimeUnit value={hours} label="hrs" />
            <div className="text-[38px] leading-[42px] font-extrabold text-outline-variant/70 select-none">
              :
            </div>
            <TimeUnit value={minutes} label="min" />
            <div className="text-[38px] leading-[42px] font-extrabold text-outline-variant/70 select-none">
              :
            </div>
            <TimeUnit value={seconds} label="sec" />
          </div>
        </div>

        <form action={outDispatch}>
          <SubmitButton
            label="Clock Out"
            pendingLabel="Clocking out…"
            icon="logout"
            tone="stop"
          />
        </form>
      </motion.div>
    );
  }

  return (
    <motion.form
      action={inDispatch}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <SubmitButton
        label="Clock In"
        pendingLabel="Clocking in…"
        icon="login"
        tone="start"
      />
    </motion.form>
  );
}
