"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { liquidPageVariants, liquidSpring } from "@/lib/liquidTransitions";

interface LiquidTabWrapperProps {
  children: React.ReactNode;
}

/**
 * LiquidTabWrapper
 *
 * Mount-only animation wrapper — no exit animation.
 * Old page unmounts instantly on navigation; new page
 * scales up cleanly from nothing.
 */
export function LiquidTabWrapper({ children }: LiquidTabWrapperProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={liquidSpring}
      className="liquid-page-transition"
    >
      {children}
    </motion.div>
  );
}
