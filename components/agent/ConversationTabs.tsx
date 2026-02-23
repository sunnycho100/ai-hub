"use client";

import React from "react";
import { Run, RunSource } from "@/lib/types";
import { Plus, X } from "lucide-react";

interface ConversationTabsProps {
  runs: Run[];
  currentRunId: string | null;
  onSelectRun: (run: Run) => void;
  onNewRun: () => void;
  onDeleteRun: (runId: string, source: RunSource) => void;
  source: RunSource;
}

export function ConversationTabs({
  runs,
  currentRunId,
  onSelectRun,
  onNewRun,
  onDeleteRun,
  source,
}: ConversationTabsProps) {
  const reversedRuns = [...runs].reverse();

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none border-b border-border px-1">
      {reversedRuns.map((run) => {
        const isActive = run.id === currentRunId;
        return (
          <button
            key={run.id}
            onClick={() => onSelectRun(run)}
            className={`group relative flex items-center gap-1.5 px-3 py-2 text-xs transition-colors whitespace-nowrap max-w-[200px] flex-shrink-0 border-b-2 ${
              isActive
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                run.status === "DONE"
                  ? "bg-emerald-400"
                  : run.status === "ERROR"
                    ? "bg-destructive"
                    : run.status === "IDLE"
                      ? "bg-muted-foreground/30"
                      : "bg-primary animate-pulse"
              }`}
            />
            <span className="truncate">
              {run.topic || "New Chat"}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRun(run.id, source);
              }}
              className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-accent transition-opacity flex-shrink-0 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        );
      })}

      <button
        onClick={onNewRun}
        className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 border-b-2 border-transparent"
        title="New conversation"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
