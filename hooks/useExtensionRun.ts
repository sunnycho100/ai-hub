import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Provider,
  PROVIDERS,
  RunMode,
  RunStatus,
  Round,
  Run,
  WSMessage,
} from "@/lib/types";
import {
  createRun,
  addMessageToRun,
  updateRunStatus,
} from "@/lib/store";
import { buildR1Prompt, buildR2Prompt, buildR3Prompt } from "@/lib/prompts";
import { generateMockResponse } from "@/lib/mock";

interface UseExtensionRunParams {
  send: (msg: WSMessage) => void;
  subscribe: (handler: (msg: WSMessage) => void) => () => void;
  refreshRuns: () => void;
  wsStatus: "connected" | "disconnected" | "connecting";
}

/** Max times to retry a SEND_PROMPT before giving up */
const SEND_RETRY_MAX = 8;
/** Seconds to wait for PROMPT_SENT acknowledgment before retrying */
const SEND_RETRY_TIMEOUT = 8000;
/** Maximum time to wait for provider tabs to register before failing queued start */
const START_WAIT_TIMEOUT = 45000;
/** Background errors that are likely transient during startup and should keep retrying */
const RETRYABLE_ERROR_CODES = new Set(["TAB_NOT_FOUND", "TAB_CLOSED", "SEND_FAILED"]);

