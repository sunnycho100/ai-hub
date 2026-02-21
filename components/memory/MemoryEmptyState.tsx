"use client";

import { Database, Terminal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MemoryEmptyStateProps {
  variant: "disconnected" | "connecting" | "empty";
  onRetry?: () => void;
}

export function MemoryEmptyState({ variant, onRetry }: MemoryEmptyStateProps) {
  if (variant === "connecting") {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted border border-input flex items-center justify-center">
            <Database className="h-5 w-5 text-muted-foreground animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">
            Connecting to memory database...
          </p>
        </div>
      </div>
    );
  }

  if (variant === "disconnected") {
    return (
      <Card className="my-8">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-muted border border-input flex items-center justify-center">
            <Database className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Database Not Connected
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The memory system requires PostgreSQL with the pgvector extension.
              Once connected, AI Hub will remember your preferences, topics, and
              patterns across sessions.
            </p>
          </div>

          <div className="w-full max-w-lg rounded-xl border border-input bg-muted/30 p-4 text-left">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              Quick Setup
            </p>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground select-none">1.</span>
                <code className="text-foreground/80">
                  createdb ai_hub_memory
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground select-none">2.</span>
                <code className="text-foreground/80">
                  psql -d ai_hub_memory -c &quot;CREATE EXTENSION vector&quot;
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground select-none">3.</span>
                <code className="text-foreground/80">npm run db:setup</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground select-none">4.</span>
                <span className="text-foreground/80">
                  Add <code className="text-primary">PGHOST</code>,{" "}
                  <code className="text-primary">PGDATABASE</code>, etc. to{" "}
                  <code className="text-primary">.env.local</code>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry Connection
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <a
                href="https://github.com/pgvector/pgvector"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                pgvector docs
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // variant === "empty" — Connected but no memories yet
  return (
    <Card className="my-4">
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Database className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Memory System Active
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Your database is connected and ready. Memories will be captured
            automatically as you use Agent Communication — preferences, topics,
            and patterns will be stored across sessions.
          </p>
        </div>

        <div className="w-full max-w-lg">
          <p className="text-xs font-semibold text-foreground mb-3">
            Memory files that will be created:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                file: "user_profile.md",
                desc: "Identity & expertise",
              },
              {
                file: "writing_style.md",
                desc: "Tone & formatting prefs",
              },
              {
                file: "output_satisfaction.md",
                desc: "Quality feedback signals",
              },
              {
                file: "topic_knowledge.md",
                desc: "Subjects & relationships",
              },
              {
                file: "session_history.md",
                desc: "Session summaries",
              },
            ].map((item) => (
              <div
                key={item.file}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-input text-left"
              >
                <span className="text-xs font-mono text-primary">
                  {item.file}
                </span>
                <span className="text-xs text-muted-foreground">
                  — {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Start a conversation in{" "}
          <a href="/agent" className="text-primary hover:underline">
            Agent Communication
          </a>{" "}
          to begin building memory.
        </p>
      </CardContent>
    </Card>
  );
}
