"use client";

import React from "react";
import { TranscriptMessage, PROVIDER_LABELS, Provider } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

interface TranscriptTimelineProps {
  messages: TranscriptMessage[];
}

const PROVIDER_BADGE: Record<Provider, string> = {
  chatgpt: "bg-green-100 text-green-800",
  gemini: "bg-blue-100 text-blue-800",
  grok: "bg-orange-100 text-orange-800",
};

export function TranscriptTimeline({ messages }: TranscriptTimelineProps) {
  // Sort by timestamp ascending
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-gray-500" />
          <CardTitle className="text-base">Transcript Timeline</CardTitle>
          <span className="text-xs text-gray-400 ml-auto">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-sm text-gray-400 italic text-center py-6">
            Start a run to see the transcript here.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sorted.map((msg) => (
              <div
                key={msg.id}
                className="border-l-2 border-gray-200 pl-4 py-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      PROVIDER_BADGE[msg.provider]
                    }`}
                  >
                    {PROVIDER_LABELS[msg.provider]}
                  </span>
                  <span className="text-xs text-gray-400">
                    R{msg.round}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
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