export function useExtensionRun({ send, subscribe, refreshRuns, wsStatus }: UseExtensionRunParams) {
  // ─── Model selection ──────────────────────────────────
  const [selectedExtModels, setSelectedExtModels] = useState<Set<Provider>>(
    new Set(PROVIDERS)
  );
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [extMaxRounds, setExtMaxRounds] = useState<number>(2);

  /** Whether the extension has confirmed it's alive on the WS bus */
  const [extensionReady, setExtensionReady] = useState(false);

  const toggleExtModel = useCallback((model: Provider) => {
    setSelectedExtModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) {
        if (next.size > 1) next.delete(model);
      } else {
        next.add(model);
      }
      return next;
    });
  }, []);

  const activeExtProviders = useMemo(
    () => PROVIDERS.filter((p) => selectedExtModels.has(p)),
    [selectedExtModels]
  );

  // ─── Run state ────────────────────────────────────────
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<RunMode>("debate");
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<Provider[]>([]);
  const [sendingProviders, setSendingProviders] = useState<Provider[]>([]);
  const [providerErrors, setProviderErrors] = useState<
    Record<string, { code: string; message: string }>
  >({});

  const runRef = useRef(currentRun);
  runRef.current = currentRun;

  const runProvidersRef = useRef<Provider[]>([...PROVIDERS]);

  // ─── Memory session ref ────────────────────────────────
  const memorySessionIdRef = useRef<string | null>(null);
  const memoryContextRef = useRef<string>("");

  const runStatus: RunStatus = currentRun?.status || "IDLE";
  const messages = currentRun?.messages || [];

  // ─── Retry state for SEND_PROMPT ──────────────────────
  // Track pending prompts that haven't been ACKed (PROMPT_SENT)
  const pendingPromptsRef = useRef<
    Map<
      string, // key: `${runId}:${provider}:${round}`
      { msg: WSMessage; retries: number; timer: ReturnType<typeof setTimeout> }
    >
  >(new Map());
  // Queue a start request when user clicks Start before provider tabs finish registering.
  const pendingStartRef = useRef<{
    topic: string;
    mode: RunMode;
    providers: Provider[];
    startedAt: number;
  } | null>(null);

  /** Send a SEND_PROMPT with automatic retry */
  const sendWithRetry = useCallback(
    (msg: WSMessage & { type: "SEND_PROMPT"; runId: string; provider: Provider; round: Round }) => {
      const key = `${msg.runId}:${msg.provider}:${msg.round}`;

      // Clear any existing retry for this key
      const existing = pendingPromptsRef.current.get(key);
      if (existing) clearTimeout(existing.timer);

      const attempt = (retries: number) => {
        console.log(
          `[agent] Sending SEND_PROMPT to ${msg.provider} round ${msg.round} (attempt ${retries + 1}/${SEND_RETRY_MAX + 1})`
        );
        send(msg);

        const timer = setTimeout(() => {
          // No PROMPT_SENT received — retry or fail
          if (retries < SEND_RETRY_MAX) {
            console.warn(
              `[agent] No ACK from ${msg.provider} round ${msg.round}, retrying... (${retries + 1}/${SEND_RETRY_MAX})`
            );
            // Before retrying, ask the extension if it's alive
            send({ type: "DISCOVER_EXTENSION" } as WSMessage);
            attempt(retries + 1);
          } else {
            console.error(
              `[agent] Gave up sending to ${msg.provider} round ${msg.round} after ${SEND_RETRY_MAX + 1} attempts`
            );
            pendingPromptsRef.current.delete(key);
            setProviderErrors((prev) => ({
              ...prev,
              [msg.provider]: {
                code: "SEND_TIMEOUT",
                message: `Could not reach ${msg.provider} after ${SEND_RETRY_MAX + 1} attempts. Check that the extension is loaded and the provider tab is open.`,
              },
            }));
            setSendingProviders((prev) =>
              prev.filter((p) => p !== msg.provider)
            );
          }
        }, SEND_RETRY_TIMEOUT);

        pendingPromptsRef.current.set(key, { msg, retries, timer });
      };

      attempt(0);
    },
    [send]
  );

  /** Clear retry timer when we get a PROMPT_SENT ACK */
  const clearRetry = useCallback((runId: string, provider: Provider, round: Round) => {
    const key = `${runId}:${provider}:${round}`;
    const pending = pendingPromptsRef.current.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      pendingPromptsRef.current.delete(key);
    }
  }, []);

  // Clean up all retry timers on unmount
  useEffect(() => {
    return () => {
      for (const entry of pendingPromptsRef.current.values()) {
        clearTimeout(entry.timer);
      }
      pendingPromptsRef.current.clear();
    };
  }, []);

  // ─── Round completion logic ───────────────────────────
  const checkRoundCompletion = useCallback(
    (run: Run, round: Round) => {
      const roundMessages = run.messages.filter(
        (m) => m.round === round && m.role === "assistant"
      );
      const respondedProviders = new Set(roundMessages.map((m) => m.provider));
      const expectedCount = runProvidersRef.current.length;

      if (respondedProviders.size >= expectedCount) {
        if (round < extMaxRounds && round < 3) {
          advanceToRound(run, (round + 1) as Round);
        } else {
          const doneRun = updateRunStatus(run.id, "DONE");
          if (doneRun) {
            setCurrentRun({ ...doneRun });
            refreshRuns();
          }

          // ─── Memory: trigger consolidation on DONE ────
          if (memorySessionIdRef.current) {
            fetch("/api/memory/consolidate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: memorySessionIdRef.current,
              }),
            }).catch(() => {});
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extMaxRounds]
  );

  const advanceToRound = useCallback(
    (run: Run, nextRound: Round) => {
      const activeProviders = runProvidersRef.current;
      const sendingStatus: RunStatus = `R${nextRound}_SENDING` as RunStatus;
      const waitingStatus: RunStatus = `R${nextRound}_WAITING` as RunStatus;

      updateRunStatus(run.id, sendingStatus);
      setCurrentRun((prev) =>
        prev ? { ...prev, status: sendingStatus } : prev
      );

      setSendingProviders([...activeProviders]);

      for (const provider of activeProviders) {
        const promptText =
          nextRound === 2
            ? buildR2Prompt(run.topic, run.mode, provider, run.messages)
            : buildR3Prompt(run.topic, run.mode, provider, run.messages);

        sendWithRetry({
          type: "SEND_PROMPT",
          runId: run.id,
          provider,
          round: nextRound,
          text: promptText,
        });
      }

      setTimeout(() => {
        updateRunStatus(run.id, waitingStatus);
        setCurrentRun((prev) =>
          prev ? { ...prev, status: waitingStatus } : prev
        );
      }, 500);
    },
    [sendWithRetry]
  );

  const startRun = useCallback(
    async (runTopic: string, runMode: RunMode, providers: Provider[]) => {
      if (providers.length === 0) return;

      runProvidersRef.current = [...providers];

      const run = createRun(runTopic, runMode);
      updateRunStatus(run.id, "R1_SENDING");
      run.status = "R1_SENDING";
      setCurrentRun(run);
      setSendingProviders([...runProvidersRef.current]);
      setProviderErrors({});

      // ─── Memory: create session & fetch context ─────────
      memorySessionIdRef.current = null;
      memoryContextRef.current = "";
      try {
        const sessionRes = await fetch("/api/memory/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: run.id }),
        });
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          memorySessionIdRef.current = session.id;
        }
      } catch {
        // Memory is non-blocking — continue without it
      }

      try {
        const contextRes = await fetch(
          `/api/memory/context?topic=${encodeURIComponent(runTopic)}`
        );
        if (contextRes.ok) {
          const ctx = await contextRes.json();
          memoryContextRef.current = ctx.contextBlock || "";
        }
      } catch {
        memoryContextRef.current = "";
      }

      // Capture the topic as a short-term memory signal
      if (memorySessionIdRef.current) {
        fetch("/api/memory/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: memorySessionIdRef.current,
            type: "topic",
            content: runTopic,
            source: "user_input",
          }),
        }).catch(() => {});
      }
      // ─── End memory setup ───────────────────────────────

      for (const provider of runProvidersRef.current) {
        const promptText = buildR1Prompt(runTopic, runMode);
        sendWithRetry({
          type: "SEND_PROMPT",
          runId: run.id,
          provider,
          round: 1,
          text: promptText,
        });
      }

      setTimeout(() => {
        updateRunStatus(run.id, "R1_WAITING");
        setCurrentRun((prev) =>
          prev ? { ...prev, status: "R1_WAITING" } : prev
        );
      }, 500);
    },
    [sendWithRetry]
  );

  // ─── WebSocket listener ───────────────────────────────
  useEffect(() => {
    const unsub = subscribe((msg: WSMessage) => {
      switch (msg.type) {
        case "HELLO_PROVIDER":
          setConnectedProviders((prev) =>
            prev.includes(msg.provider) ? prev : [...prev, msg.provider]
          );
          break;

        case "EXTENSION_READY":
          console.log("[agent] Extension confirmed ready on the bus");
          setExtensionReady(true);
          // Populate connected providers from extension's registry
          if (msg.providers) {
            const providers = Object.keys(msg.providers) as Provider[];
            setConnectedProviders((prev) => {
              const merged = new Set([...prev, ...providers]);
              return [...merged];
            });
          }
          break;

        case "PROMPT_SENT":
          // Clear retry timer — the prompt was delivered
          if ("runId" in msg && "provider" in msg && "round" in msg) {
            clearRetry(msg.runId, msg.provider, msg.round);
          }
          setProviderErrors((prev) => {
            if (!prev[msg.provider]) return prev;
            const next = { ...prev };
            delete next[msg.provider];
            return next;
          });
          setSendingProviders((prev) =>
            prev.filter((p) => p !== msg.provider)
          );
          break;

        case "NEW_MESSAGE": {
          if (!runRef.current || msg.runId !== runRef.current.id) break;
          const updated = addMessageToRun(msg.runId, {
            runId: msg.runId,
            provider: msg.provider,
            round: msg.round,
            role: msg.role,
            text: msg.text,
            timestamp: msg.timestamp,
          });
          if (updated) {
            setCurrentRun({ ...updated });
            checkRoundCompletion(updated, msg.round);
          }

          // ─── Memory: capture AI response ──────────────
          if (memorySessionIdRef.current && msg.text && msg.role === "assistant") {
            fetch("/api/memory/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: memorySessionIdRef.current,
                type: "message",
                content: (msg.text as string).slice(0, 2000),
                source: "ai_response",
                provider: msg.provider,
                round: msg.round,
              }),
            }).catch(() => {});
          }
          break;
        }

        case "ERROR":
          console.error(
            `[agent] Error from ${msg.provider}: ${msg.code} – ${msg.message}`
          );
          const isRetryable = RETRYABLE_ERROR_CODES.has(msg.code);
          setProviderErrors((prev) => ({
            ...prev,
            [msg.provider]: { code: msg.code, message: msg.message },
          }));
          if (isRetryable) {
            console.warn(
              `[agent] ${msg.provider} not ready yet (${msg.code}); keeping retry timer active`
            );
            send({ type: "DISCOVER_EXTENSION" } as WSMessage);
            break;
          }

          setSendingProviders((prev) =>
            prev.filter((p) => p !== msg.provider)
          );
          // Clear pending retry for non-retryable failures
          if (runRef.current && "provider" in msg) {
            const run = runRef.current;
            const currentRound = run.status.startsWith("R")
              ? (parseInt(run.status[1]) as Round)
              : null;
            const roundFromMsg =
              "round" in msg && typeof msg.round === "number"
                ? (msg.round as Round)
                : null;
            const roundToClear = roundFromMsg ?? currentRound;
            if (roundToClear) {
              clearRetry(run.id, msg.provider, roundToClear);
            }
          }
          break;

        case "PING_ACK":
          break;
      }
    });
    return unsub;
  }, [subscribe, clearRetry, send]);

  // ─── WS lifecycle sync ───────────────────────────────
  useEffect(() => {
    if (wsStatus !== "connected") {
      // Prevent stale "connected provider" UI when WS dropped.
      setExtensionReady(false);
      setConnectedProviders([]);
      return;
    }
    // Re-sync extension/provider registry after reconnect.
    send({ type: "DISCOVER_EXTENSION" } as WSMessage);
  }, [wsStatus, send]);

  // ─── Periodic discovery to keep extension/provider registry fresh ─
  useEffect(() => {
    if (wsStatus !== "connected") return;

    // Continue discovery until extension is ready AND all selected providers are connected.
    const missingSelectedProvider = activeExtProviders.some(
      (p) => !connectedProviders.includes(p)
    );
    if (extensionReady && !missingSelectedProvider) return;

    send({ type: "DISCOVER_EXTENSION" } as WSMessage);
    const interval = setInterval(() => {
      console.log("[agent] Sending DISCOVER_EXTENSION...");
      send({ type: "DISCOVER_EXTENSION" } as WSMessage);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeExtProviders, connectedProviders, extensionReady, send, wsStatus]);

  // Auto-start queued run once at least one requested provider is connected.
  useEffect(() => {
    const pending = pendingStartRef.current;
    if (!pending) return;

    const readyProviders = pending.providers.filter((p) =>
      connectedProviders.includes(p)
    );
    if (readyProviders.length === 0) return;

    console.log(
      `[agent] Starting queued run with providers: ${readyProviders.join(", ")}`
    );
    pendingStartRef.current = null;
    setProviderErrors({});
    startRun(pending.topic, pending.mode, readyProviders);
  }, [connectedProviders, startRun]);

  // Expire queued start if tabs never register.
  useEffect(() => {
    const interval = setInterval(() => {
      const pending = pendingStartRef.current;
      if (!pending) return;
      if (Date.now() - pending.startedAt < START_WAIT_TIMEOUT) return;

      pendingStartRef.current = null;
      setProviderErrors({
        _system: {
          code: "PROVIDER_CONNECT_TIMEOUT",
          message:
            "Provider tabs did not connect within 45s. Make sure each tab is fully loaded and logged in, then click Start Run again.",
        },
      });
      setSendingProviders([]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ─── Start run ────────────────────────────────────────
  const handleStart = useCallback(() => {
    const runTopic = topic.trim();
    if (!runTopic) return;

    if (wsStatus !== "connected") {
      setProviderErrors({
        _system: {
          code: "WS_NOT_CONNECTED",
          message:
            "WebSocket bus is disconnected. Make sure start.sh is running and refresh this page.",
        },
      });
      return;
    }

    // Determine which providers to use
    const activeProviders = activeExtProviders.filter((p) =>
      connectedProviders.includes(p)
    );

    if (activeProviders.length === 0) {
      // Queue start instead of dropping first-run prompts while tabs are still registering.
      pendingStartRef.current = {
        topic: runTopic,
        mode,
        providers: [...activeExtProviders],
        startedAt: Date.now(),
      };

      if (!extensionReady) {
        setProviderErrors({
          _system: {
            code: "EXTENSION_NOT_READY",
            message:
              "Waiting for the browser extension bridge to connect. Keep this page open and ensure the extension is loaded in Chrome.",
          },
        });
      } else {
        setProviderErrors({
          _system: {
            code: "WAITING_FOR_PROVIDERS",
            message:
              "Waiting for provider tabs to register. Keep ChatGPT, Gemini, and Claude tabs open and fully loaded; run will start automatically.",
          },
        });
      }
      send({ type: "DISCOVER_EXTENSION" } as WSMessage);
      return;
    }

    pendingStartRef.current = null;
    startRun(runTopic, mode, activeProviders);
  }, [topic, mode, send, connectedProviders, activeExtProviders, extensionReady, startRun, wsStatus]);

  // ─── Stop run ─────────────────────────────────────────
  const handleStop = useCallback(() => {
    pendingStartRef.current = null;
    if (!currentRun) return;
    // Clear all pending retries
    for (const entry of pendingPromptsRef.current.values()) {
      clearTimeout(entry.timer);
    }
    pendingPromptsRef.current.clear();

    const stopped = updateRunStatus(currentRun.id, "ERROR");
    if (stopped) {
      setCurrentRun({ ...stopped });
      refreshRuns();
    }
    setSendingProviders([]);

    // ─── Memory: consolidate what we have so far ────
    if (memorySessionIdRef.current) {
      fetch("/api/memory/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: memorySessionIdRef.current,
        }),
      }).catch(() => {});
    }
  }, [currentRun, refreshRuns]);

  // ─── Mock run ─────────────────────────────────────────
  const handleMockRun = useCallback(() => {
    if (!topic.trim()) return;

    const mockProviders = [...activeExtProviders];
    const run = createRun(topic, mode);
    const rounds: Round[] = [1, 2, 3];
    let delay = 0;

    for (const round of rounds) {
      const sendingStatus: RunStatus = `R${round}_SENDING` as RunStatus;
      const waitingStatus: RunStatus = `R${round}_WAITING` as RunStatus;

      delay += 300;
      setTimeout(() => {
        const r = updateRunStatus(run.id, sendingStatus);
        if (r) setCurrentRun({ ...r });
        setSendingProviders([...mockProviders]);
      }, delay);

      delay += 500;
      const capturedRound = round;
      setTimeout(() => {
        const r = updateRunStatus(run.id, waitingStatus);
        if (r) setCurrentRun({ ...r });

        mockProviders.forEach((provider, i) => {
          setTimeout(() => {
            const mockText = generateMockResponse(
              provider,
              capturedRound,
              topic,
              mode
            );
            const updated = addMessageToRun(run.id, {
              runId: run.id,
              provider,
              round: capturedRound,
              role: "assistant",
              text: mockText,
              timestamp: Date.now(),
            });
            if (updated) {
              setCurrentRun({ ...updated });
            }
            setSendingProviders((prev) =>
              prev.filter((p) => p !== provider)
            );

            if (capturedRound === 3 && i === mockProviders.length - 1) {
              setTimeout(() => {
                const done = updateRunStatus(run.id, "DONE");
                if (done) {
                  setCurrentRun({ ...done });
                  refreshRuns();
                }
              }, 200);
            }
          }, i * 400);
        });
      }, delay);

      delay += 1500;
    }
  }, [topic, mode, refreshRuns, activeExtProviders]);

  // ─── History helpers ──────────────────────────────────
  const loadRun = useCallback((run: Run) => {
    setCurrentRun(run);
    setTopic(run.topic);
    setMode(run.mode);
  }, []);

  const resetRun = useCallback(() => {
    pendingStartRef.current = null;
    setCurrentRun(null);
    setTopic("");
    setSendingProviders([]);
    setProviderErrors({});
  }, []);

  const clearCurrentIfId = useCallback(
    (id: string) => {
      if (currentRun?.id === id) setCurrentRun(null);
    },
    [currentRun]
  );

  return {
    // Model selection
    selectedExtModels,
    toggleExtModel,
    showModelPicker,
    setShowModelPicker,
    activeExtProviders,
    extMaxRounds,
    setExtMaxRounds,
    // Run state
    topic,
    setTopic,
    mode,
    setMode,
    currentRun,
    connectedProviders,
    sendingProviders,
    providerErrors,
    setProviderErrors,
    runStatus,
    messages,
    extensionReady,
    // Handlers
    handleStart,
    handleStop,
    handleMockRun,
    loadRun,
    resetRun,
    clearCurrentIfId,
  };
}
