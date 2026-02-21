import { useState, useCallback, useRef } from "react";
import {
  Provider,
  ExtendedProvider,
  RunMode,
  RunStatus,
  Round,
  Run,
  MODEL_STATUS,
} from "@/lib/types";
import { createRun, addMessageToRun, updateRunStatus } from "@/lib/store";

interface UseApiRunParams {
  refreshRuns: () => void;
}

export function useApiRun({ refreshRuns }: UseApiRunParams) {
  // ─── Model selection ──────────────────────────────────
  const [selectedModel1, setSelectedModel1] =
    useState<ExtendedProvider>("chatgpt");
  const [selectedModel2, setSelectedModel2] =
    useState<ExtendedProvider>("gemini");
  const [maxRounds, setMaxRounds] = useState<number>(3);

  const apiProviders: Provider[] = [selectedModel1, selectedModel2].filter(
    (model): model is Provider =>
      MODEL_STATUS[model] === "available" &&
      (model === "chatgpt" || model === "gemini")
  );

  // ─── Run state ────────────────────────────────────────
  const [apiTopic, setApiTopic] = useState("");
  const [apiMode, setApiMode] = useState<RunMode>("debate");
  const [apiCurrentRun, setApiCurrentRun] = useState<Run | null>(null);
  const [apiSendingProviders, setApiSendingProviders] = useState<Provider[]>(
    []
  );
  const [apiProviderErrors, setApiProviderErrors] = useState<
    Record<string, { code: string; message: string }>
  >({});

  const apiRunRef = useRef(apiCurrentRun);
  apiRunRef.current = apiCurrentRun;

  const apiCancelledRef = useRef(false);
  const apiAbortRef = useRef<AbortController | null>(null);

  const apiStatus: RunStatus = apiCurrentRun?.status || "IDLE";
  const apiMessages = apiCurrentRun?.messages || [];

  // ─── Stop ─────────────────────────────────────────────
  const handleApiStop = useCallback(() => {
    apiCancelledRef.current = true;
    if (apiAbortRef.current) {
      apiAbortRef.current.abort();
    }
    if (!apiCurrentRun) return;
    const stopped = updateRunStatus(apiCurrentRun.id, "ERROR");
    if (stopped) {
      setApiCurrentRun({ ...stopped });
      refreshRuns();
    }
    setApiSendingProviders([]);
  }, [apiCurrentRun, refreshRuns]);

  // ─── Memory session ref ────────────────────────────────
  const memorySessionIdRef = useRef<string | null>(null);
  const memoryContextRef = useRef<string>("");

  // ─── Start ────────────────────────────────────────────
  const handleApiStart = useCallback(async () => {
    if (!apiTopic.trim()) return;

    apiCancelledRef.current = false;
    const run = createRun(apiTopic, apiMode, "api");
    updateRunStatus(run.id, "R1_SENDING");
    run.status = "R1_SENDING";
    setApiCurrentRun(run);
    apiRunRef.current = run;
    setApiSendingProviders([]);
    setApiProviderErrors({});
    refreshRuns();

    // ─── Memory: create session & fetch context ─────────
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
        `/api/memory/context?topic=${encodeURIComponent(apiTopic)}`
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
          content: apiTopic,
          source: "user_input",
        }),
      }).catch(() => {});
    }
    // ─── End memory setup ───────────────────────────────

    const rounds: Round[] = Array.from(
      { length: maxRounds },
      (_, i) => (i + 1) as Round
    );

    for (const round of rounds) {
      if (apiCancelledRef.current) break;

      const sendingStatus: RunStatus = `R${round}_SENDING` as RunStatus;
      updateRunStatus(run.id, sendingStatus);
      setApiCurrentRun((prev) =>
        prev ? { ...prev, status: sendingStatus } : prev
      );

      for (const provider of apiProviders) {
        if (apiCancelledRef.current) break;

        setApiSendingProviders((prev) =>
          prev.includes(provider) ? prev : [...prev, provider]
        );

        try {
          const controller = new AbortController();
          apiAbortRef.current = controller;

          const payload = {
            provider,
            topic: apiTopic,
            mode: apiMode,
            round,
            messages: (apiRunRef.current?.messages || []).map((m) => ({
              provider: m.provider,
              round: m.round,
              role: m.role,
              text: m.text,
            })),
            memoryContext: memoryContextRef.current || undefined,
            sessionId: memorySessionIdRef.current || undefined,
          };

          const response = await fetch("/api/agent-api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error || "API request failed");
          }

          const updated = addMessageToRun(run.id, {
            runId: run.id,
            provider,
            round,
            role: "assistant",
            text: data.text,
            timestamp: Date.now(),
          });

          if (updated) {
            setApiCurrentRun({ ...updated });
            apiRunRef.current = updated;
          }

          // ─── Memory: capture AI response ──────────────
          if (memorySessionIdRef.current && data.text) {
            fetch("/api/memory/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: memorySessionIdRef.current,
                type: "message",
                content: data.text.slice(0, 2000),
                source: "ai_response",
                provider,
                round,
              }),
            }).catch(() => {});
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown API error";
          setApiProviderErrors((prev) => ({
            ...prev,
            [provider]: { code: "API_ERROR", message },
          }));
          const stopped = updateRunStatus(run.id, "ERROR");
          if (stopped) {
            setApiCurrentRun({ ...stopped });
            refreshRuns();
          }
          setApiSendingProviders((prev) =>
            prev.filter((p) => p !== provider)
          );
          return;
        }

        setApiSendingProviders((prev) =>
          prev.filter((p) => p !== provider)
        );
      }

      const waitingStatus: RunStatus = `R${round}_WAITING` as RunStatus;
      updateRunStatus(run.id, waitingStatus);
      setApiCurrentRun((prev) =>
        prev ? { ...prev, status: waitingStatus } : prev
      );
    }

    if (!apiCancelledRef.current) {
      const done = updateRunStatus(run.id, "DONE");
      if (done) {
        setApiCurrentRun({ ...done });
        refreshRuns();
      }

      // ─── Memory: mark session idle for consolidation ──
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
  }, [apiTopic, apiMode, apiProviders, refreshRuns, maxRounds]);

  // ─── History helpers ──────────────────────────────────
  const loadRun = useCallback((run: Run) => {
    setApiCurrentRun(run);
    setApiTopic(run.topic);
    setApiMode(run.mode);
  }, []);

  const resetRun = useCallback(() => {
    setApiCurrentRun(null);
    setApiTopic("");
    setApiSendingProviders([]);
    setApiProviderErrors({});
  }, []);

  const clearCurrentIfId = useCallback(
    (id: string) => {
      if (apiCurrentRun?.id === id) setApiCurrentRun(null);
    },
    [apiCurrentRun]
  );

  return {
    // Model selection
    selectedModel1,
    setSelectedModel1,
    selectedModel2,
    setSelectedModel2,
    maxRounds,
    setMaxRounds,
    apiProviders,
    // Run state
    apiTopic,
    setApiTopic,
    apiMode,
    setApiMode,
    apiCurrentRun,
    apiSendingProviders,
    apiProviderErrors,
    setApiProviderErrors,
    apiStatus,
    apiMessages,
    // Handlers
    handleApiStart,
    handleApiStop,
    loadRun,
    resetRun,
    clearCurrentIfId,
  };
}
