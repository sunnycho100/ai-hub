"use client";

import React from "react";
import { RunMode, RunStatus, Round } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Play, Square, SkipForward } from "lucide-react";

interface RunControlsProps {
  topic: string;
  mode: RunMode;
  status: RunStatus;
  onTopicChange: (topic: string) => void;
  onModeChange: (mode: RunMode) => void;
  onStart: () => void;
  onStop: () => void;
  onMockRound: () => void;
  showMock?: boolean;
}

const STATUS_LABELS: Record<RunStatus, string> = {
  IDLE: "Ready",
  R1_SENDING: "Round 1 - Sending prompts...",
  R1_WAITING: "Round 1 - Waiting for responses...",
  R2_SENDING: "Round 2 - Sending prompts...",
  R2_WAITING: "Round 2 - Waiting for responses...",
  R3_SENDING: "Round 3 - Sending prompts...",
  R3_WAITING: "Round 3 - Waiting for responses...",
  DONE: "Complete",
  ERROR: "Error",
};

const STATUS_COLORS: Record<RunStatus, string> = {
  IDLE: "bg-muted text-muted-foreground",
  R1_SENDING: "bg-primary/10 text-primary animate-pulse",
  R1_WAITING: "bg-primary/10 text-primary",
  R2_SENDING: "bg-primary/10 text-primary animate-pulse",
  R2_WAITING: "bg-primary/10 text-primary",
  R3_SENDING: "bg-primary/10 text-primary animate-pulse",
  R3_WAITING: "bg-primary/10 text-primary",
  DONE: "bg-emerald-400/10 text-emerald-400",
  ERROR: "bg-destructive/10 text-destructive border border-destructive/20",
};

function getCurrentRound(status: RunStatus): Round | null {
  if (status.startsWith("R1")) return 1;
  if (status.startsWith("R2")) return 2;
  if (status.startsWith("R3")) return 3;
  return null;
}

export function RunControls({
  topic,
  mode,
  status,
  onTopicChange,
  onModeChange,
  onStart,
  onStop,
  onMockRound,
  showMock = true,
}: RunControlsProps) {
  const isRunning = status !== "IDLE" && status !== "DONE" && status !== "ERROR";
  const round = getCurrentRound(status);

  return (
    <div className="space-y-4">
      {/* Topic Input */}
      <div>
        <label
          htmlFor="topic"
          className="block text-xs font-semibold text-foreground mb-1.5 tracking-wide"
        >
          Topic / Question
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="Enter a topic or question for the AI agents to discuss..."
          disabled={isRunning}
          rows={2}
          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-shadow duration-200"
        />
      </div>

      {/* Mode & Controls Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Mode Toggle */}
        <div className="flex items-center rounded-xl border border-input p-0.5 bg-card">
          <button
            onClick={() => onModeChange("debate")}
            disabled={isRunning}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              mode === "debate"
                ? "bg-primary/20 text-primary shadow-sm glass-float"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            } disabled:opacity-50`}
          >
            Debate
          </button>
          <button
            onClick={() => onModeChange("collaboration")}
            disabled={isRunning}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              mode === "collaboration"
                ? "bg-primary/20 text-primary shadow-sm glass-float"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            } disabled:opacity-50`}
          >
            Collaborate
          </button>
        </div>

        {/* Round Indicator */}
        <div className="flex items-center gap-1.5">
          {([1, 2, 3] as Round[]).map((r) => (
            <div
              key={r}
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 border ${
                round === r
                  ? "bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_rgba(129,140,248,0.2)] scale-110"
                  : status === "DONE" || (round && r < round)
                  ? "bg-muted text-muted-foreground border-input"
                  : "bg-transparent text-muted-foreground/30 border-border"
              }`}
            >
              {r}
            </div>
          ))}
        </div>

        {/* Status Badge */}
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {showMock && !isRunning && status !== "DONE" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onMockRound}
              disabled={!topic.trim()}
              className="text-xs"
            >
              <SkipForward className="h-3.5 w-3.5 mr-1" />
              Mock Run
            </Button>
          )}

          {!isRunning ? (
            <Button
              size="sm"
              onClick={onStart}
              disabled={!topic.trim()}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Start Run
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={onStop}>
              <Square className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
