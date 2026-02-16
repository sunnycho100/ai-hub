# Code Breakdown Plan

> **Goal**: Reduce complexity and improve maintainability by extracting hooks, sub-components, and utilities from oversized files.
> **Status**: 📋 Planning — review before execution.

---

## File Size Survey (lines of code)

| File | Lines | Verdict |
|------|------:|---------|
| `app/agent/page.tsx` | **1,065** | 🔴 Must split |
| `extension/providers/gemini.js` | 767 | ⚠️ Extension — separate concern |
| `extension/providers/chatgpt.js` | 653 | ⚠️ Extension — separate concern |
| `extension/providers/claude.js` | 576 | ⚠️ Extension — separate concern |
| `extension/providers/grok.js` | 500 | ⚠️ Extension — separate concern |
| `styles/globals.css` | 364 | 🟡 Could split into partials |
| `app/api/agent-api/route.ts` | 191 | 🟢 Fine |
| `components/agent/RunControls.tsx` | 173 | 🟢 Fine |
| `components/agent/AgentPanel.tsx` | 158 | 🟢 Fine |
| `lib/types.ts` | 164 | 🟢 Clean & well-organized |
| `lib/prompts.ts` | 132 | 🟢 Clean & focused |
| `lib/store.ts` | 96 | 🟢 Clean |
| Everything else | < 120 | 🟢 Fine |

**Primary target**: `app/agent/page.tsx` (1,065 lines — 3–4× recommended size).
Extension scripts are a separate concern and not in scope here.

---

## Breakdown: `app/agent/page.tsx`

### Current Structure (by line range)

```
  1 – 38    Imports (8 components, 14+ types, store, prompts)
 40 – 60    generateMockResponse() utility
 63 – 98    ~20 useState declarations (extension mode + API mode)
100 – 130   Refs (runRef, apiRunRef, etc.) + refreshRuns + mount effect
131 – 200   WebSocket listener effect (HELLO_PROVIDER, PROMPT_SENT, NEW_MESSAGE, ERROR, PING_ACK)
202 – 250   checkRoundCompletion / advanceToRound callbacks
252 – 310   handleStart, handleStop (extension run logic)
310 – 375   handleMockRun (mock run with setTimeout cascade)
377 – 410   handleLoadRun, handleDeleteRun, handleNewRun (extension history)
412 – 540   API mode handlers (handleApiNewRun, handleApiLoadRun, handleApiStop, handleApiStart)
549 – 1066  JSX return (~517 lines of markup)
```

### Extraction Plan

#### Phase 1 — Custom Hooks (logic extraction)

##### 1.1 `hooks/useExtensionRun.ts` (~200 lines)
Extract all **extension-mode** state and logic:
- State: `selectedProviders`, `mode`, `rounds`, `currentRound`, `roundMessages`, `messages`, `status`, `error`, `activeTab`
- Refs: `runRef`, `runProvidersRef`
- Callbacks: `handleStart`, `handleStop`, `checkRoundCompletion`, `advanceToRound`
- WebSocket listener effect (subscribe to HELLO_PROVIDER, PROMPT_SENT, NEW_MESSAGE, ERROR, PING_ACK)
- Returns: all state values + handlers for the UI to consume

##### 1.2 `hooks/useApiRun.ts` (~150 lines)
Extract all **API-mode** state and logic:
- State: `apiProvider`, `apiTopic`, `apiMode`, `apiRounds`, `apiStatus`, `apiMessages`, `apiError`
- Refs: `apiRunRef`, `apiCancelledRef`, `apiAbortRef`
- Callbacks: `handleApiStart`, `handleApiStop`
- The fetch loop with abort controller logic
- Returns: all state values + handlers

##### 1.3 `hooks/useRunHistory.ts` (~60 lines)
Extract **run history** management (shared by both modes):
- State: `runs`, `activeRunId`, `showHistory`
- Callbacks: `refreshRuns`, `handleLoadRun`, `handleDeleteRun`, `handleNewRun`, `handleApiLoadRun`, `handleApiNewRun`
- Mount effect that loads runs from localStorage
- Returns: runs list + active run + crud handlers

##### 1.4 Move `generateMockResponse()` → `lib/mock.ts` (~25 lines)
Pure utility — no reason to live inside a React component file.

#### Phase 2 — UI Sub-Components (JSX extraction)

##### 2.1 `components/agent/AgentPageHeader.tsx` (~40 lines)
Extract the top bar:
- Back button → `/`
- Page title + subtitle
- Connection status indicator
- History toggle button

##### 2.2 `components/agent/ModeTabs.tsx` (~30 lines)
Extract the Extension / API tab switcher:
- Two tab buttons
- Active tab highlighting
- `onTabChange` callback

##### 2.3 `components/agent/RunHistoryPanel.tsx` (~80 lines)
**Deduplicate** the two nearly identical history panels (extension + API):
- Currently duplicated side-by-side (~50 lines each)
- Single component accepting: `runs`, `activeRunId`, `onLoad`, `onDelete`, `onNew`, `mode`
- Shared glass card styling, run list rendering, new-run button

