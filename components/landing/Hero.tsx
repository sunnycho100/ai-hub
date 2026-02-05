"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";

export function Hero() {
  const scrollToTools = () => {
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-4 py-1.5 text-sm">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Now in Beta
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            One workspace for{" "}
            <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              intelligent collaboration
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-lg text-gray-600 md:text-xl">
            AI Hub brings together agent communication, content verification, and style-conditioned writing in a unified, professional workspace.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/agent" className="flex items-center">
                Open Agent Communication
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={scrollToTools}
              className="w-full sm:w-auto"
            >
              View Tools
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Stats or social proof could go here */}
          <div className="mt-16 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">3</div>
              <div className="text-sm text-gray-500">AI Tools</div>
            </div>
            <div>
              <div className="text-3xl font-bold">10+</div>
              <div className="text-sm text-gray-500">AI Models</div>
            </div>
            <div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-gray-500">Traceable</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-gray-200/50 to-gray-300/50 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
