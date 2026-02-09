"use client";

import React from "react";
import { Provider, PROVIDER_LABELS } from "@/lib/types";
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
          <Wifi className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-white/30" />
        )}
        <span
          className={
            wsStatus === "connected"
              ? "text-green-400 font-medium"
              : wsStatus === "connecting"
              ? "text-yellow-400"
              : "text-white/30"
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
          {(["chatgpt", "gemini", "grok"] as Provider[]).map((p) => {
            const connected = connectedProviders.includes(p);
            return (
              <span
                key={p}
                className={`px-2 py-0.5 rounded-full text-xs ${
                  connected
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/5 text-white/30"
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
