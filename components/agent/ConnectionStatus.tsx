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
      {/* WS Bus Connection */}
      <div className="flex items-center gap-1.5">
        {wsStatus === "connected" ? (
          <Wifi className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-gray-400" />
        )}
        <span
          className={
            wsStatus === "connected"
              ? "text-green-700 font-medium"
              : wsStatus === "connecting"
              ? "text-yellow-600"
              : "text-gray-400"
          }
        >
          WS:{" "}
          {wsStatus === "connected"
            ? "Connected"
            : wsStatus === "connecting"
            ? "Connecting…"
            : "Disconnected"}
        </span>
      </div>

      {/* Provider Tabs */}
      {wsStatus === "connected" && (
        <div className="flex items-center gap-2">
          {(["chatgpt", "gemini", "grok"] as Provider[]).map((p) => {
            const connected = connectedProviders.includes(p);
            return (
              <span
                key={p}
                className={`px-2 py-0.5 rounded-full text-xs ${
                  connected
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
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
