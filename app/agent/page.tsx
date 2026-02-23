"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useWebSocket } from "@/lib/useWebSocket";
import { Run, RunSource, Round } from "@/lib/types";

import { useRunHistory } from "@/hooks/useRunHistory";
import { useExtensionRun } from "@/hooks/useExtensionRun";
import { useApiRun } from "@/hooks/useApiRun";

import { AgentPageHeader } from "@/components/agent/AgentPageHeader";
import { ModeTabs } from "@/components/agent/ModeTabs";
import { ExtensionModelPicker } from "@/components/agent/ExtensionModelPicker";
import { ApiModelSelector } from "@/components/agent/ApiModelSelector";
import { ErrorBanner } from "@/components/agent/ErrorBanner";
import { ConversationTabs } from "@/components/agent/ConversationTabs";
import { ChatThread } from "@/components/agent/ChatThread";
import { ChatInput } from "@/components/agent/ChatInput";

export default function AgentPage() {
  const { status: wsStatus, send, subscribe } = useWebSocket();
  const [activeTab, setActiveTab] = useState<"extension" | "api">("extension");
  const [configOpen, setConfigOpen] = useState(false);

  const history = useRunHistory();
  const ext = useExtensionRun({
    send,
    subscribe,
    refreshRuns: history.refreshRuns,
    wsStatus,
  });
  const api = useApiRun({ refreshRuns: history.refreshRuns });

  const handleDeleteRun = useCallback(
    (runId: string, source: RunSource) => {
      history.removeRun(runId);
      if (source === "extension") ext.clearCurrentIfId(runId);
      if (source === "api") api.clearCurrentIfId(runId);
    },
    [history, ext, api]
  );

  const handleExtLoadRun = useCallback(
    (run: Run) => {
      ext.loadRun(run);
    },
    [ext]
  );

  const handleApiLoadRun = useCallback(
    (run: Run) => {
      api.loadRun(run);
    },
    [api]
  );

  // Refresh history when a run finishes or updates to keep tabs in sync
  useEffect(() => {
    history.refreshRuns();
  }, [ext.currentRun?.status, api.apiCurrentRun?.status]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* ─── Compact header ─── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <AgentPageHeader
          activeTab={activeTab}
          wsStatus={wsStatus}
          connectedProviders={ext.connectedProviders}
          extensionReady={ext.extensionReady}
        />

        <div className="flex items-center gap-3 flex-wrap">
          <ModeTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <button
            onClick={() => setConfigOpen(!configOpen)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              configOpen
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-card text-muted-foreground border-input hover:text-foreground"
            }`}
          >
            {configOpen ? "Hide Config" : "Config"}
          </button>
        </div>

        {/* Collapsible config panel */}
        {configOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            {activeTab === "extension" ? (
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
            ) : (
              <>
                <div className="mb-3 rounded-xl border border-input bg-card/50 p-3 text-xs text-muted-foreground">
                  API mode uses your API keys. Responses are generated
                  sequentially across rounds.
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
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* ─── Conversation tabs ─── */}
      <div className="flex-shrink-0">
        {activeTab === "extension" ? (
          <ConversationTabs
            runs={history.extensionRuns}
            currentRunId={ext.currentRun?.id ?? null}
            onSelectRun={handleExtLoadRun}
            onNewRun={ext.resetRun}
            onDeleteRun={handleDeleteRun}
            source="extension"
          />
        ) : (
          <ConversationTabs
            runs={history.apiRuns}
            currentRunId={api.apiCurrentRun?.id ?? null}
            onSelectRun={handleApiLoadRun}
            onNewRun={api.resetRun}
            onDeleteRun={handleDeleteRun}
            source="api"
          />
        )}
      </div>

      {/* ─── Error banner ─── */}
      {activeTab === "extension" &&
        Object.keys(ext.providerErrors).length > 0 && (
          <div className="flex-shrink-0 px-4 pt-2">
            <ErrorBanner
              title="Pipeline Errors"
              errors={ext.providerErrors}
              onDismiss={() => ext.setProviderErrors({})}
            />
          </div>
        )}
      {activeTab === "api" &&
        Object.keys(api.apiProviderErrors).length > 0 && (
          <div className="flex-shrink-0 px-4 pt-2">
            <ErrorBanner
              title="API Errors"
              errors={api.apiProviderErrors}
              onDismiss={() => api.setApiProviderErrors({})}
            />
          </div>
        )}

      {/* ─── Chat thread (fills remaining space) ─── */}
      {activeTab === "extension" ? (
        <ChatThread
          messages={ext.messages}
          sendingProviders={ext.sendingProviders}
          activeProviders={ext.activeExtProviders}
          status={ext.runStatus}
        />
      ) : (
        <ChatThread
          messages={api.apiMessages}
          sendingProviders={api.apiSendingProviders}
          activeProviders={api.apiProviders}
          status={api.apiStatus}
        />
      )}

      {/* ─── Chat input (pinned bottom) ─── */}
      <div className="flex-shrink-0">
        {activeTab === "extension" ? (
          <ChatInput
            topic={ext.topic}
            mode={ext.mode}
            status={ext.runStatus}
            onTopicChange={ext.setTopic}
            onModeChange={ext.setMode}
            onStart={ext.handleStart}
            onStop={ext.handleStop}
          />
        ) : (
          <ChatInput
            topic={api.apiTopic}
            mode={api.apiMode}
            status={api.apiStatus}
            onTopicChange={api.setApiTopic}
            onModeChange={api.setApiMode}
            onStart={api.handleApiStart}
            onStop={api.handleApiStop}
          />
        )}
      </div>
    </div>
  );
}
