"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AgentPanel } from "@/components/agent/AgentPanel";
import { TranscriptTimeline } from "@/components/agent/TranscriptTimeline";
import { RunControls } from "@/components/agent/RunControls";
import { ConnectionStatus } from "@/components/agent/ConnectionStatus";
import { useWebSocket } from "@/lib/useWebSocket";
import {
  Provider,
  PROVIDERS,
  RunMode,
  RunStatus,
  Round,
  Run,
  TranscriptMessage,
  PROVIDER_LABELS,
  WSMessage,
} from "@/lib/types";
import {
  createRun,
  addMessageToRun,
  updateRunStatus,
  loadRuns,
  deleteRun,
} from "@/lib/store";
import { buildR1Prompt, buildR2Prompt, buildR3Prompt } from "@/lib/prompts";

// ─── Mock Responses (for testing without the extension) ─────
function generateMockResponse(
  provider: Provider,
  round: Round,
  topic: string,
  mode: RunMode
): string {
  const label = PROVIDER_LABELS[provider];

  if (round === 1) {
    return `[${label} – Round 1]\n\nRegarding "${topic}":\n\nThis is a simulated ${mode === "debate" ? "independent analysis" : "collaborative response"} from ${label}. In a real run, this response would come directly from the ${label} AI model via the Chrome extension.\n\nKey points:\n• First observation about the topic\n• Supporting reasoning and evidence\n• Initial conclusion`;
  }
  if (round === 2) {
    return `[${label} – Round 2]\n\nAfter reviewing the other participants' responses:\n\nThis is a simulated ${mode === "debate" ? "critique and refinement" : "synthesis"} from ${label}. The actual response would incorporate real feedback from other AI models.\n\nRefined position:\n• Acknowledging strong points from others\n• Areas of disagreement or improvement\n• Updated analysis`;
  }
  return `[${label} – Round 3]\n\nFinal ${mode === "debate" ? "position" : "consolidated answer"}:\n\nThis is the simulated final response from ${label}. In production, this would be a genuine reconciliation of all previous rounds.\n\nConclusion:\n• Final synthesized answer\n• Remaining open questions\n• Recommended next steps`;
}

