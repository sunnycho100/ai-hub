"use client";

import { FileText, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemoryCategory } from "@/lib/memory/types";
import {
  MEMORY_CATEGORY_LABELS,
  MEMORY_CATEGORY_DESCRIPTIONS,
} from "@/lib/memory/types";

/** Default .md content when a file hasn't been populated yet */
const DEFAULT_FILE_CONTENT: Record<MemoryCategory, string> = {
  user_profile: `# User Profile

> Identity, expertise, interests, communication style

_Last updated: —_
_Total memories: 0_

---

_No memories recorded yet._

As you interact with AI Hub, your profile will be built automatically — 
capturing your expertise areas, preferred communication style, and identity context.`,

  writing_style: `# Writing Style

> Tone, formatting, verbosity, code style preferences

_Last updated: —_
_Total memories: 0_

---

_No memories recorded yet._

Your writing preferences will be captured from conversations — 
including preferred tone, formatting choices, and code style patterns.`,

  output_satisfaction: `# Output Satisfaction

> What responses the user liked/disliked, revision patterns

_Last updated: —_
_Total memories: 0_

---

_No memories recorded yet._

Satisfaction signals will be tracked automatically — 
what you asked to revise, what you accepted, and quality patterns.`,

  topic_knowledge: `# Topic Knowledge

> Subjects discussed, depth, relationships between topics

_Last updated: —_
_Total memories: 0_

---

_No memories recorded yet._

Topics and knowledge areas will be captured as you discuss them — 
building a knowledge graph of your areas of interest.`,

  session_history: `# Session History

> Condensed summaries of each conversation session

_Last updated: —_
_Total memories: 0_

---

_No sessions recorded yet._

Each conversation session will be summarized and stored here — 
providing context continuity across sessions.`,
};

interface MemoryFileViewerProps {
  activeCategory: MemoryCategory;
  fileContent: string | null;
  fileVersion: number | null;
  fileUpdatedAt: number | null;
  isLoading: boolean;
  onRegenerate: (category: MemoryCategory) => void;
}

export function MemoryFileViewer({
  activeCategory,
  fileContent,
  fileVersion,
  fileUpdatedAt,
  isLoading,
  onRegenerate,
}: MemoryFileViewerProps) {
  const label = MEMORY_CATEGORY_LABELS[activeCategory];
  const description = MEMORY_CATEGORY_DESCRIPTIONS[activeCategory];
  const content =
    fileContent || DEFAULT_FILE_CONTENT[activeCategory];

  // Parse markdown into styled sections
  const lines = content.split("\n");

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted border border-input flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-foreground">
              {label.toLowerCase().replace(/ /g, "_")}.md
            </CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRegenerate(activeCategory)}
          disabled={isLoading}
          className="text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`}
          />
          Regenerate
        </Button>
      </CardHeader>
      <CardContent>
        {/* File content rendered in a code-like block */}
        <div className="rounded-xl border border-input bg-muted/30 p-4 font-mono text-sm max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 py-1">
              <div className="h-3 w-3/4 shimmer-line rounded" />
              <div className="h-3 w-full shimmer-line rounded" style={{ animationDelay: "0.15s" }} />
              <div className="h-3 w-5/6 shimmer-line rounded" style={{ animationDelay: "0.3s" }} />
              <div className="h-1.5" />
              <div className="h-3 w-2/3 shimmer-line rounded" style={{ animationDelay: "0.45s" }} />
              <div className="h-3 w-full shimmer-line rounded" style={{ animationDelay: "0.6s" }} />
              <div className="h-3 w-4/5 shimmer-line rounded" style={{ animationDelay: "0.75s" }} />
            </div>
          ) : (
            lines.map((line, i) => (
              <MarkdownLine key={i} line={line} />
            ))
          )}
        </div>

        {/* File metadata footer */}
        {fileVersion && (
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Version {fileVersion}</span>
            {fileUpdatedAt && (
              <span>
                Updated {new Date(fileUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Simple Markdown Line Renderer ──────────

function MarkdownLine({ line }: { line: string }) {
  // Headers
  if (line.startsWith("# ")) {
    return (
      <h2 className="text-base font-bold text-foreground mt-1 mb-1">
        {line.slice(2)}
      </h2>
    );
  }
  if (line.startsWith("## ")) {
    return (
      <h3 className="text-sm font-semibold text-foreground mt-3 mb-1">
        {line.slice(3)}
      </h3>
    );
  }
  if (line.startsWith("### ")) {
    return (
      <h4 className="text-xs font-semibold text-foreground mt-2 mb-0.5">
        {line.slice(4)}
      </h4>
    );
  }

  // Blockquote
  if (line.startsWith("> ")) {
    return (
      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 my-1">
        {line.slice(2)}
      </p>
    );
  }

  // Italic metadata lines
  if (line.startsWith("_") && line.endsWith("_")) {
    return (
      <p className="text-xs text-muted-foreground/70 italic my-0.5">
        {line.slice(1, -1)}
      </p>
    );
  }

  // Horizontal rule
  if (line === "---") {
    return <hr className="border-border my-2" />;
  }

  // Bullet points with bold
  if (line.startsWith("- **")) {
    const boldEnd = line.indexOf("**", 4);
    if (boldEnd > 0) {
      const boldText = line.slice(4, boldEnd);
      const rest = line.slice(boldEnd + 2);
      return (
        <p className="text-sm text-foreground my-0.5 pl-2">
          <span className="text-muted-foreground mr-1">•</span>
          <span className="font-medium text-foreground">{boldText}</span>
          <span className="text-muted-foreground">{rest}</span>
        </p>
      );
    }
  }

  // Regular bullet
  if (line.startsWith("- ")) {
    return (
      <p className="text-sm text-foreground/80 my-0.5 pl-2">
        <span className="text-muted-foreground mr-1">•</span>
        {line.slice(2)}
      </p>
    );
  }

  // Empty line
  if (line.trim() === "") {
    return <div className="h-1.5" />;
  }

  // Default text
  return (
    <p className="text-sm text-foreground/80 my-0.5 leading-relaxed">
      {line}
    </p>
  );
}
