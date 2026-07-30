"use client";

import { motion, useReducedMotion } from "motion/react";
import { springSnappy } from "@/lib/motion";

// Single source of truth for button appearance. Variants map to intent, not to
// colour, so call sites read as "this is destructive" rather than "this is red".

const VARIANTS = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container shadow-[var(--shadow-e1)] hover:shadow-[var(--shadow-e2)]",
  secondary:
    "bg-surface-container-lowest text-on-surface border border-outline-variant/60 hover:bg-surface-container hover:border-outline-variant",
  ghost:
    "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
  danger:
    "bg-error text-on-error hover:bg-on-error-container shadow-[var(--shadow-e1)] hover:shadow-[var(--shadow-e2)]",
  success:
    "bg-green-600 text-white hover:bg-green-700 shadow-[var(--shadow-e1)] hover:shadow-[var(--shadow-e2)]",
};

const SIZES = {
  sm: "px-3 py-1.5 text-label-sm gap-1.5",
  md: "px-4 py-2 text-label-md gap-2",
  lg: "px-6 py-3 text-label-md gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  children,
  className = "",
  type = "button",
  ...rest
}) {
  const reduce = useReducedMotion();
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      whileTap={reduce || isDisabled ? undefined : { scale: 0.97 }}
      transition={springSnappy}
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-[background-color,box-shadow,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-ios)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          className="material-symbols-outlined text-[16px] animate-spin"
          aria-hidden="true"
        >
          progress_activity
        </span>
      ) : icon ? (
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </motion.button>
  );
}
