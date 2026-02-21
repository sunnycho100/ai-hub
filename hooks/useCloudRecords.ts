/**
 * AI Hub – useCloudRecords hook
 *
 * Provides helpers to:
 *   - save a local run to the cloud
 *   - list all cloud records
 *   - check whether a specific record is in the cloud
 *   - remove a record from the cloud
 */

import { useState, useCallback } from "react";
import { Run } from "@/lib/types";

export type CloudSyncStatus = "idle" | "saving" | "saved" | "error";

export function useCloudRecords() {
  const [cloudRecords, setCloudRecords] = useState<Run[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, CloudSyncStatus>>({});

  /** Fetch all records stored in the cloud. */
  const fetchCloudRecords = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/records");
      if (!res.ok) throw new Error("Failed to fetch cloud records");
      const data = await res.json();
      setCloudRecords(data.records ?? []);
    } catch {
      // leave stale data; caller can show an error if needed
    } finally {
      setIsFetching(false);
    }
  }, []);

  /** Save a run to the cloud. */
  const saveToCloud = useCallback(async (run: Run) => {
    setSyncStatus((prev) => ({ ...prev, [run.id]: "saving" }));
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(run),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setCloudRecords((prev) => {
        const without = prev.filter((r) => r.id !== run.id);
        return [data.record, ...without];
      });
      setSyncStatus((prev) => ({ ...prev, [run.id]: "saved" }));
    } catch {
      setSyncStatus((prev) => ({ ...prev, [run.id]: "error" }));
    }
  }, []);

  /** Remove a record from the cloud. */
  const removeFromCloud = useCallback(async (runId: string) => {
    try {
      await fetch(`/api/records?id=${encodeURIComponent(runId)}`, {
        method: "DELETE",
      });
      setCloudRecords((prev) => prev.filter((r) => r.id !== runId));
      setSyncStatus((prev) => {
        const next = { ...prev };
        delete next[runId];
        return next;
      });
    } catch {
      // ignore – UI can retry
    }
  }, []);

  /** Returns true if the given run id is known to be in the cloud. */
  const isInCloud = useCallback(
    (runId: string) => cloudRecords.some((r) => r.id === runId),
    [cloudRecords]
  );

  return {
    cloudRecords,
    isFetching,
    syncStatus,
    fetchCloudRecords,
    saveToCloud,
    removeFromCloud,
    isInCloud,
  };
}
