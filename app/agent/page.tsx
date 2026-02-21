"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useWebSocket } from "@/lib/useWebSocket";
import { Run, RunSource, Round } from "@/lib/types";

// Hooks
import { useRunHistory } from "@/hooks/useRunHistory";
import { useExtensionRun } from "@/hooks/useExtensionRun";
import { useApiRun } from "@/hooks/useApiRun";
import { useCloudRecords } from "@/hooks/useCloudRecords";

// Components
import { AgentPageHeader } from "@/components/agent/AgentPageHeader";
import { ModeTabs } from "@/components/agent/ModeTabs";
import { RunHistoryPanel } from "@/components/agent/RunHistoryPanel";
import { CloudRecordsPanel } from "@/components/agent/CloudRecordsPanel";
import { ExtensionModelPicker } from "@/components/agent/ExtensionModelPicker";
import { ApiModelSelector } from "@/components/agent/ApiModelSelector";
import { ErrorBanner } from "@/components/agent/ErrorBanner";
import { RunControls } from "@/components/agent/RunControls";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { TranscriptTimeline } from "@/components/agent/TranscriptTimeline";

// ─── Main Agent Page ────────────────────────────────────────
export default function AgentPage() {
  const { status: wsStatus, send, subscribe } = useWebSocket();
  const [activeTab, setActiveTab] = useState<"extension" | "api">("extension");
  const [showCloudRecords, setShowCloudRecords] = useState(false);

  // Hooks
  const history = useRunHistory();
  const ext = useExtensionRun({
    send,
    subscribe,
    refreshRuns: history.refreshRuns,
    wsStatus,
  });
  const api = useApiRun({ refreshRuns: history.refreshRuns });
  const cloud = useCloudRecords();

  // ─── Coordinated handlers ─────────────────────────────
  const handleDeleteRun = (runId: string, source: RunSource) => {
    history.removeRun(runId);
    if (source === "extension") ext.clearCurrentIfId(runId);
    if (source === "api") api.clearCurrentIfId(runId);
  };

  const handleExtLoadRun = (run: Run) => {
    ext.loadRun(run);
    history.setShowHistory(false);
  };

  const handleApiLoadRun = (run: Run) => {
    api.loadRun(run);
    history.setShowApiHistory(false);
  };

  const handleCloudLoadRun = (run: Run) => {
    if (run.source === "api") {
      api.loadRun(run);
      setActiveTab("api");
    } else {
      ext.loadRun(run);
      setActiveTab("extension");
    }
    setShowCloudRecords(false);
  };

  const handleToggleCloud = () => {
    const next = !showCloudRecords;
    setShowCloudRecords(next);
    if (next) cloud.fetchCloudRecords();
  };

  const showNewRun =
    (activeTab === "extension" && ext.currentRun?.status === "DONE") ||
    (activeTab === "api" && api.apiCurrentRun?.status === "DONE");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <AgentPageHeader
        activeTab={activeTab}
        wsStatus={wsStatus}
        connectedProviders={ext.connectedProviders}
        extensionReady={ext.extensionReady}
        showNewRun={!!showNewRun}
        onNewRun={activeTab === "extension" ? ext.resetRun : api.resetRun}
        onToggleHistory={() =>
          activeTab === "extension"
            ? history.setShowHistory(!history.showHistory)
            : history.setShowApiHistory(!history.showApiHistory)
        }
        onToggleCloud={handleToggleCloud}
        showCloud={showCloudRecords}
      />

      {showCloudRecords && (
        <CloudRecordsPanel
          records={cloud.cloudRecords}
          isFetching={cloud.isFetching}
          onRefresh={cloud.fetchCloudRecords}
          onLoad={handleCloudLoadRun}
          onDelete={cloud.removeFromCloud}
        />
      )}

      <ModeTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ═══ Extension Mode ═══ */}
      {activeTab === "extension" && (
        <motion.div
          key="ext"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", mass: 0.5, damping: 26, stiffness: 200 }}
        >
          {history.showHistory && (
            <RunHistoryPanel
              runs={history.extensionRuns}
              onLoad={handleExtLoadRun}
              onDelete={handleDeleteRun}
              onSaveToCloud={cloud.saveToCloud}
              syncStatus={cloud.syncStatus}
              source="extension"
            />
          )}

          <ExtensionModelPicker
            selectedExtModels={ext.selectedExtModels}
            onToggleModel={ext.toggleExtModel}
            connectedProviders={ext.connectedProviders}
            activeExtProviders={ext.activeExtProviders}
            showModelPicker={ext.showModelPicker}
            onTogglePicker={() =>
              ext.setShowModelPicker(!ext.showModelPicker)
            }
            extMaxRounds={ext.extMaxRounds}
            onMaxRoundsChange={ext.setExtMaxRounds}
            runStatus={ext.runStatus}
          />

          <div className="mb-6">
            <RunControls
              topic={ext.topic}
              mode={ext.mode}
              status={ext.runStatus}
              onTopicChange={ext.setTopic}
              onModeChange={ext.setMode}
              onStart={ext.handleStart}
              onStop={ext.handleStop}
              onMockRound={ext.handleMockRun}
            />
          </div>

          <ErrorBanner
            title="Pipeline Errors"
            errors={ext.providerErrors}
            onDismiss={() => ext.setProviderErrors({})}
          />

          <div
            className={`grid grid-cols-1 ${ext.activeExtProviders.length >= 2 ? "md:grid-cols-2" : ""} gap-4 mb-6`}
          >
            {ext.activeExtProviders.map((provider) => (
              <div
                key={provider}
                className="transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-2 fade-in"
              >
                <AgentPanel
                  provider={provider}
                  messages={ext.messages}
                  isConnected={ext.connectedProviders.includes(provider)}
                  isSending={ext.sendingProviders.includes(provider)}
                  error={ext.providerErrors[provider]}
                  currentRound={
                    ext.runStatus.startsWith("R")
                      ? (parseInt(ext.runStatus[1]) as Round)
                      : null
                  }
                />
              </div>
            ))}
          </div>

          <TranscriptTimeline messages={ext.messages} />
        </motion.div>
      )}

      {/* ═══ API Mode ═══ */}
      {activeTab === "api" && (
        <motion.div
          key="api"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", mass: 0.5, damping: 26, stiffness: 200 }}
        >
          {history.showApiHistory && (
            <RunHistoryPanel
              runs={history.apiRuns}
              onLoad={handleApiLoadRun}
              onDelete={handleDeleteRun}
              onSaveToCloud={cloud.saveToCloud}
              syncStatus={cloud.syncStatus}
              source="api"
            />
          )}

          <div className="mb-4 rounded-2xl border border-input bg-card p-4 text-xs text-muted-foreground">
            API mode runs fully in-process using your API keys. Responses are
            generated in turn across 3 rounds.
          </div>

          <ApiModelSelector
            selectedModel1={api.selectedModel1}
            selectedModel2={api.selectedModel2}
            maxRounds={api.maxRounds}
            onModel1Change={api.setSelectedModel1}
            onModel2Change={api.setSelectedModel2}
            onMaxRoundsChange={api.setMaxRounds}
            apiStatus={api.apiStatus}
          />

          <div className="mb-6">
            <RunControls
              topic={api.apiTopic}
              mode={api.apiMode}
              status={api.apiStatus}
              onTopicChange={api.setApiTopic}
              onModeChange={api.setApiMode}
              onStart={api.handleApiStart}
              onStop={api.handleApiStop}
              onMockRound={() => {}}
              showMock={false}
            />
          </div>

          <ErrorBanner
            title="API Errors"
            errors={api.apiProviderErrors}
            onDismiss={() => api.setApiProviderErrors({})}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {api.apiProviders.map((provider) => (
              <AgentPanel
                key={provider}
                provider={provider}
                messages={api.apiMessages}
                isConnected
                isSending={api.apiSendingProviders.includes(provider)}
                error={api.apiProviderErrors[provider]}
                currentRound={
                  api.apiStatus.startsWith("R")
                    ? (parseInt(api.apiStatus[1]) as Round)
                    : null
                }
              />
            ))}
          </div>

          <TranscriptTimeline messages={api.apiMessages} />
        </motion.div>
      )}
    </div>
  );
}

