"use client";

import React from "react";
import { motion } from "framer-motion";
import { MemoryDashboard } from "@/components/memory/MemoryDashboard";

export default function MemoryPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 w-full px-2 sm:px-4 py-6"
    >
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <span className="text-3xl">🧠</span> Memory
        </h1>
        <p className="text-sm text-zinc-500">
          AI remembers your preferences, topics, and conversation patterns
          across sessions.
        </p>
      </div>

      {/* Dashboard */}
      <MemoryDashboard />
    </motion.div>
  );
}
