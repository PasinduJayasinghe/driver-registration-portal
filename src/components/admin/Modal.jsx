"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { modalSurface, scrim, springSnappy } from "@/lib/motion";

export default function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      // Focus trap: Tab must cycle within the dialog. Without this, tabbing
      // walks out into the page behind the scrim, which is both disorienting
      // and an accessibility failure for a modal.
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // Remember where focus was so it can be restored on close — otherwise the
    // user is dumped at the top of the document after dismissing the dialog.
    previouslyFocused.current = document.activeElement;
    const root = dialogRef.current;
    const target = root?.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea, select, button'
    );
    // Defer so the element exists after the entrance animation mounts it.
    const id = requestAnimationFrame(() => target?.focus?.());
    return () => {
      cancelAnimationFrame(id);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      // Compensate for the vanishing scrollbar so the page behind doesn't
      // shift sideways as the dialog opens.
      const gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[#191c1d]/45 backdrop-blur-[3px]"
            variants={scrim}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.div
            ref={dialogRef}
            className={`relative w-full ${maxWidth} bg-surface-container-lowest rounded-2xl border border-outline-variant/40 flex flex-col max-h-[90vh] overflow-hidden`}
            style={{ boxShadow: "var(--shadow-e4)" }}
            variants={reduce ? undefined : modalSurface}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
              <h2 className="text-headline-md text-on-surface">{title}</h2>
              <motion.button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                aria-label="Close dialog"
                whileTap={reduce ? undefined : { scale: 0.9 }}
                transition={springSnappy}
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </motion.button>
            </div>
            <div className="overflow-y-auto px-6 py-6">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
