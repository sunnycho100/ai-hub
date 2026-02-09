"use client";

import React from "react";
import { Provider, PROVIDER_LABELS, TranscriptMessage, Round } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface AgentPanelProps {
  provider: Provider;
  messages: TranscriptMessage[];
  isConnected: boolean;
  isSending: boolean;
  error?: { code: string; message: string };
  currentRound: Round | null;
}

const PROVIDER_ACCENT: Record<Provider, string> = {
  chatgpt: "text-green-400",
  gemini: "text-blue-400",
  grok: "text-orange-400",
};

const PROVIDER_DOT: Record<Provider, string> = {
  chatgpt: "bg-green-400",
  gemini: "bg-blue-400",
  grok: "bg-orange-400",
};

export function AgentPanel({
  provider,
  messages,
  isConnected,
  isSending,
  error,
  currentRound,
}: AgentPanelProps) {
  const providerMessages = messages.filter(
    (m) => m.provider === provider && m.role === "assistant"
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className={`h-4 w-4 ${PROVIDER_ACCENT[provider]}`} />
            <CardTitle className="text-base">{PROVIDER_LABELS[provider]}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isSending && (
              <span className="text-xs text-indigo-300 animate-pulse">
                Sending...
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? PROVIDER_DOT[provider] : "bg-white/20"
                }`}
              />
              <span className="text-xs text-indigo-300">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-sm text-center py-6">
            <div className="text-red-400 font-mono text-xs mb-1">{error.code}</div>
            <div className="text-red-300 text-xs">{error.message}</div>
          </div>
        ) : providerMessages.length === 0 ? (
          <div className="text-sm text-indigo-300/60 italic text-center py-8">
            {isSending
              ? "Waiting for response..."
              : "No messages yet"}
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {providerMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold ${PROVIDER_ACCENT[provider]}`}
                  >
                    Round {msg.round}
                  </span>
                  <span className="text-xs text-indigo-300/60">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-indigo-100 leading-relaxed whitespace-pre-wrap">
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
