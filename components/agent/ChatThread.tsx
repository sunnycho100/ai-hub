"use client";

import React, { useRef, useEffect, useMemo } from "react";
import {
  TranscriptMessage,
  Provider,
  PROVIDER_LABELS,
  Round,
} from "@/lib/types";
import { ProviderIcon } from "./ProviderIcon";

interface ChatThreadProps {
  messages: TranscriptMessage[];
  sendingProviders: Provider[];
  activeProviders: Provider[];
  status: string;
}

const PROVIDER_ACCENT: Record<Provider, string> = {
  chatgpt: "text-emerald-400",
  gemini: "text-violet-400",
  claude: "text-orange-400",
};

const PROVIDER_AVATAR_BG: Record<Provider, string> = {
  chatgpt: "bg-emerald-400/10 border-emerald-400/20",
  gemini: "bg-violet-400/10 border-violet-400/20",
  claude: "bg-orange-400/10 border-orange-400/20",
};

const PROVIDER_BUBBLE: Record<Provider, string> = {
  chatgpt: "border-emerald-400/10 hover:border-emerald-400/20",
  gemini: "border-violet-400/10 hover:border-violet-400/20",
  claude: "border-orange-400/10 hover:border-orange-400/20",
};

export function ChatThread({
  messages,
  sendingProviders,
  activeProviders,
  status,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages]
  );

  const roundBreaks = useMemo(() => {
    const breaks = new Set<number>();
    let prevRound: Round | null = null;
    sorted.forEach((msg, idx) => {
      if (prevRound !== null && msg.round !== prevRound) {
        breaks.add(idx);
      }
      prevRound = msg.round;
    });
    return breaks;
  }, [sorted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendingProviders.length]);

  const isIdle = status === "IDLE";

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto min-h-0"
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-1">
        {sorted.length === 0 && sendingProviders.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {isIdle
                  ? "Enter a topic below to start a conversation."
                  : "Waiting for responses..."}
              </p>
              {isIdle && activeProviders.length > 0 && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  {activeProviders.map((p) => (
                    <div
                      key={p}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${PROVIDER_AVATAR_BG[p]} ${PROVIDER_ACCENT[p]}`}
                    >
                      <ProviderIcon provider={p} className="h-3 w-3" />
                      {PROVIDER_LABELS[p]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {sorted.map((msg, idx) => (
              <React.Fragment key={msg.id}>
                {roundBreaks.has(idx) && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider px-3">
                      Round {msg.round}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div
                  className="flex gap-3 py-2 group"
                  style={{
                    animationDelay: `${idx * 30}ms`,
                  }}
                >
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center mt-0.5 ${PROVIDER_AVATAR_BG[msg.provider]}`}
                  >
                    <ProviderIcon
                      provider={msg.provider}
                      className={`h-4 w-4 ${PROVIDER_ACCENT[msg.provider]}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span
                        className={`text-sm font-semibold ${PROVIDER_ACCENT[msg.provider]}`}
                      >
                        {PROVIDER_LABELS[msg.provider]}
                      </span>
                      <span className="text-[11px] text-muted-foreground/40 font-medium">
                        R{msg.round}
                      </span>
                      <span className="text-[11px] text-muted-foreground/30">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl rounded-tl-md border bg-card/60 px-4 py-3 transition-colors duration-200 ${PROVIDER_BUBBLE[msg.provider]}`}
                    >
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}

            {sendingProviders.map((provider) => (
              <div
                key={`typing-${provider}`}
                className="flex gap-3 py-2 animate-in fade-in duration-300"
              >
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center mt-0.5 ${PROVIDER_AVATAR_BG[provider]}`}
                >
                  <ProviderIcon
                    provider={provider}
                    className={`h-4 w-4 ${PROVIDER_ACCENT[provider]}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span
                      className={`text-sm font-semibold ${PROVIDER_ACCENT[provider]}`}
                    >
                      {PROVIDER_LABELS[provider]}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl rounded-tl-md border bg-card/60 px-4 py-3 ${PROVIDER_BUBBLE[provider]}`}
                  >
                    <div className="flex items-center gap-1.5 h-5">
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
