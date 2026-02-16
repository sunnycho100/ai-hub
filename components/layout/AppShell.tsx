"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useTheme } from "@/lib/theme";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const { theme, toggleTheme } = useTheme();

  if (isLandingPage) {
    return (
      <div className="min-h-screen mesh-gradient relative">
        {/* Floating theme toggle for landing page */}
        <button
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full glass-thick glass-float flex items-center justify-center hover:brightness-110 transition-all active:scale-[0.95]"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-foreground" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-foreground" />
          )}
        </button>
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden mesh-gradient">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
