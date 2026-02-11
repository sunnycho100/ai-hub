"use client";

import React from "react";
import { Provider, PROVIDER_LABELS, TranscriptMessage, Round } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderIcon } from "./ProviderIcon";

interface AgentPanelProps {
  provider: Provider;
  messages: TranscriptMessage[];
  isConnected: boolean;
  isSending: boolean;
  error?: { code: string; message: string };
  currentRound: Round | null;
}

const PROVIDER_ACCENT: Record<Provider, string> = {
  chatgpt: "text-green-500",
  gemini: "text-blue-500",
  claude: "text-orange-500",
};

const PROVIDER_DOT: Record<Provider, string> = {
  chatgpt: "bg-green-500",
  gemini: "bg-blue-500",
  claude: "bg-orange-500",
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
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={provider} className={`h-4 w-4 ${PROVIDER_ACCENT[provider]}`} />
            <CardTitle className="text-base font-semibold text-foreground">{PROVIDER_LABELS[provider]}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isSending && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Sending...
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? PROVIDER_DOT[provider] : "bg-muted-foreground/30"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {error ? (
          <div className="text-sm text-center py-6">
            <div className="text-foreground/70 font-mono text-xs mb-1">{error.code}</div>
            <div className="text-foreground/70 text-xs">{error.message}</div>
          </div>
        ) : providerMessages.length === 0 ? (
          <div className="text-sm text-muted-foreground/60 italic text-center py-8">
            {isSending
              ? "Waiting for response..."
              : "No messages yet"}
          </div>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {providerMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-md bg-muted/50 ${PROVIDER_ACCENT[provider]}`}
                  >
                    Round {msg.round}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
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
