# AI Hub – Design System & Animation Reference

A portable guide to the glassmorphism visual language, spring-physics page transitions, and micro-animations used throughout AI Hub. Copy the relevant tokens, CSS, and Framer Motion configs into any Next.js / Tailwind / Framer Motion project.

---

## Table of Contents

1. [Design Tokens (CSS Custom Properties)](#1-design-tokens)
2. [Mesh Gradient Background](#2-mesh-gradient-background)
3. [Glassmorphism Surfaces](#3-glassmorphism-surfaces)
4. [Liquid Spring Page Transitions (Framer Motion)](#4-liquid-spring-page-transitions)
5. [Stagger Entrance Animation](#5-stagger-entrance-animation)
6. [Shimmer / Skeleton Loading](#6-shimmer--skeleton-loading)
7. [Status Pulse Indicators](#7-status-pulse-indicators)
8. [Message Entry Animation](#8-message-entry-animation)
9. [Interactive States](#9-interactive-states)
10. [Chromatic Shimmer (Text)](#10-chromatic-shimmer)
11. [Component Patterns](#11-component-patterns)
12. [Dependencies](#12-dependencies)

---

## 1. Design Tokens

All colors are stored as CSS custom properties on `:root` (via `@theme`) with `.dark` overrides. This is the single source of truth for the entire palette.

### Light Mode (default)

```css
@theme {
  --color-background: #f0f2f8;
  --color-foreground: #1a1d2e;

  --color-card:              rgba(255, 255, 255, 0.6);
  --color-primary:           #6366f1;          /* indigo-500 */
  --color-primary-foreground:#ffffff;
  --color-muted-foreground:  #64748b;
  --color-border:            rgba(0, 0, 0, 0.08);
  --color-ring:              rgba(99, 102, 241, 0.5);
  --radius:                  1rem;

  /* Glass tokens */
  --glass-thick-bg:    rgba(255, 255, 255, 0.55);
  --glass-thin-bg:     rgba(255, 255, 255, 0.4);
  --glass-border:      rgba(0, 0, 0, 0.08);
  --glass-rim-top:     rgba(255, 255, 255, 0.9);
  --glass-rim-bottom:  rgba(0, 0, 0, 0.04);
  --glass-inner-glow:  rgba(255, 255, 255, 0.5);
  --glass-shadow:      rgba(0, 0, 0, 0.06);
}
```

### Dark Mode

```css
.dark {
  --color-background: #0a0e1a;
  --color-foreground: #f0f2f8;
  --color-card:       rgba(255, 255, 255, 0.05);
  --color-primary:    #818cf8;               /* indigo-400 */
  --color-border:     rgba(255, 255, 255, 0.08);

  /* Glass tokens */
  --glass-thick-bg:   rgba(255, 255, 255, 0.06);
  --glass-thin-bg:    rgba(255, 255, 255, 0.04);
  --glass-border:     rgba(255, 255, 255, 0.1);
  --glass-rim-top:    rgba(255, 255, 255, 0.2);
  --glass-rim-bottom: rgba(255, 255, 255, 0.02);
  --glass-inner-glow: rgba(255, 255, 255, 0.06);
  --glass-shadow:     rgba(0, 0, 0, 0.25);
}
```

**Key idea:** Light mode uses white-alpha layers over a pastel base; dark mode inverts to white-alpha-on-near-black. Glass shimmer intensity is higher in dark mode to compensate for lower contrast.

---

## 2. Mesh Gradient Background

A layered `radial-gradient` stack that produces a soft, multi-color ambient backdrop behind all glass surfaces.

```css
.mesh-gradient {
  background:
    radial-gradient(ellipse 80% 60% at 10% 20%, rgba(99,102,241,0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 15%, rgba(56,189,248,0.05) 0%, transparent 55%),
    radial-gradient(ellipse 70% 60% at 50% 80%, rgba(139,92,246,0.05) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 75% 60%, rgba(20,184,166,0.04) 0%, transparent 50%),
    linear-gradient(160deg, #f0f2f8 0%, #e8eaf4 30%, #eef0f8 60%, #f0f2f8 100%);
}

/* Dark variant — higher alpha values for visibility */
.dark .mesh-gradient {
  background:
    radial-gradient(ellipse 80% 60% at 10% 20%, rgba(99,102,241,0.18) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 15%, rgba(56,189,248,0.12) 0%, transparent 55%),
    radial-gradient(ellipse 70% 60% at 50% 80%, rgba(139,92,246,0.14) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 75% 60%, rgba(20,184,166,0.08) 0%, transparent 50%),
    linear-gradient(160deg, #0a0e1a 0%, #0f1629 30%, #0c1220 60%, #0a0e1a 100%);
}
```

Apply to the root container: `<div className="mesh-gradient h-screen">`.

---

## 3. Glassmorphism Surfaces

Three tiers of glass, each increasing in frosted-ness:

### `.glass-thick` — Primary panels (sidebars, topbar)

```css
.glass-thick {
  background: var(--glass-thick-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid transparent;
  border-image: linear-gradient(135deg,
    var(--glass-rim-top) 0%, var(--glass-rim-bottom) 100%) 1;
  box-shadow:
    inset 0 1px 1px 0 var(--glass-inner-glow),
    0 8px 32px var(--glass-shadow);
}
```

### `.glass-thin` — Content cards, panels

```css
.glass-thin {
  background: var(--glass-thin-bg);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  box-shadow:
    inset 0 1px 1px 0 var(--glass-inner-glow),
    0 4px 24px rgba(0, 0, 0, 0.15);
}
```

### `.glass-rim` — Gradient-border for rounded elements

`border-image` doesn't work with `border-radius`, so we use a pseudo-element mask trick:

```css
.glass-rim {
  border: 1px solid var(--glass-border);
  position: relative;
}

.glass-rim::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg,
    var(--glass-rim-top) 0%, var(--glass-rim-bottom) 100%);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### `.glass-float` — Floating pill buttons

```css
.glass-float {
  box-shadow:
    0 4px 30px var(--glass-shadow),
    inset 0 1px 1px 0 var(--glass-inner-glow);
}
```

### How they compose (Card component example)

```tsx
// Every <Card> automatically gets glass-thin + glass-rim
<div className="rounded-2xl glass-thin glass-rim text-card-foreground">
  {children}
</div>
```

---

## 4. Liquid Spring Page Transitions

The signature "sluggish" feel comes from heavy spring physics via **Framer Motion**. Pages feel like they have physical mass sliding through dense liquid.

### Spring configurations

```ts
import type { Transition } from "framer-motion";

// Primary — heavy and slow (container / page level)
export const liquidSpring: Transition = {
  type: "spring",
  mass: 1.2,       // heavier than default (1.0)
  damping: 30,     // moderate resistance
  stiffness: 80,   // low stiffness = slow, viscous movement
};

// Children — still heavy but snappier
export const childSpring: Transition = {
  type: "spring",
  mass: 0.8,
  damping: 30,
  stiffness: 105,
};

// Exit — deterministic tween (springs have no guaranteed end time)
const exitTween: Transition = {
  type: "tween",
  duration: 0.18,
  ease: [0.4, 0, 1, 1],  // ease-in, quick vanish
};
```

### Page-level variant

```ts
import type { Variants } from "framer-motion";

export const liquidPageVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1, scale: 1, y: 0,
    transition: liquidSpring,
  },
};
```

### Usage — `LiquidTabWrapper` component

Wraps each route's content. On navigation the old page unmounts instantly; the new page scales up from 95% with the heavy spring.

```tsx
"use client";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { liquidSpring } from "@/lib/liquidTransitions";

export function LiquidTabWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}                           // re-mount on route change
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={liquidSpring}
      className="liquid-page-transition"
    >
      {children}
    </motion.div>
  );
}
```

```css
.liquid-page-transition {
  will-change: transform, opacity;
  transform-origin: center top;
}
```

### Landing page — zoom-out reveal

The landing page uses reversing spring (scale *down* from 1.06) so it feels like "surfacing" back to the hub:

```ts
const landingReveal = {
  initial: { opacity: 0, scale: 1.06, y: -20 },
  animate: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring", mass: 0.9, damping: 28, stiffness: 90 },
  },
};
```

---

## 5. Stagger Entrance Animation

Groups of cards/panels enter one after another with micro-parallax — each child slightly delayed for a cascade effect.

### Variants

```ts
export const liquidStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.035,    // 35ms between each child
      delayChildren: 0.015,      // 15ms before first child
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,      // reverse on exit
    },
  },
};

export const liquidStaggerChild: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: childSpring,
  },
  exit: {
    opacity: 0, y: -8, scale: 0.99,
    transition: { type: "tween", duration: 0.14, ease: [0.4, 0, 1, 1] },
  },
};
```

### React components

```tsx
"use client";
import { motion } from "framer-motion";
import { liquidStaggerContainer, liquidStaggerChild } from "@/lib/liquidTransitions";

export function LiquidStagger({ children, className }) {
  return (
    <motion.div
      variants={liquidStaggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LiquidStaggerItem({ children, className }) {
  return (
    <motion.div variants={liquidStaggerChild} className={className}>
      {children}
    </motion.div>
  );
}
```

Usage:
```tsx
<LiquidStagger className="grid grid-cols-3 gap-4">
  <LiquidStaggerItem><Card>…</Card></LiquidStaggerItem>
  <LiquidStaggerItem><Card>…</Card></LiquidStaggerItem>
  <LiquidStaggerItem><Card>…</Card></LiquidStaggerItem>
</LiquidStagger>
```

---

## 6. Shimmer / Skeleton Loading

A horizontally-sweeping gradient used for placeholder/skeleton states while data loads.

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

/* Neutral shimmer */
.shimmer-line {
  background: linear-gradient(90deg,
    rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.8s ease-in-out infinite;
  border-radius: 4px;
}

.dark .shimmer-line {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 800px 100%;
}
```

### Colored variants

The same keyframes power tinted shimmers for provider-specific loading states:

| Class                | Accent color              | Use case             |
|----------------------|---------------------------|----------------------|
| `.shimmer-line`      | neutral gray              | generic skeleton     |
| `.shimmer-line-green`| `rgba(16,185,129, …)`    | success / connected  |
| `.shimmer-line-blue` | `rgba(139,92,246, …)`    | AI thinking / violet |
| `.shimmer-line-orange`| `rgba(249,115,22, …)`   | warning / pending    |

Each follows the same pattern — swap the middle gradient stop color.

---

## 7. Status Pulse Indicators

Animated dots for connection / readiness state.

```css
/* Connected — rhythmic glow */
@keyframes status-pulse {
  0%, 100% { opacity: 1;    box-shadow: 0 0 0 0 currentColor; }
  50%      { opacity: 0.85; box-shadow: 0 0 8px 2px currentColor; }
}

/* Disconnected — slow fade */
@keyframes status-fade {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.2; }
}

.status-dot-connected    { animation: status-pulse 2s ease-in-out infinite; }
.status-dot-disconnected { animation: status-fade  3s ease-in-out infinite; }
```

### Layered ping effect (Tailwind)

For the "connected" dot, we layer an outer `animate-ping` ring behind the solid dot:

```tsx
<span className="relative flex h-2.5 w-2.5">
  {/* Outer ring — Tailwind animate-ping */}
  <span className="absolute inset-0 rounded-full bg-green-400 opacity-40 animate-ping" />
  {/* Inner solid dot — custom status-pulse */}
  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500
    status-dot-connected text-green-500/40" />
</span>
```

---

## 8. Message Entry Animation

Transcript messages slide up as they arrive, with staggered delay per index:

```css
@keyframes message-enter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.message-enter {
  animation: message-enter 0.3s ease-out both;
}
```

Apply with progressive delay:

```tsx
{messages.map((msg, idx) => (
  <div
    className="message-enter"
    style={{ animationDelay: `${idx * 60}ms` }}
  >
    …
  </div>
))}
```

---

## 9. Interactive States

### Glass hover & press

```css
.glass-interactive {
  transition: all 0.25s ease;
}

.glass-interactive:hover {
  backdrop-filter: blur(16px) saturate(200%) brightness(1.04);
  background: var(--color-accent);
}

.dark .glass-interactive:hover {
  backdrop-filter: blur(16px) saturate(200%) brightness(1.15);
  background: rgba(255, 255, 255, 0.08);
}

.glass-interactive:active {
  transform: scale(0.98);
}
```

### Button press feedback

All buttons include `active:scale-[0.98]` for tactile press feedback via Tailwind.

### Tool card hover lift

Cards on the landing page "lift" on hover:

```tsx
className="hover:-translate-y-1 hover:border-primary/40
  hover:shadow-lg hover:shadow-primary/5 transition-all duration-250"
```

### Sidebar active pill (layout animation)

Active nav item uses Framer Motion `layoutId` for a smooth sliding pill:

```tsx
{isActive && (
  <motion.div
    layoutId="sidebar-glass-pill"
    className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/20
      shadow-[0_0_12px_rgba(129,140,248,0.15)]"
    transition={{ type: "spring", mass: 0.6, damping: 28, stiffness: 180 }}
  />
)}
```

---

## 10. Chromatic Shimmer

A subtle RGB-split text shadow that appears during page exit transitions — mimics chromatic aberration on glass:

```ts
export const chromaticShimmer: Variants = {
  initial: { textShadow: "0 0 0 transparent, 0 0 0 transparent" },
  animate: {
    textShadow: "0 0 0 transparent, 0 0 0 transparent",
    transition: { delay: 0.3, duration: 0.4 },
  },
  exit: {
    textShadow:
      "-0.5px 0 1px rgba(99,102,241,0.3), 0.5px 0 1px rgba(56,189,248,0.3)",
    transition: { duration: 0.15 },
  },
};
```

CSS utility class for static use:

```css
.liquid-chromatic-active {
  text-shadow:
    -0.5px 0 1px rgba(99,102,241,0.25),
     0.5px 0 1px rgba(56,189,248,0.25);
}
```

---

## 11. Component Patterns

### Theme toggle (dark/light)

Stored in `localStorage` under key `"ai-hub-theme"`, synced to `<html class="dark">`:

```tsx
const [theme, setTheme] = useState<"light" | "dark">("dark");

useEffect(() => {
  const root = document.documentElement;
  theme === "dark" ? root.classList.add("dark") : root.classList.remove("dark");
  localStorage.setItem("ai-hub-theme", theme);
}, [theme]);
```

### Scrollbar styling

Thin, transparent-tracked scrollbars that match the glass aesthetic:

```css
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: rgba(0,0,0,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.18); }

.dark ::-webkit-scrollbar-thumb       { background: rgba(255,255,255,0.1); }
.dark ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
```

### Provider color badges

Consistent color tokens per AI provider:

```ts
const PROVIDER_BADGE = {
  chatgpt: "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20",
  gemini:  "bg-violet-400/10  text-violet-400  border border-violet-400/20",
  claude:  "bg-orange-400/10  text-orange-400  border border-orange-400/20",
};
```

### Stat cards (Hero section)

Mini glass panels on the landing page:

```tsx
<div className="rounded-2xl bg-white/[0.04] backdrop-blur-md
  border border-white/[0.08] px-4 py-3 shadow-sm">
  <div className="text-[10px] font-semibold tracking-widest text-slate-500">LABEL</div>
  <div className="text-2xl font-bold text-foreground">VALUE</div>
</div>
```

---

## 12. Dependencies

| Package              | Version  | Purpose                                      |
|----------------------|----------|----------------------------------------------|
| `framer-motion`      | ^11.x    | Spring physics, layout animations, variants  |
| `tailwindcss`        | ^4.x     | Utility classes, `@theme` custom properties  |
| `class-variance-authority` | ^0.7 | Button variant composition                 |
| `@radix-ui/react-slot` | ^1.x  | Polymorphic component forwarding             |
| `lucide-react`       | ^0.4     | Icon library                                 |
| `next`               | ^15.x   | App Router, `usePathname`                    |

---

## Quick-Start Checklist

1. **Copy** the `@theme` block and `.dark` overrides into your `globals.css`.
2. **Add** `.mesh-gradient`, `.glass-thick`, `.glass-thin`, `.glass-rim`, `.glass-float` classes.
3. **Add** the `@keyframes` blocks (shimmer, status-pulse, status-fade, message-enter).
4. **Copy** `liquidTransitions.ts` for the Framer Motion spring configs.
5. **Wrap** your layout with `<LiquidTabWrapper>` and card groups with `<LiquidStagger>`.
6. **Apply** `mesh-gradient` to your root layout container.
7. **Use** `glass-thin glass-rim rounded-2xl` on any card surface.
