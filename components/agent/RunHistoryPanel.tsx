import { Run, RunSource } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface RunHistoryPanelProps {
  runs: Run[];
  onLoad: (run: Run) => void;
  onDelete: (runId: string, source: RunSource) => void;
  source: RunSource;
}

export function RunHistoryPanel({
  runs,
  onLoad,
  onDelete,
  source,
}: RunHistoryPanelProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Run History</CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No past runs.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer group"
                onClick={() => onLoad(run)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {run.topic}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {run.mode} · {run.messages.length} messages ·{" "}
                    {new Date(run.createdAt).toLocaleDateString()} ·{" "}
                    {source === "api" ? "API" : "Extension"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      run.status === "DONE"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : run.status === "ERROR"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {run.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(run.id, source);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
