"use client";

import Link from "next/link";
import { MessageSquare, CheckCircle, PenTool } from "lucide-react";

const tools = [
  {
    title: "Agent Communication",
    description: "Multi-model debates with traceable transcripts.",
    icon: MessageSquare,
    href: "/agent",
  },
  {
    title: "AI Verifier",
    description: "Claim checks with source-linked reports.",
    icon: CheckCircle,
    href: "/verifier",
  },
  {
    title: "AI Writer",
    description: "Style-conditioned drafting in your voice.",
    icon: PenTool,
    href: "/writer",
  },
];

export function ToolCards() {
  return (
    <section id="tools" className="container mx-auto px-4 py-16">
      <h2 className="text-xl font-bold text-foreground mb-4">Core Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              href={tool.href}
              className="rounded-lg border border-border bg-card p-5 hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-base font-bold text-card-foreground">{tool.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
