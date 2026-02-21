"use client";

import Link from "next/link";
import { ArrowLeft, Brain, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MemoryPageHeaderProps {
  isHealthy: boolean | null;
  isLoading: boolean;
  totalMemories: number;
  onRefresh: () => void;
}

export function MemoryPageHeader({
  isHealthy,
  isLoading,
  totalMemories,
  onRefresh,
}: MemoryPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted border border-input flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Memory</h1>
            <p className="text-xs text-muted-foreground">
              Persistent context across conversations
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* DB Health Status */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {isHealthy && (
              <span className="absolute inset-0 rounded-full opacity-40 animate-ping bg-emerald-400" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-300 ${
                isHealthy === true
                  ? "bg-emerald-400 status-dot-connected"
                  : isHealthy === false
                  ? "bg-destructive status-dot-disconnected"
                  : "bg-muted-foreground/30 status-dot-disconnected"
              }`}
            />
          </span>
          <span className="text-xs text-muted-foreground">
            {isHealthy === true
              ? "Connected"
              : isHealthy === false
              ? "Disconnected"
              : "Checking..."}
          </span>
        </div>

        {isHealthy && totalMemories > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
            {totalMemories} memories
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
