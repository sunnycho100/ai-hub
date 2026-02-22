# AI Hub - Visual Guide

## Screen Descriptions

Since we can't include actual screenshots, here's a detailed description of what each screen looks like.

### 1. Landing Page (/)

**Desktop View (1920x1080):**
- Left sidebar (256px) with dark logo, three navigation items
- Main content area with full-width hero section
- Hero has large gradient heading, subtitle, two buttons
- Three statistics centered below CTAs
- Light gray background section with three tool cards in a grid
- Cards have icons, titles, descriptions, feature lists, and buttons
- Three-column "How it Works" section with numbered steps
- Full-width footer with four columns and separator

**Mobile View (375x667):**
- Top bar with hamburger menu, logo, and Sign In button
- Hero section stacks vertically
- Statistics in 3-column grid (remains)
- Tool cards stack vertically (one per row)
- How it Works steps stack vertically
- Footer columns stack vertically

### 2. Agent Communication Page (/agent)

**Layout:**
- Same sidebar/topbar as landing
- Back button (top left with arrow icon)
- Large page header with MessageSquare icon (64px)
- Page title "Agent Communication" (text-4xl)
- Subtitle in muted gray
- Large "Coming Soon" card with:
  - Sparkles icon and title
  - Description text
  - Bulleted feature list (5 items)
  - Waitlist link at bottom
- Two cards below in grid:
  - Left: Use Cases
  - Right: Supported Models

**Color Scheme:**
- White/light backgrounds
- Dark text (high contrast)
- Primary color for icons
- Border on main card

### 3. AI Verifier Page (/verifier)

**Layout:**
- Same structure as Agent page
- Shield icon instead of MessageSquare
- Verifier-specific features listed
- Two-stage pipeline description
- Use cases and pipeline info in bottom cards

**Visual Elements:**
- Consistent spacing with Agent page
- Same card styles
- Same typography
- Same color palette

### 4. AI Writer Page (/writer)

**Layout:**
- Same structure as Agent and Verifier
- PenTool icon
- Writer-specific features (6 items)
- Writing modes in bottom card
- Use cases in other card

**Consistency:**
- All three tool pages use identical layout
- Only icons, titles, and content differ
- Maintains brand consistency

### Navigation Behavior

**Desktop Navigation:**
1. User clicks "Agent Communication" in sidebar
2. URL changes to /agent
3. Sidebar item highlights (dark background, white text)
4. Page content loads with smooth transition
5. User can click Back button or sidebar link to return

**Mobile Navigation:**
1. User taps hamburger menu
2. Menu slides down/expands
3. Shows all three navigation items with icons
4. Each item shows title + description
5. User taps an item
6. Menu closes
7. Page navigates (URL changes)
8. Active page highlighted in menu

**Browser Navigation:**
1. User navigates to /agent
2. Clicks browser back button
3. Returns to / (landing page)
4. Clicks browser forward button
5. Returns to /agent
6. URL updates reflect navigation

### Responsive Breakpoints

**Desktop (≥768px):**
- Sidebar visible (256px fixed width)
- Topbar shows page title only
- Content uses container max-width
- Grid layouts show multiple columns
- Spacious padding throughout

**Tablet (768px - 1024px):**
- Sidebar visible but narrower
- Some grid items reduce to 2 columns
- Font sizes slightly smaller
- Comfortable touch targets

**Mobile (<768px):**
- Sidebar hidden
- Hamburger menu in topbar
- Single column layouts
- Full-width cards
- Larger touch targets (48px minimum)
- Reduced padding for screen real estate

### Color Palette Reference

**Light Mode (Default):**
```
Background: White (#FFFFFF)
Foreground: Dark gray (#09090B)
Primary: Dark slate (#0F172A)
Muted Background: Light gray (#F8FAFC)
Muted Foreground: Medium gray (#64748B)
Border: Light border (#E2E8F0)
```

**Accent Colors:**
```
Primary CTA: Dark background, white text
Secondary CTA: White background, dark border
Hover states: Subtle gray background
Active state: Primary background
```

### Typography Scale

```
Hero Heading: 60px (3.75rem) - Bold
Page Heading: 36px (2.25rem) - Bold
Section Heading: 30px (1.875rem) - Bold
Card Title: 24px (1.5rem) - Semibold
Body Large: 18px (1.125rem) - Regular
Body: 16px (1rem) - Regular
Small: 14px (0.875rem) - Regular
Tiny: 12px (0.75rem) - Regular
```

### Spacing System

```
Section Padding: 80px (5rem) vertical
Card Padding: 24px (1.5rem)
Button Padding: 10px vertical, 16px horizontal
Grid Gap: 32px (2rem)
Element Margin: 16px (1rem) default
Tight Spacing: 8px (0.5rem)
```

### Animation & Transitions

**Smooth Transitions:**
- Link hover: 150ms ease
- Button hover: 150ms ease
- Card hover: 200ms ease
- Page transitions: Built-in Next.js

**Special Effects:**
- Beta badge pulse: Infinite animation
- Gradient backgrounds: Static
- Shadow on hover: Increases slightly

### Icon Usage

**Navigation Icons:**
- MessageSquare (Agent Communication)
- Shield (AI Verifier)
- PenTool (AI Writer)

**Action Icons:**
- ArrowRight (CTA buttons)
- ChevronDown (Scroll indicator)
- ArrowLeft (Back buttons)
- Menu (Mobile hamburger)

**Feature Icons:**
- CheckCircle2 (Completed steps)
- Search (Search step)
- FileCheck (Verification step)
- Sparkles (Coming soon badge)

**Social Icons:**
- Github (Footer)
- Mail (Footer)

All icons sized at 20px (1.25rem) or 24px (1.5rem)

### Component Patterns

**Card Pattern:**
```
- Rounded corners (8px)
- Subtle border (1px)
- Light shadow
- Padding (24px)
- Hover: Increased shadow
```

**Button Pattern:**
```
Primary:
- Dark background
- White text
- Medium padding
- Rounded (6px)

Outline:
- White background
- Dark border
- Dark text
- Hover: Light gray background
```

**Navigation Item:**
```
- Flex row with icon + text
- Padding (10px 12px)
- Rounded (8px)
- Hover: Gray background
- Active: Primary background + white text
```

### Accessibility Features

- Semantic HTML (header, nav, main, footer, section)
- Proper heading hierarchy (h1 → h2 → h3)
- Alt text ready for images
- Focus states on interactive elements
- Sufficient color contrast (WCAG AA)
- Touch targets ≥48px on mobile
- Keyboard navigation support

### Performance Optimizations

- Next.js automatic code splitting
- Font optimization (Next.js font system)
- Image optimization ready (next/image)
- CSS purging (Tailwind)
- Tree shaking
- Lazy loading of routes

---

**Visual Quality**: Professional, clean, minimal design
**User Experience**: Intuitive navigation, clear hierarchy
**Brand**: Consistent, modern, trustworthy
