/**
 * AI Hub – WebSocket client for the browser (HubAI side)
 *
 * Connects to the local WS bus at ws://localhost:3333.
 * Provides connect / disconnect / send / onMessage helpers
 * and a React hook for connection status.
 */

import { WSMessage } from "./types";

const WS_URL = "ws://localhost:3333";

type MessageHandler = (msg: WSMessage) => void;
type StatusHandler = (status: "connected" | "disconnected" | "connecting") => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const messageHandlers = new Set<MessageHandler>();
const statusHandlers = new Set<StatusHandler>();

function notifyStatus(status: "connected" | "disconnected" | "connecting") {
  statusHandlers.forEach((fn) => fn(status));
}

/** Connect to the WS bus. Auto-reconnects on close. */
export function wsConnect(): void {
  if (socket && socket.readyState <= 1) return; // already open or connecting

  notifyStatus("connecting");
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("[ws] connected to bus");
    notifyStatus("connected");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  socket.onmessage = (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);
      messageHandlers.forEach((fn) => fn(msg));
    } catch {
      console.warn("[ws] failed to parse message", event.data);
    }
  };

  socket.onclose = () => {
    console.log("[ws] disconnected");
    notifyStatus("disconnected");
    socket = null;
    // Auto-reconnect after 2s
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        wsConnect();
      }, 2000);
    }
  };

  socket.onerror = () => {
    // onclose will fire after onerror
  };
}

/** Disconnect and stop reconnection attempts. */
export function wsDisconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  notifyStatus("disconnected");
}

/** Send a message through the bus. */
export function wsSend(msg: WSMessage): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("[ws] cannot send – not connected");
    return;
  }
  socket.send(JSON.stringify(msg));
}

/** Register a handler for incoming messages. Returns an unsubscribe function. */
export function wsOnMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

/** Register a handler for connection status changes. Returns an unsubscribe function. */
export function wsOnStatus(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  return () => statusHandlers.delete(handler);
}

/** Get current connection state. */
export function wsIsConnected(): boolean {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}
