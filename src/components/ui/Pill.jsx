import { STAGE_META, INTERVIEW_OUTCOME_LABELS } from "@/lib/pipeline";

// Status and category pills.
//
// Server component — these are pure presentation with no interactivity, so
// there is no reason to ship them to the client.
//
// The dot carries the colour signal, letting the surface stay near-neutral.
// Saturated fills at this size read as loud and are the main thing that makes
// a status column look like a template rather than a considered UI.

const TONES = {
  positive: {
    surface: "bg-green-50 text-green-900 border-green-200/70",
    dot: "bg-green-600",
  },
  negative: {
    surface: "bg-error-container/50 text-on-error-container border-error-container",
    dot: "bg-error",
  },
  pending: {
    surface:
      "bg-primary-container/12 text-on-primary-fixed-variant border-primary-container/25",
    dot: "bg-primary",
  },
  neutral: {
    surface:
      "bg-surface-container text-on-surface-variant border-outline-variant/50",
    dot: "bg-on-surface-variant/60",
  },
  info: {
    surface:
      "bg-secondary-container/60 text-on-secondary-container border-secondary-container",
    dot: "bg-secondary",
  },
  // In-progress / awaiting action. Distinct from `pending` (which is the brand
  // tone used for registration review) because an open shift is a live state,
  // not a queue position.
  warning: {
    surface: "bg-amber-50 text-amber-900 border-amber-200/70",
    dot: "bg-amber-500",
  },
};

export default function Pill({ tone = "neutral", dot = true, children }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-label-sm font-medium whitespace-nowrap ${t.surface}`}
    >
      {dot ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} />
      ) : null}
      {children}
    </span>
  );
}

// Maps a Driver.status to a pill. Labels and tones come from the pipeline
// definition so a stage is named identically everywhere it appears.
export function StatusPill({ status }) {
  const meta = STAGE_META[status];
  if (!meta) return <Pill tone="neutral">{status ?? "Unknown"}</Pill>;
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}

// Outcome of a completed interview. Distinct from StatusPill: a candidate can
// sit at INTERVIEWED having failed, and both facts need to be visible at once.
export function InterviewOutcomePill({ outcome }) {
  const label = INTERVIEW_OUTCOME_LABELS[outcome] ?? outcome;
  const tone =
    outcome === "PASSED"
      ? "positive"
      : outcome === "FAILED" || outcome === "NO_SHOW"
        ? "negative"
        : outcome === "CANCELLED"
          ? "neutral"
          : "warning";
  return <Pill tone={tone}>{label}</Pill>;
}
