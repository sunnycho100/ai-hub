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

export function useExtensionRun({ send, subscribe, refreshRuns }: UseExtensionRunParams) {
  // ─── Model selection ──────────────────────────────────
  const [selectedExtModels, setSelectedExtModels] = useState<Set<Provider>>(
    new Set(PROVIDERS)
  );
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [extMaxRounds, setExtMaxRounds] = useState<number>(2);

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

        send({
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
    [send]
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

        case "PROMPT_SENT":
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
          break;

        case "PING_ACK":
          break;
      }
    });
    return unsub;
  }, [subscribe]);

  // ─── Start run ────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!topic.trim()) return;

    const activeProviders = activeExtProviders.filter((p) =>
      connectedProviders.includes(p)
    );
    if (activeProviders.length === 0) {
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
      send({
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
  }, [topic, mode, send, connectedProviders, activeExtProviders]);

  // ─── Stop run ─────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (!currentRun) return;
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
    // Handlers
    handleStart,
    handleStop,
    handleMockRun,
    loadRun,
    resetRun,
    clearCurrentIfId,
  };
}