##### 2.4 `components/agent/ExtensionModelPicker.tsx` (~80 lines)
Extract the extension-mode model selection grid:
- Provider checkboxes (ChatGPT, Gemini, Claude, Grok)
- Launch tabs (debate vs collaborate)
- Rounds selector
- Provider accent color maps

##### 2.5 `components/agent/ApiModelSelector.tsx` (~60 lines)
Extract the API-mode model configuration card:
- Provider dropdown
- Mode dropdown (Debate / Collaborate)
- Rounds dropdown
- Topic input

##### 2.6 `components/agent/ErrorBanner.tsx` (~15 lines)
**Deduplicate** the two identical error banners (extension + API):
- Currently duplicated
- Single component: `error: string | null`

#### Phase 3 — Cleanup

After extraction, `app/agent/page.tsx` will become a **thin orchestrator** (~150–200 lines):

```tsx
export default function AgentPage() {
  const { status, send, subscribe } = useWebSocket();
  const history = useRunHistory();
  const ext = useExtensionRun({ send, subscribe, history });
  const api = useApiRun({ history });
  const [tab, setTab] = useState<"extension" | "api">("extension");

  return (
    <div>
      <AgentPageHeader status={status} ... />
      <ModeTabs tab={tab} onChange={setTab} />
      {tab === "extension" ? (
        <>
          <RunHistoryPanel ... />
          <ExtensionModelPicker ... />
          <RunControls ... />
          <ErrorBanner error={ext.error} />
          {/* Agent panels + transcript */}
        </>
      ) : (
        <>
          <RunHistoryPanel ... />
          <ApiModelSelector ... />
          <RunControls ... />
          <ErrorBanner error={api.error} />
          {/* Agent panels + transcript */}
        </>
      )}
    </div>
  );
}
```

---

## New File Tree (after breakdown)

```
app/agent/
  page.tsx             ← ~150–200 lines (down from 1,065)

hooks/
  useExtensionRun.ts   ← ~200 lines (new)
  useApiRun.ts         ← ~150 lines (new)
  useRunHistory.ts     ← ~60 lines (new)

lib/
  mock.ts              ← ~25 lines (moved from page.tsx)

components/agent/
  AgentPageHeader.tsx   ← ~40 lines (new)
  AgentPanel.tsx        ← 158 lines (existing, unchanged)
  ApiModelSelector.tsx  ← ~60 lines (new)
  ConnectionStatus.tsx  ← existing, unchanged
  ErrorBanner.tsx       ← ~15 lines (new)
  ExtensionModelPicker.tsx ← ~80 lines (new)
  ModeTabs.tsx          ← ~30 lines (new)
  ProviderIcon.tsx      ← existing, unchanged
  RunControls.tsx       ← 173 lines (existing, unchanged)
  RunHistoryPanel.tsx   ← ~80 lines (new)
  TranscriptTimeline.tsx ← existing, unchanged
```

**7 new files** created, **0 files deleted**, **1 file drastically reduced**.

---

## Out of Scope (for now)

| Item | Reason |
|------|--------|
| Extension providers (`gemini.js`, `chatgpt.js`, etc.) | Separate Chrome extension codebase, different build pipeline |
| `globals.css` (364 lines) | CSS doesn't benefit as much from splitting; theme tokens + utilities are logically grouped |
| `lib/types.ts`, `lib/store.ts`, `lib/prompts.ts` | Already well-sized and cohesive |
| `app/api/agent-api/route.ts` (191 lines) | Reasonable size, each provider caller is distinct |

---

## Execution Order

1. **Phase 1.4** — Move `generateMockResponse` → `lib/mock.ts` (smallest, no dependencies)
2. **Phase 1.3** — Extract `useRunHistory` hook (shared state, simpler)
3. **Phase 1.2** — Extract `useApiRun` hook (fewer cross-dependencies)
4. **Phase 1.1** — Extract `useExtensionRun` hook (most complex, depends on WebSocket)
5. **Phase 2.6** — Extract `ErrorBanner` (tiny, quick win)
6. **Phase 2.3** — Extract `RunHistoryPanel` (deduplication)
7. **Phase 2.2** — Extract `ModeTabs`
8. **Phase 2.1** — Extract `AgentPageHeader`
9. **Phase 2.4** — Extract `ExtensionModelPicker`
10. **Phase 2.5** — Extract `ApiModelSelector`
11. **Phase 3** — Final cleanup of `page.tsx`, verify build passes

---

## Risks & Notes

- **State coupling**: Extension and API modes share `runs` / `activeRunId`. The `useRunHistory` hook must expose setters both modes can call.
- **Ref forwarding**: `runRef` is updated by history handlers AND the start handler. Keep ref ownership in the hook that creates it.
- **Mock run**: `handleMockRun` uses extension state but bypasses WS. It should live in `useExtensionRun` or become a standalone util.
- **Build verification**: After each phase, run `npm run build` to catch type errors early.
- **No behavior changes**: This is a pure refactor — no features added or removed.
