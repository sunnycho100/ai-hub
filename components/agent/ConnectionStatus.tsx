"use client";

import React from "react";
import { Provider, PROVIDERS, PROVIDER_LABELS } from "@/lib/types";
import { Wifi, WifiOff } from "lucide-react";
import type { WSStatus } from "@/lib/useWebSocket";

interface ConnectionStatusProps {
  wsStatus: WSStatus;
  connectedProviders: Provider[];
}

export function ConnectionStatus({
  wsStatus,
  connectedProviders,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`relative flex h-2.5 w-2.5 ${
            wsStatus === "connected" ? "" : ""
          }`}
        >
          {wsStatus === "connected" && (
            <span className="absolute inset-0 rounded-full bg-green-400 opacity-40 animate-ping" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              wsStatus === "connected"
                ? "bg-green-500 status-dot-connected text-green-500/40"
                : wsStatus === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-muted-foreground/30 status-dot-disconnected"
            }`}
          />
        </span>
        {wsStatus === "connected" ? (
          <Wifi className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
        <span
          className={
            wsStatus === "connected"
              ? "text-foreground font-medium"
              : wsStatus === "connecting"
              ? "text-muted-foreground"
              : "text-muted-foreground/50"
          }
        >
          WS:{" "}
          {wsStatus === "connected"
            ? "Connected"
            : wsStatus === "connecting"
            ? "Connecting..."
            : "Disconnected"}
        </span>
      </div>

      {wsStatus === "connected" && (
        <div className="flex items-center gap-2">
          {PROVIDERS.map((p) => {
            const connected = connectedProviders.includes(p);
            return (
              <span
                key={p}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                  connected
                ? "bg-accent text-foreground font-medium border border-input"
                    : "bg-card text-muted-foreground/50"
                }`}
              >
                {PROVIDER_LABELS[p]}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
