import { useState, useEffect, useCallback } from "react";
import { Run } from "@/lib/types";
import { loadRuns, deleteRun as storeDeleteRun } from "@/lib/store";

export function useRunHistory() {
  const [extensionRuns, setExtensionRuns] = useState<Run[]>([]);
  const [apiRuns, setApiRuns] = useState<Run[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showApiHistory, setShowApiHistory] = useState(false);

  const refreshRuns = useCallback(() => {
    const all = loadRuns();
    setExtensionRuns(
      all.filter((r) => (r.source ?? "extension") === "extension")
    );
    setApiRuns(all.filter((r) => r.source === "api"));
  }, []);

  useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  const removeRun = useCallback(
    (runId: string) => {
      storeDeleteRun(runId);
      refreshRuns();
    },
    [refreshRuns]
  );

  return {
    extensionRuns,
    apiRuns,
    showHistory,
    showApiHistory,
    setShowHistory,
    setShowApiHistory,
    refreshRuns,
    removeRun,
  };
}
