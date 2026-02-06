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
  R1_SENDING: "Round 1 – Sending prompts…",
  R1_WAITING: "Round 1 – Waiting for responses…",
  R2_SENDING: "Round 2 – Sending prompts…",
  R2_WAITING: "Round 2 – Waiting for responses…",
  R3_SENDING: "Round 3 – Sending prompts…",
  R3_WAITING: "Round 3 – Waiting for responses…",
  DONE: "Complete",
  ERROR: "Error",
};

const STATUS_COLORS: Record<RunStatus, string> = {
  IDLE: "bg-gray-100 text-gray-700",
  R1_SENDING: "bg-yellow-100 text-yellow-800",
  R1_WAITING: "bg-yellow-100 text-yellow-800",
  R2_SENDING: "bg-blue-100 text-blue-800",
  R2_WAITING: "bg-blue-100 text-blue-800",
  R3_SENDING: "bg-purple-100 text-purple-800",
  R3_WAITING: "bg-purple-100 text-purple-800",
  DONE: "bg-green-100 text-green-800",
  ERROR: "bg-red-100 text-red-800",
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
          className="block text-sm font-medium text-gray-700 mb-1.5"
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
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
      </div>

      {/* Mode & Controls Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Mode Toggle */}
        <div className="flex items-center rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => onModeChange("debate")}
            disabled={isRunning}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === "debate"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            } disabled:opacity-50`}
          >
            Debate
          </button>
          <button
            onClick={() => onModeChange("collaboration")}
            disabled={isRunning}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === "collaboration"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
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
                  ? "bg-gray-900 text-white"
                  : status === "DONE" || (round && r < round)
                  ? "bg-gray-200 text-gray-600"
                  : "bg-gray-100 text-gray-400"
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
