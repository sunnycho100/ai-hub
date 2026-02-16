"use client";

import { motion } from "framer-motion";

interface ModeTabsProps {
  activeTab: "extension" | "api";
  onTabChange: (tab: "extension" | "api") => void;
}

const tabs = [
  { key: "extension" as const, label: "Agent Communication" },
  { key: "api" as const, label: "Agent Communication (API)" },
];

export function ModeTabs({ activeTab, onTabChange }: ModeTabsProps) {
  return (
    <div className="mb-6 flex items-center gap-1 rounded-xl border border-input bg-card p-1.5 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className="relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150"
          onClick={() => onTabChange(tab.key)}
        >
          {activeTab === tab.key && (
            <motion.div
              layoutId="mode-tab-glass-pill"
              className="absolute inset-0 rounded-lg bg-primary/20 border border-primary/20 shadow-[0_0_8px_rgba(129,140,248,0.12)]"
              transition={{ type: "spring", mass: 0.5, damping: 26, stiffness: 200 }}
            />
          )}
          <span className={`relative ${
            activeTab === tab.key
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
