"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LiquidTabWrapper } from "./LiquidTabWrapper";
import { useTheme } from "@/lib/theme";

// Distinct landing-page entrance: a gentle zoom-out reveal
// that feels like surfacing from a tool page back to the hub.
const landingReveal = {
  initial: { opacity: 0, scale: 1.06, y: -20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      mass: 0.9,
      damping: 28,
      stiffness: 90,
    },
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const { theme, toggleTheme } = useTheme();

  if (isLandingPage) {
    return (
      <motion.div
        key="landing"
        initial={landingReveal.initial}
        animate={landingReveal.animate}
        className="h-screen overflow-hidden mesh-gradient relative flex flex-col"
      >
        {/* Floating theme toggle for landing page */}
        <button
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full bg-muted/60 backdrop-blur-xl flex items-center justify-center hover:brightness-110 transition-all active:scale-[0.95]"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-foreground" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-foreground" />
          )}
        </button>
        {children}
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden mesh-gradient">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto">
          <LiquidTabWrapper>{children}</LiquidTabWrapper>
        </main>
      </div>
    </div>
  );
}
