"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemoryCategory, MemorySearchResult } from "@/lib/memory/types";
import { MEMORY_CATEGORY_LABELS, MEMORY_CATEGORY_ACCENTS } from "@/lib/memory/types";
import {
  Pen,
  ThumbsUp,
  User,
  BookOpen,
  Clock,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICON: Record<MemoryCategory, LucideIcon> = {
  user_profile: User,
  writing_style: Pen,
  output_satisfaction: ThumbsUp,
  topic_knowledge: BookOpen,
  session_history: Clock,
};

interface MemorySearchPanelProps {
  searchResults: MemorySearchResult[];
  isLoading: boolean;
  onSearch: (query: string) => void;
}

export function MemorySearchPanel({
  searchResults,
  isLoading,
  onSearch,
}: MemorySearchPanelProps) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          Search Memories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search across all memories..."
            className="flex-1 rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-shadow duration-200"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? "..." : "Search"}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((result, idx) => {
              const Icon = CATEGORY_ICON[result.memory.category];
              return (
                <div
                  key={result.memory.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-input message-enter"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="h-7 w-7 rounded-lg bg-muted border border-input flex items-center justify-center shrink-0 mt-0.5">
                    <Icon
                      className={`h-3.5 w-3.5 ${MEMORY_CATEGORY_ACCENTS[result.memory.category]}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">
                      {result.memory.content}
                    </p>
                    <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className={MEMORY_CATEGORY_ACCENTS[result.memory.category]}>
                        {MEMORY_CATEGORY_LABELS[result.memory.category]}
                      </span>
                      <span>
                        Score: {(result.finalScore * 100).toFixed(0)}%
                      </span>
                      <span>
                        Conf: {(result.memory.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {searchResults.length === 0 && query && !isLoading && (
          <p className="mt-4 text-sm text-muted-foreground/60 italic text-center py-4">
            No matching memories found
          </p>
        )}
      </CardContent>
    </Card>
  );
}
