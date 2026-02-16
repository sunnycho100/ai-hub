"use client";

import React from "react";
import { TranscriptMessage, PROVIDER_LABELS, Provider } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

interface TranscriptTimelineProps {
  messages: TranscriptMessage[];
}

const PROVIDER_BADGE: Record<Provider, string> = {
  chatgpt: "bg-emerald-50 text-emerald-700",
  gemini: "bg-violet-50 text-violet-700",
  grok: "bg-sky-50 text-sky-700",
};

export function TranscriptTimeline({ messages }: TranscriptTimelineProps) {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Card className="bg-card/90">
      <CardHeader className="pb-3 border-b border-border/70">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold text-foreground">Transcript Timeline</CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground/60 italic text-center py-6">
            Start a run to see the transcript here.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {sorted.map((msg, idx) => (
              <div
                key={msg.id}
                className="border-l-2 border-border pl-4 py-1 message-enter"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      PROVIDER_BADGE[msg.provider]
                    }`}
                  >
                    {PROVIDER_LABELS[msg.provider]}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    R{msg.round}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
