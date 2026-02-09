"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B1020]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B1020]/80">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2 text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/" className="flex items-center space-x-2 md:hidden">
            <div className="h-7 w-7 rounded-lg bg-cyan-400 flex items-center justify-center">
              <span className="text-[#0B1020] font-bold">A</span>
            </div>
            <span className="font-bold text-lg text-white">AI Hub</span>
          </Link>

          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-white">
              {pathname === "/" ? "Home" : navItems.find(item => item.href === pathname)?.title || "AI Hub"}
            </h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#0B1020]">
          <nav className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-cyan-400 text-[#0B1020]"
                      : "text-indigo-200 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <div>{item.title}</div>
                    <div className="text-xs opacity-80">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
