"use client";

import {
  Brain,
  Archive,
  Link2,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MemoryStatsProps {
  totalActive: number;
  totalSuperseded: number;
  topicEdgeCount: number;
  categoriesUsed: number;
  isLoading?: boolean;
}

interface StatItem {
  label: string;
  icon: LucideIcon;
  accent: string;
  getValue: (s: MemoryStatsProps) => number;
}

const statItems: StatItem[] = [
  {
    label: "Active Memories",
    icon: Brain,
    accent: "text-primary",
    getValue: (s) => s.totalActive,
  },
  {
    label: "Superseded",
    icon: Archive,
    accent: "text-amber-400",
    getValue: (s) => s.totalSuperseded,
  },
  {
    label: "Topic Links",
    icon: Link2,
    accent: "text-emerald-400",
    getValue: (s) => s.topicEdgeCount,
  },
  {
    label: "Categories",
    icon: Layers,
    accent: "text-violet-400",
    getValue: (s) => s.categoriesUsed,
  },
];

export function MemoryStatCards(props: MemoryStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="glass-interactive">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted border border-input flex items-center justify-center shrink-0">
                <Icon className={`h-4 w-4 ${item.accent}`} />
              </div>
              <div className="flex-1">
                {props.isLoading ? (
                  <>
                    <div className="h-6 w-12 shimmer-line rounded mb-1" />
                    <div className="h-3 w-20 shimmer-line rounded" style={{ animationDelay: "0.15s" }} />
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-foreground">
                      {item.getValue(props)}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
