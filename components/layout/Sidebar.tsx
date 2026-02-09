"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-[#0B1020]">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-400 flex items-center justify-center">
            <span className="text-[#0B1020] font-bold text-lg">A</span>
          </div>
          <span className="font-bold text-xl text-white">AI Hub</span>
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
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cyan-400 text-[#0B1020]"
                    : "text-indigo-200 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-indigo-300/60">
          <p className="mb-1">AI Hub v1.0.0</p>
          <p>Powered by Next.js</p>
        </div>
      </div>
    </aside>
  );
}
