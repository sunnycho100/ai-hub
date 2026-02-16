"use client";

import { motion } from "framer-motion";
import {
  liquidStaggerContainer,
  liquidStaggerChild,
} from "@/lib/liquidTransitions";

interface LiquidStaggerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * LiquidStagger
 *
 * Wrap groups of cards, panels, or sections with this component
 * so each child element enters with a staggered micro-parallax
 * effect — sliding in slightly slower than the main container
 * to create a sense of depth.
 *
 * Usage:
 *   <LiquidStagger>
 *     <LiquidStaggerItem><Card ... /></LiquidStaggerItem>
 *     <LiquidStaggerItem><Card ... /></LiquidStaggerItem>
 *   </LiquidStagger>
 */
export function LiquidStagger({ children, className }: LiquidStaggerProps) {
  // Stagger enter animation is self-contained and independent
  // from route-level exit animation to prevent hidden-state desync.
  return (
    <motion.div
      variants={liquidStaggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface LiquidStaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function LiquidStaggerItem({
  children,
  className,
}: LiquidStaggerItemProps) {
  return (
    <motion.div variants={liquidStaggerChild} className={className}>
      {children}
    </motion.div>
  );
}
