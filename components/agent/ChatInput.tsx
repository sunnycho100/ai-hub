"use client";

import React, { useRef, useEffect } from "react";
import { RunMode, RunStatus } from "@/lib/types";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  topic: string;
  mode: RunMode;
  status: RunStatus;
  onTopicChange: (topic: string) => void;
  onModeChange: (mode: RunMode) => void;
  onStart: () => void;
  onStop: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  R1_SENDING: "Round 1 — Sending prompts...",
  R1_WAITING: "Round 1 — Awaiting responses...",
  R2_SENDING: "Round 2 — Sending prompts...",
  R2_WAITING: "Round 2 — Awaiting responses...",
  R3_SENDING: "Round 3 — Sending prompts...",
  R3_WAITING: "Round 3 — Awaiting responses...",
};

export function ChatInput({
  topic,
  mode,
  status,
  onTopicChange,
  onModeChange,
  onStart,
  onStop,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRunning =
    status !== "IDLE" && status !== "DONE" && status !== "ERROR";

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [topic]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isRunning && topic.trim()) {
      e.preventDefault();
      onStart();
    }
  };

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm">
      {isRunning && STATUS_LABELS[status] && (
        <div className="px-4 pt-2.5 pb-0 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <span className="text-xs text-primary font-medium">
            {STATUS_LABELS[status]}
          </span>
        </div>
      )}

      <div className="px-4 py-3 flex items-end gap-2">
        <div className="flex items-center rounded-lg border border-input p-0.5 bg-background flex-shrink-0 self-end mb-0.5">
          <button
            onClick={() => onModeChange("debate")}
            disabled={isRunning}
            className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
              mode === "debate"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            } disabled:opacity-50`}
          >
            Debate
          </button>
          <button
            onClick={() => onModeChange("collaboration")}
            disabled={isRunning}
            className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
              mode === "collaboration"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            } disabled:opacity-50`}
          >
            Collab
          </button>
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a topic or question for the AI agents to discuss..."
            disabled={isRunning}
            rows={1}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent disabled:opacity-50 resize-none transition-shadow"
            style={{ minHeight: "40px" }}
          />
        </div>

        {isRunning ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 h-10 w-10 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors mb-0.5"
            title="Stop run"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={!topic.trim()}
            className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
            title="Start run"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
