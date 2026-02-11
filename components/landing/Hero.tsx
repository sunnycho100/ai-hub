"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

export function Hero() {
  const scrollToTools = () => {
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-accent/40 to-transparent pointer-events-none" />
      <div className="container relative mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-border/80 bg-card/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            shadcn-inspired refresh
          </p>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Multi-model collaboration,
            <span className="block bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              for your next renovation.
            </span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground md:text-xl">
            Run coordinated debates across ChatGPT, Gemini, and more, with transparent, traceable outputs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/agent"
              className="inline-flex items-center px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 shadow-sm transition-all"
            >
              Open Agent Communication
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <button
              onClick={scrollToTools}
              className="inline-flex items-center px-5 py-3 rounded-xl bg-card border border-input text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 shadow-sm transition-all"
            >
              View Tools
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4">
            {[
              { label: "TOOLS", value: "3" },
              { label: "MODELS", value: "10+" },
              { label: "TRACEABILITY", value: "100%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/80 bg-card/90 px-4 py-3.5 shadow-sm"
              >
                <div className="text-xs font-semibold text-muted-foreground tracking-wider mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-card-foreground">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
