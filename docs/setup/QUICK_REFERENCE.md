# Quick Reference - AI Hub

## Essential Commands

### Development
```bash
npm run dev              # Start development server on http://localhost:3000
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint for code quality
```

### Package Management
```bash
npm install              # Install all dependencies
npm install <package>    # Install a new package
npm update              # Update dependencies
```

### Git Commands
```bash
git status              # Check current status
git add .               # Stage all changes
git commit -m "message" # Commit changes
git push                # Push to remote
```

## Application URLs

**Development:**
- Landing: http://localhost:3000
- Agent: http://localhost:3000/agent
- Verifier: http://localhost:3000/verifier
- Writer: http://localhost:3000/writer

**Network (for testing on other devices):**
- Check terminal output for network URL (e.g., http://192.168.0.249:3000)

## File Locations

### Pages
```
app/page.tsx              → /
app/agent/page.tsx        → /agent
app/verifier/page.tsx     → /verifier
app/writer/page.tsx       → /writer
```

### Components
```
components/layout/        → Layout components
components/landing/       → Landing page sections
components/ui/            → Reusable UI components
```

### Configuration
```
package.json             → Dependencies and scripts
tsconfig.json           → TypeScript config
tailwind.config.ts      → Tailwind config
next.config.mjs         → Next.js config
```

### Styles
```
styles/globals.css      → Global styles and theme
```

## Common Tasks

### Add a new page
1. Create folder in `/app` (e.g., `/app/settings`)
2. Create `page.tsx` inside
3. Export default component
4. Navigate to `/settings`

### Add a new component
1. Create file in appropriate folder (e.g., `/components/ui/badge.tsx`)
2. Export component
3. Import and use in pages/components

### Modify navigation
1. Edit `lib/nav.ts`
2. Add/remove/modify navItems array
3. Navigation auto-updates

### Change theme colors
1. Edit `styles/globals.css`
2. Modify CSS custom properties (--variables)
3. Colors auto-update throughout app

### Add a new dependency
```bash
npm install <package-name>
# Example: npm install framer-motion
```

## Keyboard Shortcuts (VSCode)

```
Cmd/Ctrl + P           → Quick file open
Cmd/Ctrl + Shift + P   → Command palette
Cmd/Ctrl + B           → Toggle sidebar
Cmd/Ctrl + `           → Toggle terminal
Cmd/Ctrl + /           → Toggle comment
F2                     → Rename symbol
Cmd/Ctrl + Click       → Go to definition
```

## Browser DevTools

```
Cmd/Ctrl + Shift + I   → Open DevTools
Cmd/Ctrl + Shift + M   → Toggle device toolbar (mobile view)
Cmd/Ctrl + Shift + C   → Inspect element
```

## Testing Checklist

- [ ] Landing page loads
- [ ] All navigation links work
- [ ] URL changes on navigation
- [ ] Browser back button works
- [ ] Mobile menu functions
- [ ] Responsive on different screen sizes
- [ ] All buttons are clickable
- [ ] No console errors

## Troubleshooting

**Server won't start:**
```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill
npm run dev
```

**Styles not updating:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

**Dependencies broken:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
# TypeScript will auto-update config
# Just restart dev server
```

## File Naming Conventions

```
Components:     PascalCase.tsx     (Hero.tsx)
Pages:          page.tsx           (always lowercase)
Utils:          camelCase.ts       (utils.ts)
CSS:            kebab-case.css     (globals.css)
Config:         kebab-case.json    (next.config.mjs)
```

## Import Aliases

```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import "@/styles/globals.css"

// @ = project root
```

## Environment Variables (Future)

Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
DATABASE_URL=postgresql://...
```

Access in code:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

## Deployment Quick Start

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms
```bash
# Build
npm run build

# The 'out' or '.next' folder contains your app
# Upload to your hosting provider
```

## Documentation Files

```
README.md              → Full project documentation
INSTALLATION.md        → Setup and installation guide
BUILD_SUMMARY.md       → What was built and why
VISUAL_GUIDE.md        → Visual design descriptions
PROJECT_STRUCTURE.md   → Complete file tree and explanations
QUICK_REFERENCE.md     → This file (commands and tips)
```

## Next Steps

1. ✅ Frontend complete
2. ⏳ Set up Spring Boot backend
3. ⏳ Set up FastAPI AI service
4. ⏳ Connect frontend to backend
5. ⏳ Implement authentication
6. ⏳ Build tool interfaces
7. ⏳ Add database integration
8. ⏳ Deploy to production

## Support

- Next.js Docs: https://nextjs.org/docs
- Tailwind Docs: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com
- React Query: https://tanstack.com/query

---

**Quick Start**: `npm run dev` → Open http://localhost:3000
**Need Help**: Check documentation files or Next.js docs
**Found a Bug**: Check console for errors, restart dev server
