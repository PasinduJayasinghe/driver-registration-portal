// Shared motion vocabulary.
//
// Everything animated in the app pulls its physics from here so timings stay
// consistent between components. Two families:
//
//   spring*  — physical, for anything the user directly caused (press, open,
//              drag). Springs settle naturally and survive interruption, which
//              is what makes iOS motion feel continuous rather than scripted.
//   ease*    — for ambient motion the user didn't trigger (page enter, stagger).
//
// Durations here are deliberately short. The perception of "premium" comes from
// motion that resolves quickly with a soft landing, not from long animations.

// Primary interaction spring. Critically damped — fast, no visible bounce.
export const springSnappy = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

// For surfaces appearing from nothing. Slight overshoot reads as physical.
export const springSoft = {
  type: "spring",
  stiffness: 280,
  damping: 26,
  mass: 0.9,
};

// Heavier: sheets and drawers that represent a large moving surface.
export const springSheet = {
  type: "spring",
  stiffness: 320,
  damping: 38,
  mass: 1.1,
};

// iOS decelerate curve. The workhorse for fades and non-physical movement.
export const easeIos = [0.32, 0.72, 0, 1];

// Exits should be quicker than entrances — the user has already moved on.
export const easeExit = [0.4, 0, 1, 1];

export const transitionBase = { duration: 0.22, ease: easeIos };
export const transitionFast = { duration: 0.14, ease: easeIos };
export const transitionExit = { duration: 0.12, ease: easeExit };

// Page/section entrance. Small travel: 8px is enough to read as motion without
// the content appearing to fly in.
export const fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionBase },
};

// Parent for staggered lists. delayChildren gives the container a beat to
// settle before its children start, which avoids everything moving at once.
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.028, delayChildren: 0.04 },
  },
};

// Row/item within a staggered list.
export const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
};

// Modal surface. Starts slightly small and low, springs to rest.
export const modalSurface = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: transitionExit },
};

export const scrim = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionBase },
  exit: { opacity: 0, transition: transitionExit },
};

// Standard press feedback. Applied via whileTap on interactive elements.
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.975, y: 0 },
  transition: springSnappy,
};
