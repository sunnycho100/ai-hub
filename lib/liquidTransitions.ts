/**
 * Liquid Glass Transition – Animation Variants & Config
 *
 * Viscous spring physics that make glass panels feel like
 * they have physical mass sliding through dense liquid.
 */

import type { Variants, Transition } from "framer-motion";

// ─── Sluggish Spring Physics ────────────────────────────
export const liquidSpring: Transition = {
  type: "spring",
  mass: 1.2,
  damping: 30,
  stiffness: 80,
};

// Faster spring for child stagger (still heavy, but snappier)
export const childSpring: Transition = {
  type: "spring",
  mass: 0.8,
  damping: 30,
  stiffness: 105,
};

// ─── Quick Tween for Exit ───────────────────────────────
// Springs have no guaranteed completion time which can leave
// AnimatePresence mode="wait" stuck waiting → blank page.
// Exit uses a fast tween so duration is deterministic.
const exitTween: Transition = {
  type: "tween",
  duration: 0.18,
  ease: [0.4, 0, 1, 1], // ease-in – quick vanish
};

const childExitTween: Transition = {
  type: "tween",
  duration: 0.14,
  ease: [0.4, 0, 1, 1],
};

// ─── Page Transition Variants ───────────────────────────
// Opacity + scale + y only — no CSS filter.
// blur(0px) !== no-filter: it keeps a GPU compositing layer alive
// that causes invisible content on alternating navigations.
export const liquidPageVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: liquidSpring,
  },
};

// ─── Stagger Container ─────────────────────────────────
// Wraps child cards/sections to stagger their entrance
export const liquidStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.015,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

// ─── Stagger Child Item ────────────────────────────────
// Each card/section slides up with micro-parallax offset.
// No CSS filter — avoids compositing layer issues.
export const liquidStaggerChild: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.97,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: childSpring,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: childExitTween,
  },
};

// ─── Chromatic Shimmer ─────────────────────────────────
// Subtle chromatic aberration text-shadow during transition peak
export const chromaticShimmer: Variants = {
  initial: {
    textShadow: "0 0 0 transparent, 0 0 0 transparent",
  },
  animate: {
    textShadow: "0 0 0 transparent, 0 0 0 transparent",
    transition: { delay: 0.3, duration: 0.4 },
  },
  exit: {
    textShadow:
      "-0.5px 0 1px rgba(99,102,241,0.3), 0.5px 0 1px rgba(56,189,248,0.3)",
    transition: { duration: 0.15 },
  },
};
