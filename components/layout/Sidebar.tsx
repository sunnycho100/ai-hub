"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col glass-thick border-r border-border">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">A</span>
          </div>
          <span className="font-bold text-xl text-foreground">AI Hub</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:scale-[0.98]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-glass-pill"
                    className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/20 shadow-[0_0_12px_rgba(129,140,248,0.15)]"
                    transition={{ type: "spring", mass: 0.6, damping: 28, stiffness: 180 }}
                  />
                )}
                <Icon className="relative h-5 w-5" />
                <span className="relative">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p className="mb-1">AI Hub v1.0.0</p>
          <p>Powered by Next.js</p>
        </div>
      </div>
    </aside>
  );
}
