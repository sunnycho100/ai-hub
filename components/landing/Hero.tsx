"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

export function Hero() {
  const scrollToTools = () => {
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Main Heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Multi-model collaboration,{" "}
            <span className="text-foreground">
              for your next renovation.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-lg text-muted-foreground md:text-xl">
            Run coordinated debates across ChatGPT, Gemini, and Grok, with transparent, traceable outputs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/agent"
              className="inline-flex items-center px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Open Agent Communication
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <button
              onClick={scrollToTools}
              className="inline-flex items-center px-5 py-3 rounded-lg bg-secondary border border-input text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
            >
              View Tools
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-4">
            {[
              { label: "TOOLS", value: "3" },
              { label: "MODELS", value: "10+" },
              { label: "TRACEABILITY", value: "100%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-card px-4 py-3.5"
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
