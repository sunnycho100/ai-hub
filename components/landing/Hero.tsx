"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

export function Hero() {
  const scrollToTools = () => {
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />
      <div className="container relative mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-input bg-card backdrop-blur-sm px-3 py-1 text-xs text-muted-foreground">
            shadcn-inspired refresh
          </p>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Multi-model collaboration,
            <span className="block bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
              for your next renovation.
            </span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground md:text-xl">
            Run coordinated debates across ChatGPT, Gemini, and more, with transparent, traceable outputs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/agent"
              className="inline-flex items-center px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm glass-float hover:brightness-110 hover:saturate-150 transition-all active:scale-[0.98]"
            >
              Open Agent Communication
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <button
              onClick={scrollToTools}
              className="inline-flex items-center px-5 py-3 rounded-full bg-muted border border-input text-foreground font-semibold text-sm hover:bg-input transition-all active:scale-[0.98]"
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
                className="rounded-2xl glass-thin glass-rim px-4 py-3.5 glass-interactive"
              >
                <div className="text-xs font-semibold text-muted-foreground tracking-wider mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
