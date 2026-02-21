// ─────────────────────────────────────────────
// AI Hub – useMemory React Hook
// ─────────────────────────────────────────────
// Client-side hook for interacting with the memory API.

"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  MemoryCategory,
  LongTermMemory,
  MemorySearchResult,
} from "@/lib/memory/types";

interface MemoryStats {
  totalActive: number;
  byCategory: Record<MemoryCategory, number>;
  totalSuperseded: number;
  topicEdgeCount: number;
}

interface MemoryFile {
  content: string;
  version: number;
  updatedAt: number;
}

export function useMemory() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [memories, setMemories] = useState<LongTermMemory[]>([]);
  const [files, setFiles] = useState<Record<MemoryCategory, MemoryFile> | null>(null);
  const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Health Check ─────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/health");
      const data = await res.json();
      setIsHealthy(data.database === true);
      return data.database === true;
    } catch {
      setIsHealthy(false);
      return false;
    }
  }, []);

  // ─── Stats ────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("[useMemory] fetchStats error:", err);
    }
  }, []);

  // ─── Memory Files ─────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error("[useMemory] fetchFiles error:", err);
    }
  }, []);

  const fetchFile = useCallback(async (category: MemoryCategory) => {
    try {
      const res = await fetch(`/api/memory/files?category=${category}`);
      if (res.ok) {
        return (await res.json()) as MemoryFile;
      }
    } catch (err) {
      console.error("[useMemory] fetchFile error:", err);
    }
    return null;
  }, []);

  const regenerateFile = useCallback(
    async (category?: MemoryCategory) => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/memory/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        if (res.ok) {
          await fetchFiles(); // refresh
        }
      } catch (err) {
        setError("Failed to regenerate memory file");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchFiles]
  );

  // ─── Search ───────────────────────────────
  const search = useCallback(
    async (
      query: string,
      options?: { categories?: MemoryCategory[]; limit?: number }
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/memory/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            categories: options?.categories,
            limit: options?.limit,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          return data as MemorySearchResult[];
        }
      } catch (err) {
        setError("Search failed");
      } finally {
        setIsLoading(false);
      }
      return [];
    },
    []
  );

  // ─── Delete Memory ────────────────────────
  const deleteMemory = useCallback(
    async (id: string) => {
      // Use search endpoint with DELETE method isn't available,
      // so we'll use a direct approach through the consolidation endpoint.
      // For now, refresh stats after any mutation.
      await fetchStats();
    },
    [fetchStats]
  );

  // ─── Initial Load ─────────────────────────
  useEffect(() => {
    checkHealth().then((healthy) => {
      if (healthy) {
        fetchStats();
        fetchFiles();
      }
    });
  }, [checkHealth, fetchStats, fetchFiles]);

  return {
    // State
    stats,
    files,
    searchResults,
    isLoading,
    isHealthy,
    error,

    // Actions
    checkHealth,
    fetchStats,
    fetchFiles,
    fetchFile,
    regenerateFile,
    search,
    deleteMemory,
  };
}