// ─── Main Agent Page ────────────────────────────────────────
export default function AgentPage() {
  const { status: wsStatus, send, subscribe } = useWebSocket();

  // Run state
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<RunMode>("debate");
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [pastRuns, setPastRuns] = useState<Run[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<Provider[]>([]);
  const [sendingProviders, setSendingProviders] = useState<Provider[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Ref to current run for use in callbacks
  const runRef = useRef(currentRun);
  runRef.current = currentRun;

  // Load past runs on mount
  useEffect(() => {
    setPastRuns(loadRuns());
  }, []);

  // Listen for WS messages from the extension
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
          break;

        case "PING_ACK":
          break;
      }
    });
    return unsub;
  }, [subscribe]);

  // ─── Round completion logic ─────────────────────────────
  const checkRoundCompletion = useCallback(
    (run: Run, round: Round) => {
      const roundMessages = run.messages.filter(
        (m) => m.round === round && m.role === "assistant"
      );
      const respondedProviders = new Set(roundMessages.map((m) => m.provider));

      if (respondedProviders.size >= 3) {
        if (round === 1) {
          advanceToRound(run, 2);
        } else if (round === 2) {
          advanceToRound(run, 3);
        } else {
          const doneRun = updateRunStatus(run.id, "DONE");
          if (doneRun) {
            setCurrentRun({ ...doneRun });
            setPastRuns(loadRuns());
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const advanceToRound = useCallback(
    (run: Run, nextRound: Round) => {
      const sendingStatus: RunStatus = `R${nextRound}_SENDING` as RunStatus;
      const waitingStatus: RunStatus = `R${nextRound}_WAITING` as RunStatus;

      updateRunStatus(run.id, sendingStatus);
      setCurrentRun((prev) =>
        prev ? { ...prev, status: sendingStatus } : prev
      );

      setSendingProviders([...PROVIDERS]);

      for (const provider of PROVIDERS) {
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

  // ─── Start a real run (via extension) ─────────────────
  const handleStart = useCallback(() => {
    if (!topic.trim()) return;

    const run = createRun(topic, mode);
    updateRunStatus(run.id, "R1_SENDING");
    run.status = "R1_SENDING";
    setCurrentRun(run);
    setSendingProviders([...PROVIDERS]);

    for (const provider of PROVIDERS) {
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
  }, [topic, mode, send]);

  // ─── Stop the current run ─────────────────────────────
  const handleStop = useCallback(() => {
    if (!currentRun) return;
    const stopped = updateRunStatus(currentRun.id, "ERROR");
    if (stopped) {
      setCurrentRun({ ...stopped });
      setPastRuns(loadRuns());
    }
    setSendingProviders([]);
  }, [currentRun]);

  // ─── Mock run (simulates all 3 rounds locally) ────────
  const handleMockRun = useCallback(() => {
    if (!topic.trim()) return;

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
        setSendingProviders([...PROVIDERS]);
      }, delay);

      delay += 500;
      const capturedRound = round;
      setTimeout(() => {
        const r = updateRunStatus(run.id, waitingStatus);
        if (r) setCurrentRun({ ...r });

        PROVIDERS.forEach((provider, i) => {
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

            if (capturedRound === 3 && i === PROVIDERS.length - 1) {
              setTimeout(() => {
                const done = updateRunStatus(run.id, "DONE");
                if (done) {
                  setCurrentRun({ ...done });
                  setPastRuns(loadRuns());
                }
              }, 200);
            }
          }, i * 400);
        });
      }, delay);

      delay += 1500;
    }
  }, [topic, mode]);

  // ─── Load a past run ──────────────────────────────────
  const handleLoadRun = useCallback((run: Run) => {
    setCurrentRun(run);
    setTopic(run.topic);
    setMode(run.mode);
    setShowHistory(false);
  }, []);

  // ─── Delete a past run ────────────────────────────────
  const handleDeleteRun = useCallback(
    (runId: string) => {
      deleteRun(runId);
      setPastRuns(loadRuns());
      if (currentRun?.id === runId) {
        setCurrentRun(null);
      }
    },
    [currentRun]
  );

  // ─── New run (reset) ──────────────────────────────────
  const handleNewRun = useCallback(() => {
    setCurrentRun(null);
    setTopic("");
    setSendingProviders([]);
  }, []);

  const runStatus: RunStatus = currentRun?.status || "IDLE";
  const messages = currentRun?.messages || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-gray-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Agent Communication</h1>
              <p className="text-xs text-gray-500">
                Multi-model debate and collaboration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionStatus
            wsStatus={wsStatus}
            connectedProviders={connectedProviders}
          />
          <div className="flex items-center gap-2">
            {currentRun && currentRun.status === "DONE" && (
              <Button variant="outline" size="sm" onClick={handleNewRun}>
                New Run
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Run History</CardTitle>
          </CardHeader>
          <CardContent>
            {pastRuns.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No past runs.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pastRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer group"
                    onClick={() => handleLoadRun(run)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {run.topic}
                      </p>
                      <p className="text-xs text-gray-400">
                        {run.mode} · {run.messages.length} messages ·{" "}
                        {new Date(run.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          run.status === "DONE"
                            ? "bg-green-100 text-green-700"
                            : run.status === "ERROR"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {run.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRun(run.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run Controls */}
      <div className="mb-6">
        <RunControls
          topic={topic}
          mode={mode}
          status={runStatus}
          onTopicChange={setTopic}
          onModeChange={setMode}
          onStart={handleStart}
          onStop={handleStop}
          onMockRound={handleMockRun}
        />
      </div>

      {/* Agent Panels (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {PROVIDERS.map((provider) => (
          <AgentPanel
            key={provider}
            provider={provider}
            messages={messages}
            isConnected={connectedProviders.includes(provider)}
            isSending={sendingProviders.includes(provider)}
            currentRound={
              runStatus.startsWith("R")
                ? (parseInt(runStatus[1]) as Round)
                : null
            }
          />
        ))}
      </div>

      {/* Transcript Timeline */}
      <TranscriptTimeline messages={messages} />
    </div>
  );
}
