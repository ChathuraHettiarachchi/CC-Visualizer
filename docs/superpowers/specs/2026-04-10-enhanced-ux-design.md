# Enhanced UX Features Design

**Goal:** Five focused improvements that make cc-visualizer more useful day-to-day — context awareness, pattern detection, keyboard navigation, alerts, and session summaries.

**Architecture:** All features are pure client-side. No new API routes, no new dependencies. Each feature is an isolated addition to an existing component or a new standalone component.

**Tech Stack:** React hooks, localStorage, existing inline styles, IBM Plex Mono.

---

## C — Context Window Tracker

### What

A horizontal progress bar in the existing Stats panel (left rail) showing how much of Claude's 200k context window the active session has consumed.

### Implementation

**`lib/context-estimate.ts`** — new pure utility:

```ts
const CONTEXT_WINDOW = 200_000; // Claude Sonnet 200k tokens

export function estimateContextUsage(events: ClaudeEvent[]): {
  usedTokens: number;
  totalTokens: number;
  percentage: number;   // 0–100
} 
```

Cumulative sum: every `PreToolUse` input + every `PostToolUse` response, chars/4 = tokens. Same formula as existing Stats panel.

**`LeftRail.tsx`** — add one new stat block below the existing grid. Full-width (spanning both columns), renders:

```
Context window
[████████████░░░░░░░░░░░░░░░░]  34%  (~68k / 200k tokens)
```

Bar color transitions:
- 0–60%: `#22c55e` (green)
- 60–85%: `#ffbf69` (amber)
- 85–100%: `#f87171` (red)

The bar is a simple `div` with `width: ${percentage}%` inside a fixed-height track. No canvas, no chart library.

---

## D — Pattern Detection

### What

A collapsible "Patterns" panel in the left rail (below Waterfall) that lists automatically detected patterns in the active session.

### Patterns

| ID | Name | Trigger condition |
|---|---|---|
| `read-edit-loop` | Read-edit loop | Same `file_path` appears in ≥3 Read + Edit/Write events |
| `error-retry` | Error-retry | A tool call errors, then the same `tool_name` is called again within the next 3 events |
| `long-chain` | Long tool chain | ≥20 consecutive `PreToolUse` events without a `Stop`/`SubagentStop` |
| `repeated-failures` | Repeated failures | ≥3 consecutive tool calls with error status |

### Implementation

**`lib/detect-patterns.ts`** — new pure utility:

```ts
export interface DetectedPattern {
  id: string;          // pattern type ID
  label: string;       // human label, e.g. "Read-edit loop"
  description: string; // one-line explanation
  nodeIds: string[];   // tool-{id} node IDs involved, clickable
}

export function detectPatterns(events: ClaudeEvent[]): DetectedPattern[]
```

Pure function, no side effects. Called via `useMemo` in `LeftRail`.

**`components/panels/PatternPanel.tsx`** — new component:

```ts
interface PatternPanelProps {
  events: ClaudeEvent[];
  onNodeClick: (nodeId: string) => void;
}
```

Renders each `DetectedPattern` as a card:
- Pattern label in accent color
- Description in muted text (10px)
- Node ID chips: clicking one calls `onNodeClick(nodeId)` which jumps to that node in the graph

Empty state: "No patterns detected" in muted text.

**`LeftRail.tsx`** — add `PatternPanel` between Waterfall and Stats. Wire `onNodeClick` up through props to `app/page.tsx`'s `selectNodeById`.

**`LeftRailProps`** — add `onNodeClick: (nodeId: string) => void`.

**`app/page.tsx`** — pass `onNodeClick={selectNodeById}` to `LeftRail`.

---

## E — Keyboard Navigation + Command Palette

### Keyboard shortcuts

Global listener attached to the graph canvas container div via `onKeyDown` (with `tabIndex={0}` to receive focus).

| Key | Action |
|---|---|
| `←` | Select previous node (chronological order) |
| `→` | Select next node |
| `Enter` | Open inspector for currently selected node |
| `Escape` | Deselect current node / close command palette |
| `/` | Focus the search input |
| `⌘K` / `Ctrl+K` | Open command palette |

Navigation order: the same `orderedPlaybackNodes` array already computed in `GraphCanvas`.

### Command palette

**`components/panels/CommandPalette.tsx`** — new component:

```ts
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  nodes: Array<{ id: string; label: string; type: string }>;
  onSelect: (nodeId: string) => void;
}
```

Renders as a centered modal overlay (position fixed, zIndex 100, backdrop blur):
- Text input with autofocus, placeholder "Jump to tool call…"
- Results list: filters `nodes` by fuzzy match on `label` (tool name) as user types
- Max 8 results shown
- Arrow up/down to move through results, Enter to select
- Click outside or Esc to close

