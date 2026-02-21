"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { MemoryCategory } from "@/lib/memory/types";
import { useMemory } from "@/hooks/useMemory";

// Extracted components
import { MemoryPageHeader } from "./MemoryPageHeader";
import { MemoryStatCards } from "./MemoryStatCards";
import { MemoryCategoryTabs } from "./MemoryCategoryTabs";
import { MemorySearchPanel } from "./MemorySearchPanel";
import { MemoryFileViewer } from "./MemoryFileViewer";
import { MemoryEmptyState } from "./MemoryEmptyState";

export function MemoryDashboard() {
  const {
    stats,
    files,
    searchResults,
    isLoading,
    isHealthy,
    error,
    checkHealth,
    fetchStats,
    fetchFiles,
    regenerateFile,
    search,
  } = useMemory();

  const [activeTab, setActiveTab] = useState<MemoryCategory>("user_profile");

  // ─── Refresh handler ──────────────────────
  const handleRefresh = () => {
    checkHealth().then((healthy) => {
      if (healthy) {
        fetchStats();
        fetchFiles();
      }
    });
  };

  // ─── States: connecting / disconnected ────
  if (isHealthy === null) {
    return (
      <>
        <MemoryPageHeader
          isHealthy={isHealthy}
          isLoading={isLoading}
          totalMemories={0}
          onRefresh={handleRefresh}
        />
        <MemoryEmptyState variant="connecting" />
      </>
    );
  }

  if (isHealthy === false) {
    return (
      <>
        <MemoryPageHeader
          isHealthy={isHealthy}
          isLoading={isLoading}
          totalMemories={0}
          onRefresh={handleRefresh}
        />
        <MemoryEmptyState variant="disconnected" onRetry={handleRefresh} />
      </>
    );
  }

  // ─── Connected state ──────────────────────
  const totalActive = stats?.totalActive ?? 0;
  const hasMemories = totalActive > 0;

  return (
    <>
      <MemoryPageHeader
        isHealthy={isHealthy}
        isLoading={isLoading}
        totalMemories={totalActive}
        onRefresh={handleRefresh}
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", mass: 0.5, damping: 26, stiffness: 200 }}
        className="flex flex-col gap-6 w-full"
      >
        {/* Stats Overview */}
        <MemoryStatCards
          totalActive={totalActive}
          totalSuperseded={stats?.totalSuperseded ?? 0}
          topicEdgeCount={stats?.topicEdgeCount ?? 0}
          categoriesUsed={
            stats?.byCategory
              ? Object.values(stats.byCategory).filter((v) => v > 0).length
              : 0
          }
          isLoading={isLoading}
        />

        {/* Category Tabs */}
        <MemoryCategoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={stats?.byCategory}
        />

        {/* Empty onboarding when connected but no memories */}
        {!hasMemories && <MemoryEmptyState variant="empty" />}

        {/* File Viewer */}
        <MemoryFileViewer
          activeCategory={activeTab}
          fileContent={files?.[activeTab]?.content ?? null}
          fileVersion={files?.[activeTab]?.version ?? null}
          fileUpdatedAt={files?.[activeTab]?.updatedAt ?? null}
          isLoading={isLoading}
          onRegenerate={regenerateFile}
        />

        {/* Search */}
        <MemorySearchPanel
          searchResults={searchResults}
          isLoading={isLoading}
          onSearch={search}
        />

        {/* Error banner */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            {error}
          </div>
        )}
      </motion.div>
    </>
  );
}
