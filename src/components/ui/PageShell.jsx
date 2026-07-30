"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { easeIos } from "@/lib/motion";

// Wraps route content so each navigation plays a short enter transition.
//
// Keyed on pathname: React tears down and remounts the subtree on route change,
// which retriggers the animation. Deliberately enter-only — an exit animation
// would require holding the old page while the new one streams in, which fights
// the App Router's streaming and shows stale content longer than it helps.
export default function PageShell({ children, className }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: easeIos }}
    >
      {children}
    </motion.div>
  );
}
