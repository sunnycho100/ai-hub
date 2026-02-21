"use client";

import React, { useState } from "react";
import {
  type MemoryCategory,
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  MEMORY_CATEGORY_DESCRIPTIONS,
} from "@/lib/memory/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemory } from "@/hooks/useMemory";

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  writing_style: "text-sky-400",
  output_satisfaction: "text-emerald-400",
  user_profile: "text-violet-400",
  topic_knowledge: "text-amber-400",
  session_history: "text-rose-400",
};

const CATEGORY_BG: Record<MemoryCategory, string> = {
  writing_style: "bg-sky-400/10 border-sky-400/20",
  output_satisfaction: "bg-emerald-400/10 border-emerald-400/20",
  user_profile: "bg-violet-400/10 border-violet-400/20",
  topic_knowledge: "bg-amber-400/10 border-amber-400/20",
  session_history: "bg-rose-400/10 border-rose-400/20",
};

const CATEGORY_ICONS: Record<MemoryCategory, string> = {
  writing_style: "✍️",
  output_satisfaction: "👍",
  user_profile: "👤",
  topic_knowledge: "🧠",
  session_history: "📜",
};

export function MemoryDashboard() {
  const {
    stats,
    files,
    searchResults,
    isLoading,
    isHealthy,
    error,
    fetchStats,
    fetchFiles,
    regenerateFile,
    search,
  } = useMemory();

  const [activeTab, setActiveTab] = useState<MemoryCategory>("writing_style");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      search(searchQuery);
    }
  };

  if (isHealthy === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-zinc-400">
        <div className="text-4xl">🔌</div>
        <h3 className="text-lg font-medium text-zinc-200">
          Database Not Connected
        </h3>
        <p className="text-sm text-center max-w-md">
          The memory system requires PostgreSQL with pgvector.
          <br />
          Run <code className="text-sky-400">psql -f lib/memory/schema.sql</code>{" "}
          to set up the database.
        </p>
      </div>
    );
  }

  if (isHealthy === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-zinc-500">Connecting to memory...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Header Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Memories"
          value={stats?.totalActive ?? 0}
          icon="🧠"
        />
        <StatCard
          label="Superseded"
          value={stats?.totalSuperseded ?? 0}
          icon="📦"
        />
        <StatCard
          label="Topic Links"
          value={stats?.topicEdgeCount ?? 0}
          icon="🔗"
        />
        <StatCard
          label="Categories"
          value={5}
          icon="📂"
        />
      </div>

      {/* Category Breakdown */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <span>📊</span> Memories by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {MEMORY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                  ${activeTab === cat ? CATEGORY_BG[cat] : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"}`}
              >
                <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                <span className={`text-xs font-medium ${CATEGORY_COLORS[cat]}`}>
                  {MEMORY_CATEGORY_LABELS[cat]}
                </span>
                <span className="text-lg font-bold text-zinc-200">
                  {stats?.byCategory?.[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <span>🔍</span> Search Memories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search across all memories..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm
                         text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
              className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-700
                         text-white rounded-lg transition-colors disabled:text-zinc-400"
            >
              {isLoading ? "..." : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.memory.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                >
                  <span className="text-sm shrink-0 mt-0.5">
                    {CATEGORY_ICONS[result.memory.category]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{result.memory.content}</p>
                    <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                      <span className={CATEGORY_COLORS[result.memory.category]}>
                        {MEMORY_CATEGORY_LABELS[result.memory.category]}
                      </span>
                      <span>Score: {(result.finalScore * 100).toFixed(0)}%</span>
                      <span>
                        Conf: {(result.memory.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory File Viewer */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <span>{CATEGORY_ICONS[activeTab]}</span>
            {MEMORY_CATEGORY_LABELS[activeTab]}.md
          </CardTitle>
          <button
            onClick={() => regenerateFile(activeTab)}
            disabled={isLoading}
            className="text-xs px-3 py-1 text-zinc-400 hover:text-zinc-200 bg-zinc-800
                       rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors
                       disabled:opacity-50"
          >
            🔄 Regenerate
          </button>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 font-mono text-sm">
            {files?.[activeTab] ? (
              <pre className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
                {files[activeTab].content}
              </pre>
            ) : (
              <p className="text-zinc-500 italic">No memory file yet.</p>
            )}
          </div>
          {files?.[activeTab] && (
            <div className="flex gap-4 mt-2 text-xs text-zinc-500">
              <span>Version: {files[activeTab].version}</span>
              <span>
                Updated:{" "}
                {new Date(files[activeTab].updatedAt).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-4 flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-zinc-100">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
