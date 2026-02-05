/**
 * AI Hub – React hook for WebSocket connection
 *
 * Manages connection lifecycle and exposes status + messages.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { wsConnect, wsDisconnect, wsSend, wsOnMessage, wsOnStatus } from "./ws";
import type { WSMessage } from "./types";

export type WSStatus = "connected" | "disconnected" | "connecting";

export function useWebSocket() {
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  // Use a ref-based listener registry so consumers can subscribe
  const listenersRef = useRef<Set<(msg: WSMessage) => void>>(new Set());

  useEffect(() => {
    const unsubStatus = wsOnStatus(setStatus);
    const unsubMessage = wsOnMessage((msg) => {
      setLastMessage(msg);
      listenersRef.current.forEach((fn) => fn(msg));
    });

    wsConnect();

    return () => {
      unsubStatus();
      unsubMessage();
      wsDisconnect();
    };
  }, []);

  const send = useCallback((msg: WSMessage) => {
    wsSend(msg);
  }, []);

  /** Subscribe to incoming messages. Returns unsubscribe function. */
  const subscribe = useCallback((handler: (msg: WSMessage) => void) => {
    listenersRef.current.add(handler);
    return () => {
      listenersRef.current.delete(handler);
    };
  }, []);

  return { status, lastMessage, send, subscribe };
}
