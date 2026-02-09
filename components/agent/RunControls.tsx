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
  IDLE: "bg-white/10 text-indigo-200",
  R1_SENDING: "bg-yellow-500/20 text-yellow-400",
  R1_WAITING: "bg-yellow-500/20 text-yellow-400",
  R2_SENDING: "bg-blue-500/20 text-blue-400",
  R2_WAITING: "bg-blue-500/20 text-blue-400",
  R3_SENDING: "bg-purple-500/20 text-purple-400",
  R3_WAITING: "bg-purple-500/20 text-purple-400",
  DONE: "bg-green-500/20 text-green-400",
  ERROR: "bg-red-500/20 text-red-400",
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
          className="block text-xs font-semibold text-indigo-300 mb-1.5 tracking-wide"
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
          className="w-full rounded-xl border border-white/15 bg-white/6 px-3 py-2 text-sm text-white placeholder:text-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
      </div>

      {/* Mode & Controls Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Mode Toggle */}
        <div className="flex items-center rounded-xl border border-white/15 p-0.5">
          <button
            onClick={() => onModeChange("debate")}
            disabled={isRunning}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === "debate"
                ? "bg-cyan-400 text-[#0B1020]"
                : "text-indigo-200 hover:text-white"
            } disabled:opacity-50`}
          >
            Debate
          </button>
          <button
            onClick={() => onModeChange("collaboration")}
            disabled={isRunning}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === "collaboration"
                ? "bg-cyan-400 text-[#0B1020]"
                : "text-indigo-200 hover:text-white"
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
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                round === r
                  ? "bg-cyan-400 text-[#0B1020]"
                  : status === "DONE" || (round && r < round)
                  ? "bg-white/15 text-indigo-200"
                  : "bg-white/5 text-white/30"
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
