import { Cloud, Trash2, RefreshCw } from "lucide-react";
import { Run } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CloudRecordsPanelProps {
  records: Run[];
  isFetching: boolean;
  onRefresh: () => void;
  onLoad: (run: Run) => void;
  onDelete: (runId: string) => void;
}

export function CloudRecordsPanel({
  records,
  isFetching,
  onRefresh,
  onLoad,
  onDelete,
}: CloudRecordsPanelProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            Cloud Records
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Checking…" : "Check Cloud"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {isFetching
              ? "Fetching cloud records…"
              : 'No records found in the cloud. Use "Save to Cloud" on any completed run.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {records.map((run) => (
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
                    {run.source === "api" ? "API" : "Extension"} ·{" "}
                    <span className="text-primary">☁ cloud</span>
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
                      onDelete(run.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity"
                    title="Remove from cloud"
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
