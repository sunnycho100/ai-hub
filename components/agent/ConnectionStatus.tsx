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
        {wsStatus === "connected" ? (
          <Wifi className="h-3.5 w-3.5 text-foreground" />
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
                    ? "bg-muted text-foreground font-medium"
                    : "bg-muted text-muted-foreground/50"
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
