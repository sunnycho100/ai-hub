"use client";

import { motion } from "framer-motion";
import type { MemoryCategory } from "@/lib/memory/types";
import { MEMORY_CATEGORY_ACCENTS } from "@/lib/memory/types";
import {
  Pen,
  ThumbsUp,
  User,
  BookOpen,
  Clock,
  type LucideIcon,
} from "lucide-react";

interface MemoryCategoryTabsProps {
  activeTab: MemoryCategory;
  onTabChange: (tab: MemoryCategory) => void;
  counts?: Record<MemoryCategory, number>;
}

interface CategoryTab {
  key: MemoryCategory;
  label: string;
  icon: LucideIcon;
}

const tabs: CategoryTab[] = [
  { key: "user_profile", label: "Profile", icon: User },
  { key: "writing_style", label: "Writing Style", icon: Pen },
  { key: "output_satisfaction", label: "Satisfaction", icon: ThumbsUp },
  { key: "topic_knowledge", label: "Topics", icon: BookOpen },
  { key: "session_history", label: "Sessions", icon: Clock },
];

export function MemoryCategoryTabs({
  activeTab,
  onTabChange,
  counts,
}: MemoryCategoryTabsProps) {
  return (
    <div className="mb-6 flex items-center gap-1 rounded-xl border border-input bg-card p-1.5 w-fit flex-wrap">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const count = counts?.[tab.key] ?? 0;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            className="relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 flex items-center gap-1.5"
            onClick={() => onTabChange(tab.key)}
          >
            {isActive && (
              <motion.div
                layoutId="memory-cat-glass-pill"
                className="absolute inset-0 rounded-lg bg-primary/20 border border-primary/20 shadow-[0_0_8px_rgba(129,140,248,0.12)]"
                transition={{
                  type: "spring",
                  mass: 0.5,
                  damping: 26,
                  stiffness: 200,
                }}
              />
            )}
            <Icon
              className={`relative h-3.5 w-3.5 ${
                isActive ? MEMORY_CATEGORY_ACCENTS[tab.key] : "text-muted-foreground"
              }`}
            />
            <span
              className={`relative ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </span>
            {count > 0 && (
              <span
                className={`relative text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
