import { useState, useCallback, useRef, useEffect } from "react";
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
}

/** Max times to retry a SEND_PROMPT before giving up */
const SEND_RETRY_MAX = 3;
/** Seconds to wait for PROMPT_SENT acknowledgment before retrying */
const SEND_RETRY_TIMEOUT = 8000;

export function useExtensionRun({ send, subscribe, refreshRuns }: UseExtensionRunParams) {
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

  const activeExtProviders: Provider[] = PROVIDERS.filter((p) =>
    selectedExtModels.has(p)
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
          break;
        }

        case "ERROR":
          console.error(
            `[agent] Error from ${msg.provider}: ${msg.code} – ${msg.message}`
          );
          setProviderErrors((prev) => ({
            ...prev,
            [msg.provider]: { code: msg.code, message: msg.message },
          }));
          setSendingProviders((prev) =>
            prev.filter((p) => p !== msg.provider)
          );
          // Also clear any pending retry for this provider
          if (runRef.current && "provider" in msg) {
            const run = runRef.current;
            const currentRound = run.status.startsWith("R")
              ? (parseInt(run.status[1]) as Round)
              : null;
            if (currentRound) {
              clearRetry(run.id, msg.provider, currentRound);
            }
          }
          break;

        case "PING_ACK":
          break;
      }
    });
    return unsub;
  }, [subscribe, clearRetry]);

  // ─── Periodic discovery to detect extension readiness ─
  useEffect(() => {
    // Send DISCOVER_EXTENSION every 3 seconds until extension confirms ready
    if (extensionReady) return;

    const interval = setInterval(() => {
      console.log("[agent] Sending DISCOVER_EXTENSION...");
      send({ type: "DISCOVER_EXTENSION" } as WSMessage);
    }, 3000);

    return () => clearInterval(interval);
  }, [extensionReady, send]);

  // ─── Start run ────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!topic.trim()) return;

    // Determine which providers to use
    const activeProviders = activeExtProviders.filter((p) =>
      connectedProviders.includes(p)
    );

    if (activeProviders.length === 0) {
      // No providers confirmed connected — show error instead of silently failing
      if (!extensionReady) {
        setProviderErrors({
          _system: {
            code: "EXTENSION_NOT_READY",
            message:
              "The browser extension is not connected. Make sure it's loaded in Chrome and the WebSocket bus is running (ws://localhost:3333).",
          },
        });
        // Try to wake the extension one more time
        send({ type: "DISCOVER_EXTENSION" } as WSMessage);
        return;
      }
      // Extension is ready but no providers connected — try anyway (tabs may be open)
      console.warn(
        "[agent] No providers confirmed connected, attempting run with all selected models..."
      );
      runProvidersRef.current = [...activeExtProviders];
    } else {
      runProvidersRef.current = activeProviders;
    }

    const run = createRun(topic, mode);
    updateRunStatus(run.id, "R1_SENDING");
    run.status = "R1_SENDING";
    setCurrentRun(run);
    setSendingProviders([...runProvidersRef.current]);
    setProviderErrors({});

    for (const provider of runProvidersRef.current) {
      const promptText = buildR1Prompt(topic, mode);
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
  }, [topic, mode, sendWithRetry, send, connectedProviders, activeExtProviders, extensionReady]);

  // ─── Stop run ─────────────────────────────────────────
  const handleStop = useCallback(() => {
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
