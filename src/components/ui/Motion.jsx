"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  springSnappy,
} from "@/lib/motion";

// Thin wrappers over motion primitives. These exist so pages (which are server
// components) can opt into motion by wrapping content, without each page having
// to become a client component or restate variants.
//
// Every wrapper checks useReducedMotion and degrades to a plain render. The CSS
// media query in globals.css covers CSS transitions; JS-driven animation has to
// be handled here as well.

export function PageTransition({ children, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
    >
      {children}
    </motion.div>
  );
}

// Staggered container. Children rendered via <Stagger.Item> peel in one after
// another rather than appearing as a single block.
export function Stagger({ children, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

Stagger.Item = StaggerItem;

// A card that lifts on hover. The shadow change is CSS; only the transform is
// animated here, which keeps it on the compositor.
export function LiftCard({ children, className, as = "div" }) {
  const reduce = useReducedMotion();
  const Component = motion[as] ?? motion.div;

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Component
      className={className}
      whileHover={{ y: -2 }}
      transition={springSnappy}
    >
      {children}
    </Component>
  );
}

// Press-responsive wrapper for buttons and links. Scale-down on tap is the
// single most effective cue that a control is real.
export function Pressable({ children, className, ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      whileTap={{ scale: 0.975 }}
      transition={springSnappy}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