Fuzzy match: `label.toLowerCase().includes(query.toLowerCase())` — simple substring, no new deps.

**`GraphCanvas.tsx`** — add `commandPaletteOpen` state, render `CommandPalette` when open, wire keyboard handlers.

---

## G — Cost / Error Alerts

### What

Toast notifications that fire once per session when configurable thresholds are crossed. A ⚙ settings popover in the Topbar lets the user adjust thresholds.

### Thresholds

Stored in `localStorage` under key `cc-viz-alert-config`:

```ts
interface AlertConfig {
  costThresholdUsd: number;   // default 0.50
  errorCountThreshold: number; // default 5
}
```

### Implementation

**`lib/alerts.ts`** — new utility:

```ts
export function loadAlertConfig(): AlertConfig
export function saveAlertConfig(config: AlertConfig): void

// Returns which thresholds are newly crossed given previous + current values
export function checkThresholds(
  prev: { cost: number; errors: number },
  curr: { cost: number; errors: number },
  config: AlertConfig
): Array<"cost" | "errors">
```

**`components/ui/Toast.tsx`** — new component:

```ts
interface ToastProps {
  message: string;
  type: "warn" | "error";
  onDismiss: () => void;
}
```

Renders fixed top-right, auto-dismisses after 5 seconds. Animation: slide in from right.

**`hooks/useAlerts.ts`** — new hook:

```ts
export function useAlerts(events: ClaudeEvent[]): {
  toasts: Toast[];
  dismissToast: (id: string) => void;
}
```

Uses `useEffect` to check thresholds whenever events change. Fires at most once per session per threshold type (tracks fired set in a ref).

**`components/ui/AlertSettings.tsx`** — new component, a small popover (position absolute, anchored to ⚙ button in Topbar):

```ts
interface AlertSettingsProps {
  open: boolean;
  onClose: () => void;
}
```

Two number inputs: "Cost alert ($)" and "Error alert (count)". Saves to localStorage on change.

**`Topbar.tsx`** — add ⚙ icon button (right side), render `AlertSettings` popover when toggled.

**`app/page.tsx`** — render `Toast` components from `useAlerts(activeEvents)` at root level.

---

## H — Markdown Session Summary Export

### What

A "Summary" button in the graph controls bar that generates and downloads a `.md` file summarising the active session.

### Output format

```markdown
# Claude Code Session Summary
**Session:** {sessionId}  
**Date:** {date}  
**Duration:** {duration}

## Overview
- {N} tool calls across {M} unique tools
- {K} files touched
- {E} errors
- Estimated cost: ${cost}

## Tool Breakdown
| Tool | Calls | Errors | Avg Duration |
|------|-------|--------|--------------|
| Read | 12 | 0 | 45ms |
| Edit | 8  | 1 | 120ms |
...

## Files Touched
- `path/to/file.ts` — 4 operations
- `path/to/other.ts` — 2 operations

## Errors
1. **Edit** at 14:23:01 — "No such file or directory"
2. **Bash** at 14:25:44 — "Command failed with exit code 1"

## Cost Estimate
~{inputTokens} input tokens + ~{outputTokens} output tokens ≈ ${cost}
```

### Implementation

**`lib/generate-summary.ts`** — new pure utility:

```ts
export function generateSummary(sessionId: string, events: ClaudeEvent[]): string
```

Returns the markdown string. All data derived from events — no server calls.

**`GraphCanvas.tsx`** — add "↓ Summary" button to the controls bar (next to Export PNG / Export JSON). On click, calls `generateSummary`, creates a `Blob`, triggers download as `session-{id}-summary.md`.

---

## Shared Changes Summary

| File | Change |
|---|---|
| `lib/context-estimate.ts` | New: context window math |
| `lib/detect-patterns.ts` | New: pattern detection |
| `lib/alerts.ts` | New: threshold config + crossing detection |
| `lib/generate-summary.ts` | New: markdown generator |
| `components/panels/PatternPanel.tsx` | New: pattern list UI |
| `components/panels/CommandPalette.tsx` | New: ⌘K modal |
| `components/ui/Toast.tsx` | New: toast notification |
| `components/ui/AlertSettings.tsx` | New: alert config popover |
| `hooks/useAlerts.ts` | New: alert hook |
| `components/layout/LeftRail.tsx` | Add context bar + PatternPanel |
| `components/layout/Topbar.tsx` | Add ⚙ button + AlertSettings |
| `components/canvas/GraphCanvas.tsx` | Add keyboard nav + ⌘K + Summary button |
| `app/page.tsx` | Add Toast render + pass onNodeClick to LeftRail |

---

## Out of Scope

- Audio alerts
- Push notifications
- Pattern configuration UI (thresholds are hardcoded except cost/error count)
- Summary auto-generation on session end
- Syntax highlighting in diff viewer
