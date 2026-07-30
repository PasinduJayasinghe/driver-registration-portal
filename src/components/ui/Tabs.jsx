"use client";

import { motion, useReducedMotion } from "motion/react";
import { springSnappy } from "@/lib/motion";

// Tab bar with a sliding underline.
//
// The indicator is a single shared-layout element rather than a per-tab border,
// so changing tabs slides it across instead of blinking one border off and
// another on. Tabs are plain links (server-driven filtering via the URL), so
// the slide plays on the newly rendered page — the effect reads as continuous
// because the indicator animates from its mount position.
export default function Tabs({ tabs, activeKey, layoutId = "tab-indicator" }) {
  const reduce = useReducedMotion();

  return (
    <div className="px-2 pt-2 border-b border-outline-variant/30 flex flex-wrap gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <a
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative px-4 py-3 text-label-md font-semibold flex items-center gap-2 whitespace-nowrap transition-colors duration-[var(--duration-fast)] ease-[var(--ease-ios)] ${
              isActive
                ? "text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
            {tab.count != null ? (
              <span
                className={`text-label-sm px-2 py-0.5 rounded-full tabular transition-colors duration-[var(--duration-fast)] ease-[var(--ease-ios)] ${
                  isActive
                    ? "bg-primary-container/18 text-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
            {isActive ? (
              <motion.span
                layoutId={reduce ? undefined : layoutId}
                className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary"
                transition={springSnappy}
              />
            ) : null}
          </a>
        );
      })}
    </div>
  );
}
