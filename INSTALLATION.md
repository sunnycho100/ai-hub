# AI Hub - Installation Guide

## Quick Start

Follow these steps to run AI Hub locally on your machine.

### Prerequisites

- Node.js 18.x or higher
- npm (comes with Node.js)

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-hub
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm run dev
```

4. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

The application should now be running with:
- Landing page at `/`
- Agent Communication at `/agent`
- AI Verifier at `/verifier`
- AI Writer at `/writer`

### Available Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Routing Behavior

AI Hub uses Next.js App Router with true page navigation:

- Each navigation changes the browser URL
- Browser back/forward buttons work correctly
- Each page is directly accessible via URL
- Routes can be bookmarked and shared

### Mobile Navigation

- **Desktop (≥768px)**: Sidebar navigation visible on the left
- **Mobile (<768px)**: Hamburger menu in the top bar
  - Click the menu icon to reveal navigation
  - Navigation items expand with descriptions
  - Active page is highlighted

### Project Structure

```
ai-hub/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with AppShell
│   ├── page.tsx            # Landing page (/)
│   ├── agent/              # Agent Communication (/agent)
│   ├── verifier/           # AI Verifier (/verifier)
│   └── writer/             # AI Writer (/writer)
├── components/
│   ├── layout/             # Layout components (AppShell, Sidebar, Topbar)
│   ├── landing/            # Landing page sections
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── nav.ts              # Navigation configuration
│   ├── utils.ts            # Utility functions
│   └── providers.tsx       # React Query provider
└── styles/
    └── globals.css         # Global styles and theme
```

### Dependencies Installed

**Core:**
- next@latest (16.x)
- react@latest
- react-dom@latest
- typescript

**Styling:**
- tailwindcss
- tailwindcss-animate
- class-variance-authority
- clsx
- tailwind-merge

**UI:**
- lucide-react (icons)
- @radix-ui/react-slot

**State & Data:**
- @tanstack/react-query
- zod

**Development:**
- eslint
- eslint-config-next
- @types/react
- @types/node
- @types/react-dom

### Troubleshooting

**Issue: Port 3000 is already in use**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill
# Or use a different port
npm run dev -- -p 3001
```

**Issue: Module not found errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: TypeScript errors**
```bash
# TypeScript configuration is auto-updated by Next.js
# Just restart the dev server
```

### Next Steps

1. Explore the landing page and navigation
2. Click through each tool page (Agent, Verifier, Writer)
3. Test mobile responsiveness by resizing your browser
4. Try browser back/forward navigation

### Design System

**Colors:**
- Primary: Dark gray/black for main elements
- Muted: Light gray for backgrounds
- Accent: Subtle hover states

**Typography:**
- Font: Inter (Google Fonts)
- Headings: Bold, tracking-tight
- Body: Regular, readable line height

**Components:**
- Clean, minimal design
- Consistent spacing (Tailwind scale)
- Smooth transitions
- Accessible contrast ratios

### Development Workflow

1. **Making changes**: Edit files in VSCode
2. **Hot reload**: Changes appear automatically in browser
3. **Routing**: Add new pages by creating folders in `/app`
4. **Components**: Create reusable components in `/components`
5. **Styling**: Use Tailwind utility classes

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

Production build optimizations:
- Code splitting
- Image optimization
- CSS minification
- JavaScript minification

---

**Ready to start building?** Run `npm run dev` and open [http://localhost:3000](http://localhost:3000)
