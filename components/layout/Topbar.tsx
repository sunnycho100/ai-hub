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
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="flex h-14 items-center px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2 text-foreground hover:bg-accent/70"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/" className="flex items-center space-x-2 md:hidden">
            <div className="h-7 w-7 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold">A</span>
            </div>
            <span className="font-bold text-lg text-foreground">AI Hub</span>
          </Link>

          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-foreground">
              {pathname === "/" ? "Home" : navItems.find(item => item.href === pathname)?.title || "AI Hub"}
            </h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <Button variant="outline" size="sm" className="border-input/80 bg-card/70 text-foreground hover:bg-accent/60">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/80 bg-background/95 backdrop-blur">
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
                    "flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
