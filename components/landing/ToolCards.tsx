"use client";

import Link from "next/link";
import { MessageSquare, CheckCircle, PenTool, Brain, ArrowRight } from "lucide-react";

const tools = [
  {
    title: "Agent Communication",
    description: "Multi-model debates with traceable transcripts.",
    icon: MessageSquare,
    href: "/agent",
  },
  {
    title: "Memory",
    description: "Persistent context and preferences across sessions.",
    icon: Brain,
    href: "/memory",
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
    <section id="tools" className="container mx-auto px-4 pt-8 pb-4">
      <h2 className="text-xl font-bold text-foreground mb-5">Core Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              href={tool.href}
              className="group relative rounded-2xl p-5 border border-white/[0.08] dark:border-white/[0.08] border-slate-200/70 bg-white/[0.03] dark:bg-white/[0.03] bg-slate-50/50 backdrop-blur-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-250"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground">{tool.title}</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{tool.description}</p>
              <div className="flex justify-end">
                <span className="inline-flex items-center text-xs font-medium text-primary/70 group-hover:text-primary transition-colors">
                  Open <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
