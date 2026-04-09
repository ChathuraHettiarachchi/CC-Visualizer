# Enhanced UX Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add context window tracking, pattern detection, keyboard navigation + command palette, cost/error alerts, and markdown session summary export.

**Architecture:** All features are pure client-side. New utility functions in `lib/`, new components in `components/panels/` and `components/ui/`, minimal additions to existing layout components. No new API routes, no new npm dependencies.

**Tech Stack:** React hooks, localStorage, existing inline styles, IBM Plex Mono.

---

## File Map

| File | Action |
|---|---|
| `lib/context-estimate.ts` | Create — context window math |
| `lib/detect-patterns.ts` | Create — pattern detection |
| `lib/alerts.ts` | Create — alert config + threshold logic |
| `lib/generate-summary.ts` | Create — markdown summary generator |
| `components/panels/PatternPanel.tsx` | Create — pattern list UI |
| `components/panels/CommandPalette.tsx` | Create — ⌘K modal |
| `components/ui/Toast.tsx` | Create — toast notification |
| `components/ui/AlertSettings.tsx` | Create — alert config popover |
| `hooks/useAlerts.ts` | Create — alert state hook |
| `components/layout/LeftRail.tsx` | Modify — context bar + PatternPanel |
| `components/layout/Topbar.tsx` | Modify — ⚙ button + AlertSettings |
| `components/canvas/GraphCanvas.tsx` | Modify — keyboard nav + ⌘K + Summary button |
| `app/page.tsx` | Modify — Toast render + pass onNodeClick to LeftRail |

---

### Task 1: `lib/context-estimate.ts`

**Files:**
- Create: `lib/context-estimate.ts`

- [ ] **Step 1: Create the file**

```ts
import type { ClaudeEvent } from "@/lib/types";

const CONTEXT_WINDOW = 200_000;

export interface ContextUsage {
  usedTokens: number;
  totalTokens: number;
  percentage: number; // 0–100
}

export function estimateContextUsage(events: ClaudeEvent[]): ContextUsage {
  let chars = 0;
  for (const e of events) {
    if (e.hook_event_name === "PreToolUse") {
      chars += JSON.stringify((e as { tool_input: unknown }).tool_input ?? {}).length;
    } else if (e.hook_event_name === "PostToolUse") {
      chars += String((e as { tool_response: unknown }).tool_response ?? "").length;
    }
  }
  const usedTokens = Math.round(chars / 4);
  const percentage = Math.min(100, Math.round((usedTokens / CONTEXT_WINDOW) * 100));
  return { usedTokens, totalTokens: CONTEXT_WINDOW, percentage };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/context-estimate.ts
git commit -m "feat(ux): context-estimate utility"
```

---

### Task 2: Add context bar to `components/layout/LeftRail.tsx`

**Files:**
- Modify: `components/layout/LeftRail.tsx`

- [ ] **Step 1: Add import**

```ts
import { estimateContextUsage } from "@/lib/context-estimate";
```

- [ ] **Step 2: Compute context usage inside the component**

Add after the existing `estCostUsd` computation block:

```ts
const contextUsage = estimateContextUsage(events);
```

- [ ] **Step 3: Add context bar below the stats grid**

Inside the Stats `<div className="glass">` block, after the existing `{globalStats.map(...)}` grid, add:

```tsx
{/* Context window bar */}
<div style={{ marginTop: 12 }}>
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    marginBottom: 5,
  }}>
    <span style={{ ...MONO, fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      Context window
    </span>
    <span style={{ ...MONO, fontSize: 9, color: "var(--muted)" }}>
      ~{contextUsage.percentage}%
    </span>
  </div>
  <div style={{ height: 4, background: "var(--line)", borderRadius: 2 }}>
    <div style={{
      height: "100%",
      width: `${contextUsage.percentage}%`,
      borderRadius: 2,
      background: contextUsage.percentage < 60 ? "#22c55e" : contextUsage.percentage < 85 ? "#ffbf69" : "#f87171",
      transition: "width 0.3s ease",
    }} />
  </div>
  <div style={{ ...MONO, fontSize: 9, color: "rgba(140,194,255,0.35)", marginTop: 3 }}>
    ~{(contextUsage.usedTokens / 1000).toFixed(1)}k / {(contextUsage.totalTokens / 1000).toFixed(0)}k tokens
  </div>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/context-estimate.ts components/layout/LeftRail.tsx
git commit -m "feat(ux): context window progress bar in stats panel"
```

---

### Task 3: `lib/detect-patterns.ts`

**Files:**
- Create: `lib/detect-patterns.ts`

- [ ] **Step 1: Create the file**

```ts
import type { ClaudeEvent, PreToolUseEvent, PostToolUseEvent } from "@/lib/types";

export interface DetectedPattern {
  id: string;
  label: string;
  description: string;
  nodeIds: string[];
}

export function detectPatterns(events: ClaudeEvent[]): DetectedPattern[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const patterns: DetectedPattern[] = [];

  const preEvents = sorted.filter((e): e is PreToolUseEvent => e.hook_event_name === "PreToolUse");
  const postMap = new Map<string, PostToolUseEvent>();
  for (const e of sorted) {
    if (e.hook_event_name === "PostToolUse") postMap.set(e.tool_use_id, e);
  }

  function isError(e: PreToolUseEvent): boolean {
    const post = postMap.get(e.tool_use_id);
    return post
      ? typeof post.tool_response === "string" &&
        /error|exception|failed|traceback/i.test(post.tool_response.slice(0, 500))
      : false;
  }

  // ── Read-edit loop: same file read + edited 3+ times ─────────────
  const fileOps = new Map<string, string[]>();
  const FILE_TOOL_KEYS: Record<string, string> = {
    Read: "file_path", Write: "file_path", Edit: "file_path",
    MultiEdit: "file_path", NotebookEdit: "notebook_path",
  };
  for (const e of preEvents) {
    const key = FILE_TOOL_KEYS[e.tool_name];
    if (!key) continue;
    const filePath = e.tool_input[key] as string | undefined;
    if (!filePath) continue;
    const existing = fileOps.get(filePath) ?? [];
    existing.push(`tool-${e.tool_use_id}`);
    fileOps.set(filePath, existing);
  }
  for (const [filePath, nodeIds] of fileOps.entries()) {
    if (nodeIds.length >= 3) {
      const base = filePath.replace(/\\/g, "/");
      const name = base.slice(base.lastIndexOf("/") + 1);
      patterns.push({
        id: "read-edit-loop",
        label: "Read-edit loop",
        description: `${name} accessed ${nodeIds.length} times`,
        nodeIds,
      });
    }
  }

  // ── Error-retry: tool errors then same tool_name called within 3 events ──
  for (let i = 0; i < preEvents.length; i++) {
    if (!isError(preEvents[i])) continue;
    for (let j = i + 1; j < Math.min(i + 4, preEvents.length); j++) {
      if (preEvents[j].tool_name === preEvents[i].tool_name) {
        patterns.push({
          id: "error-retry",
          label: "Error-retry",
          description: `${preEvents[i].tool_name} errored then retried`,
          nodeIds: [`tool-${preEvents[i].tool_use_id}`, `tool-${preEvents[j].tool_use_id}`],
        });
        break;
      }
    }
  }

  // ── Long chain: 20+ tool calls without Stop ───────────────────────
  const stopTimestamps = sorted
    .filter((e) => e.hook_event_name === "Stop" || e.hook_event_name === "SubagentStop")
    .map((e) => e.timestamp);
  if (preEvents.length >= 20) {
    let chainStart = 0;
    for (let i = 0; i < preEvents.length; i++) {
      const stopsBetween = stopTimestamps.filter(
        (t) => t > preEvents[chainStart].timestamp && t < preEvents[i].timestamp
      );
      if (stopsBetween.length > 0) {
        chainStart = i;
        continue;
      }
      if (i - chainStart + 1 >= 20) {
        patterns.push({
          id: "long-chain",
          label: "Long tool chain",
          description: `${i - chainStart + 1} tool calls without a stop`,
          nodeIds: preEvents.slice(chainStart, i + 1).map((e) => `tool-${e.tool_use_id}`),
        });
        chainStart = i + 1; // avoid duplicate detection
        i = chainStart - 1;
      }
    }
  }

  // ── Repeated failures: 3+ consecutive errors ──────────────────────
  let streak = 0;
  let streakStart = 0;
  for (let i = 0; i < preEvents.length; i++) {
    if (isError(preEvents[i])) {
      if (streak === 0) streakStart = i;
      streak++;
    } else {
      if (streak >= 3) {
        patterns.push({
          id: "repeated-failures",
          label: "Repeated failures",
          description: `${streak} consecutive errors`,
          nodeIds: preEvents.slice(streakStart, streakStart + streak).map((e) => `tool-${e.tool_use_id}`),
        });
      }
      streak = 0;
    }
  }
  if (streak >= 3) {
    patterns.push({
      id: "repeated-failures",
      label: "Repeated failures",
      description: `${streak} consecutive errors`,
      nodeIds: preEvents.slice(streakStart, streakStart + streak).map((e) => `tool-${e.tool_use_id}`),
    });
  }

  return patterns;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/detect-patterns.ts
git commit -m "feat(ux): pattern detection utility"
```

---

### Task 4: `components/panels/PatternPanel.tsx`

**Files:**
- Create: `components/panels/PatternPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useMemo } from "react";
import { detectPatterns } from "@/lib/detect-patterns";
import type { ClaudeEvent } from "@/lib/types";

const MONO = "'IBM Plex Mono', monospace";

const PATTERN_COLORS: Record<string, string> = {
  "read-edit-loop": "#a78bfa",
  "error-retry":    "#f87171",
  "long-chain":     "#ffbf69",
  "repeated-failures": "#f87171",
};

interface PatternPanelProps {
  events: ClaudeEvent[];
  onNodeClick: (nodeId: string) => void;
}

export default function PatternPanel({ events, onNodeClick }: PatternPanelProps) {
  const patterns = useMemo(() => detectPatterns(events), [events]);

  if (patterns.length === 0) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--muted)" }}>
        No patterns detected
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {patterns.map((p, i) => {
        const color = PATTERN_COLORS[p.id] ?? "#61d0ff";
        return (
          <div
            key={i}
            style={{
              padding: "8px 10px", borderRadius: 10,
              border: `1px solid ${color}22`,
              background: `${color}08`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 11, color, marginBottom: 3, fontWeight: 600 }}>
              {p.label}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>
              {p.description}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {p.nodeIds.slice(0, 6).map((id) => (
                <button
                  key={id}
                  onClick={() => onNodeClick(id)}
                  style={{
                    fontFamily: MONO, fontSize: 9,
                    background: `${color}12`, border: `1px solid ${color}30`,
                    borderRadius: 4, padding: "1px 6px",
                    color, cursor: "pointer",
                  }}
                >
                  {id.slice(5, 13)}…
                </button>
              ))}
              {p.nodeIds.length > 6 && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--muted)" }}>
                  +{p.nodeIds.length - 6} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add PatternPanel to LeftRail**

In `components/layout/LeftRail.tsx`, add import:

```ts
import PatternPanel from "@/components/panels/PatternPanel";
```

Add `onNodeClick: (nodeId: string) => void` to `LeftRailProps`.

Add the panel between the WaterfallPanel block and the Stats block:

```tsx
{/* ── Patterns ───────────────────────────────────────────── */}
{events.some(e => e.hook_event_name === "PreToolUse") && (
  <div className="glass" style={{ padding: 14, flexShrink: 0 }}>
    <div style={EYEBROW}>Patterns</div>
    <div style={{ marginTop: 8 }}>
      <PatternPanel events={events} onNodeClick={onNodeClick} />
    </div>
  </div>
)}
```

- [ ] **Step 3: Wire onNodeClick in `app/page.tsx`**

In `app/page.tsx`, update `<LeftRail>` to add `onNodeClick={selectNodeById}`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/panels/PatternPanel.tsx components/layout/LeftRail.tsx app/page.tsx
git commit -m "feat(ux): pattern detection panel in left rail"
```

---

### Task 5: Keyboard navigation + command palette in `GraphCanvas.tsx`

**Files:**
- Create: `components/panels/CommandPalette.tsx`
- Modify: `components/canvas/GraphCanvas.tsx`

- [ ] **Step 1: Create `CommandPalette.tsx`**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";

const MONO = "'IBM Plex Mono', monospace";

interface PaletteNode {
  id: string;
  label: string;
  type: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  nodes: PaletteNode[];
  onSelect: (nodeId: string) => void;
}

export default function CommandPalette({ open, onClose, nodes, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const filtered = nodes
    .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && filtered[cursor]) { onSelect(filtered[cursor].id); onClose(); }
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 120,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 480, background: "rgba(7,17,31,0.97)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(140,194,255,0.2)", borderRadius: 16,
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Jump to tool call…"
          style={{
            width: "100%", padding: "14px 18px",
            background: "transparent", border: "none", borderBottom: "1px solid rgba(140,194,255,0.12)",
            color: "#edf5ff", fontFamily: MONO, fontSize: 13, outline: "none",
            boxSizing: "border-box",
          }}
        />
        {filtered.length === 0 ? (
          <div style={{ padding: "12px 18px", fontFamily: MONO, fontSize: 12, color: "var(--muted)" }}>
            No results
          </div>
        ) : (
          filtered.map((n, i) => (
            <div
              key={n.id}
              onClick={() => { onSelect(n.id); onClose(); }}
              style={{
                padding: "10px 18px", cursor: "pointer", fontFamily: MONO,
                background: i === cursor ? "rgba(97,208,255,0.08)" : "transparent",
                borderLeft: `2px solid ${i === cursor ? "#61d0ff" : "transparent"}`,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{ fontSize: 11, color: "#edf5ff" }}>{n.label}</span>
              <span style={{ fontSize: 9, color: "var(--muted)", marginLeft: "auto" }}>{n.type}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add keyboard nav + ⌘K + Summary to `GraphCanvas.tsx`**

Add imports at the top:

```ts
import CommandPalette from "@/components/panels/CommandPalette";
import { generateSummary } from "@/lib/generate-summary";
```

Add state inside `GraphCanvas`:

```ts
const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
```

Add `paletteNodes` derived from `orderedPlaybackNodes`:

```ts
const paletteNodes = useMemo(() =>
  orderedPlaybackNodes.map((n) => {
    const nd = n as Record<string, unknown>;
    const data = (nd.data as Record<string, unknown>) ?? {};
    const label = nd.type === "toolcall"
      ? (data.toolName as string ?? "tool")
      : (nd.type as string ?? "node");
    return { id: nd.id as string, label, type: nd.type as string };
  }),
  [orderedPlaybackNodes]
);
```

Add keyboard handler to the container div:

```tsx
<div
  ref={containerRef}
  tabIndex={0}
  style={{ width: "100%", height: "100%", position: "relative", borderRadius: 16, overflow: "hidden", outline: "none" }}
  onKeyDown={(e) => {
    // ⌘K / Ctrl+K — command palette
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdPaletteOpen(true);
      return;
    }
    // / — focus search
    if (e.key === "/" && document.activeElement === e.currentTarget) {
      e.preventDefault();
      const searchInput = e.currentTarget.querySelector("input") as HTMLInputElement | null;
      searchInput?.focus();
      return;
    }
    // ← / → — step through nodes
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const currentIdx = orderedPlaybackNodes.findIndex(
        (n) => (n as Record<string, unknown>).id === (onNodeSelect as unknown as { _lastId?: string })?._lastId
      );
      // Simpler: find current selected node from graph
      // Since we don't have selectedId here, step from first/last
      const nextIdx = Math.max(0, Math.min(orderedPlaybackNodes.length - 1,
        (currentIdx === -1 ? (dir === 1 ? 0 : orderedPlaybackNodes.length - 1) : currentIdx + dir)
      ));
      const nextNode = orderedPlaybackNodes[nextIdx] as Record<string, unknown>;
      if (nextNode) {
        onNodeSelect?.({
          id: nextNode.id as string,
          type: nextNode.type as string | undefined,
          data: (nextNode.data as Record<string, unknown>) ?? {},
        });
      }
      return;
    }
    // Escape — deselect
    if (e.key === "Escape") {
      onNodeSelect?.(null);
    }
  }}
>
```

> **Note:** Arrow key navigation tracks current selection via `selectedNodeId` prop. Add `selectedNodeId?: string` to `GraphCanvasProps` and pass it from `app/page.tsx` as `selectedNodeId={selectedNode?.id ?? undefined}`. Use it in the ArrowLeft/ArrowRight handler to find `currentIdx`:
> ```ts
> const currentIdx = orderedPlaybackNodes.findIndex(
>   (n) => (n as Record<string, unknown>).id === selectedNodeId
> );
> ```

Add Summary button to the controls bar (alongside existing Export PNG / Export JSON):

```tsx
<button
  onClick={() => {
    const md = generateSummary(sessionId, events);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId}-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  }}
  style={{
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(140,194,255,0.2)",
    borderRadius: 14, color: "#91a8c7",
    cursor: "pointer", fontSize: 11, padding: "5px 12px",
    fontFamily: "'IBM Plex Mono', monospace",
  }}
>
  ↓ Summary
</button>
```

Render `CommandPalette` inside the container div (after the existing overlay divs):

```tsx
<CommandPalette
  open={cmdPaletteOpen}
  onClose={() => setCmdPaletteOpen(false)}
  nodes={paletteNodes}
  onSelect={(id) => {
    const node = graphData.nodes.find((n) => (n as Record<string, unknown>).id === id) as Record<string, unknown> | undefined;
    if (!node) return;
    onNodeSelect?.({ id: id, type: node.type as string | undefined, data: (node.data as Record<string, unknown>) ?? {} });
  }}
/>
```

- [ ] **Step 3: Update `GraphCanvasProps` and `app/page.tsx`**

In `GraphCanvas.tsx`, add to the interface:

```ts
interface GraphCanvasProps {
  events: ClaudeEvent[];
  sessionId: string;
  onNodeSelect?: (node: SelectedNode | null) => void;
  onSecondNodeSelect?: (node: SelectedNode | null) => void;
  selectedNodeId?: string;   // ← new
}
```

In `app/page.tsx`, update `<GraphCanvas>`:

```tsx
<GraphCanvas
  events={activeEvents}
  sessionId={activeId ?? ""}
  onNodeSelect={(n) => { setSelectedNode(n); setCompareNode(null); }}
  onSecondNodeSelect={setCompareNode}
  selectedNodeId={selectedNode?.id}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual test**

1. Click the graph canvas to focus it
2. Press `→` repeatedly — inspector should step through nodes
3. Press `⌘K` — command palette opens, type a tool name, press Enter — inspector jumps to that node
4. Press `Esc` — node deselects
5. Click "↓ Summary" — `.md` file downloads

- [ ] **Step 6: Commit**

```bash
git add components/panels/CommandPalette.tsx components/canvas/GraphCanvas.tsx app/page.tsx lib/generate-summary.ts
git commit -m "feat(ux): keyboard nav, command palette, summary export"
```

---

### Task 6: `lib/generate-summary.ts`

**Files:**
- Create: `lib/generate-summary.ts`

- [ ] **Step 1: Create the file**

```ts
import type { ClaudeEvent, PreToolUseEvent, PostToolUseEvent } from "@/lib/types";

export function generateSummary(sessionId: string, events: ClaudeEvent[]): string {
  if (events.length === 0) return `# Session Summary\n\nNo events recorded.\n`;

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const startTs = sorted[0].timestamp;
  const endTs   = sorted[sorted.length - 1].timestamp;
  const durationMs = endTs - startTs;
  const durationStr = durationMs >= 60_000
    ? `${Math.floor(durationMs / 60_000)}m ${Math.round((durationMs % 60_000) / 1000)}s`
    : `${Math.round(durationMs / 1000)}s`;

  const preEvents = sorted.filter((e): e is PreToolUseEvent => e.hook_event_name === "PreToolUse");
  const postMap = new Map<string, PostToolUseEvent>();
  for (const e of sorted) {
    if (e.hook_event_name === "PostToolUse") postMap.set(e.tool_use_id, e);
  }

  // Tool breakdown
  const toolStats = new Map<string, { calls: number; errors: number; totalMs: number }>();
  for (const e of preEvents) {
    const post = postMap.get(e.tool_use_id);
    const isError = post
      ? typeof post.tool_response === "string" && /error|exception|failed|traceback/i.test(post.tool_response.slice(0, 500))
      : false;
    const dur = post ? post.timestamp - e.timestamp : 0;
    const s = toolStats.get(e.tool_name) ?? { calls: 0, errors: 0, totalMs: 0 };
    s.calls++;
    if (isError) s.errors++;
    s.totalMs += dur;
    toolStats.set(e.tool_name, s);
  }

  // Files touched
  const FILE_TOOL_KEYS: Record<string, string> = {
    Read: "file_path", Write: "file_path", Edit: "file_path",
    MultiEdit: "file_path", NotebookEdit: "notebook_path",
  };
  const fileCounts = new Map<string, number>();
  for (const e of preEvents) {
    const key = FILE_TOOL_KEYS[e.tool_name];
    if (!key) continue;
    const path = e.tool_input[key] as string | undefined;
    if (path) fileCounts.set(path, (fileCounts.get(path) ?? 0) + 1);
  }

  // Errors
  const errorList: Array<{ toolName: string; ts: number; message: string }> = [];
  for (const e of preEvents) {
    const post = postMap.get(e.tool_use_id);
    if (!post) continue;
    if (typeof post.tool_response === "string" && /error|exception|failed|traceback/i.test(post.tool_response.slice(0, 500))) {
      errorList.push({
        toolName: e.tool_name,
        ts: e.timestamp,
        message: post.tool_response.split("\n")[0].slice(0, 120),
      });
    }
  }

  // Cost estimate
  let inputChars = 0, outputChars = 0;
  for (const e of sorted) {
    if (e.hook_event_name === "PreToolUse") inputChars += JSON.stringify(e.tool_input ?? {}).length;
    else if (e.hook_event_name === "PostToolUse") outputChars += String(e.tool_response ?? "").length;
  }
  const inTok  = Math.round(inputChars / 4);
  const outTok = Math.round(outputChars / 4);
  const cost   = (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
  const costStr = cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;

  const fmtTok = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtDur = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

  const toolRows = [...toolStats.entries()]
    .sort((a, b) => b[1].calls - a[1].calls)
    .map(([name, s]) => `| ${name} | ${s.calls} | ${s.errors} | ${s.calls > 0 ? fmtDur(Math.round(s.totalMs / s.calls)) : "—"} |`)
    .join("\n");

  const fileRows = [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p, c]) => `- \`${p}\` — ${c} operation${c > 1 ? "s" : ""}`)
    .join("\n");

  const errorRows = errorList.length === 0
    ? "_No errors_"
    : errorList.map((e, i) => `${i + 1}. **${e.toolName}** at ${new Date(e.ts).toLocaleTimeString()} — ${e.message}`).join("\n");

  return `# Claude Code Session Summary

**Session:** \`${sessionId}\`
**Date:** ${new Date(startTs).toLocaleString()}
**Duration:** ${durationStr}

## Overview

- ${preEvents.length} tool call${preEvents.length !== 1 ? "s" : ""} across ${toolStats.size} unique tool${toolStats.size !== 1 ? "s" : ""}
- ${fileCounts.size} file${fileCounts.size !== 1 ? "s" : ""} touched
- ${errorList.length} error${errorList.length !== 1 ? "s" : ""}
- Estimated cost: ${costStr}

## Tool Breakdown

| Tool | Calls | Errors | Avg Duration |
|------|-------|--------|--------------|
${toolRows}

## Files Touched

${fileRows || "_No file operations_"}

## Errors

${errorRows}

## Cost Estimate

~${fmtTok(inTok)} input tokens + ~${fmtTok(outTok)} output tokens ≈ ${costStr}
`;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit** (if not already included in Task 5 commit)

```bash
git add lib/generate-summary.ts
git commit -m "feat(ux): markdown session summary generator"
```

---

### Task 7: Cost/error alerts

**Files:**
- Create: `lib/alerts.ts`
- Create: `hooks/useAlerts.ts`
- Create: `components/ui/Toast.tsx`
- Create: `components/ui/AlertSettings.tsx`
- Modify: `components/layout/Topbar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `lib/alerts.ts`**

```ts
export interface AlertConfig {
  costThresholdUsd: number;
  errorCountThreshold: number;
}

const STORAGE_KEY = "cc-viz-alert-config";
const DEFAULTS: AlertConfig = { costThresholdUsd: 0.5, errorCountThreshold: 5 };

export function loadAlertConfig(): AlertConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveAlertConfig(config: AlertConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function checkThresholds(
  prev: { cost: number; errors: number },
  curr: { cost: number; errors: number },
  config: AlertConfig
): Array<"cost" | "errors"> {
  const crossed: Array<"cost" | "errors"> = [];
  if (prev.cost < config.costThresholdUsd && curr.cost >= config.costThresholdUsd) crossed.push("cost");
  if (prev.errors < config.errorCountThreshold && curr.errors >= config.errorCountThreshold) crossed.push("errors");
  return crossed;
}
```

- [ ] **Step 2: Create `components/ui/Toast.tsx`**

```tsx
"use client";

import { useEffect } from "react";

const MONO = "'IBM Plex Mono', monospace";

interface ToastProps {
  id: string;
  message: string;
  type: "warn" | "error";
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  const color = type === "error" ? "#f87171" : "#ffbf69";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      background: "rgba(7,17,31,0.95)", backdropFilter: "blur(16px)",
      border: `1px solid ${color}44`,
      borderRadius: 12, marginBottom: 8,
      fontFamily: MONO, fontSize: 11, color,
      boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
      minWidth: 240,
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: 14, padding: 0 }}
      >×</button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: "warn" | "error" }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 300 }}>
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `hooks/useAlerts.ts`**

```ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ClaudeEvent } from "@/lib/types";
import { loadAlertConfig, checkThresholds } from "@/lib/alerts";

interface ToastItem {
  id: string;
  message: string;
  type: "warn" | "error";
}

export function useAlerts(events: ClaudeEvent[]) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prevRef = useRef({ cost: 0, errors: 0 });
  const firedRef = useRef(new Set<string>());

  useEffect(() => {
    let inputChars = 0, outputChars = 0, errors = 0;
    for (const e of events) {
      if (e.hook_event_name === "PreToolUse") inputChars += JSON.stringify((e as { tool_input: unknown }).tool_input ?? {}).length;
      if (e.hook_event_name === "PostToolUse") {
        outputChars += String((e as { tool_response: unknown }).tool_response ?? "").length;
        const resp = String((e as { tool_response: unknown }).tool_response ?? "");
        if (/error|exception|failed|traceback/i.test(resp.slice(0, 500))) errors++;
      }
    }
    const cost = (Math.round(inputChars / 4) / 1e6) * 3 + (Math.round(outputChars / 4) / 1e6) * 15;
    const curr = { cost, errors };
    const config = loadAlertConfig();
    const crossed = checkThresholds(prevRef.current, curr, config);

    for (const type of crossed) {
      const key = `${type}-${events[0]?.session_id ?? ""}`;
      if (firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      const message = type === "cost"
        ? `Cost threshold reached: ~$${cost.toFixed(2)}`
        : `Error threshold reached: ${errors} errors in this session`;
      setToasts((prev) => [...prev, { id: `${Date.now()}-${type}`, message, type: type === "errors" ? "error" : "warn" }]);
    }

    prevRef.current = curr;
  }, [events]);

  // Reset fired set when session changes
  useEffect(() => {
    firedRef.current = new Set();
    prevRef.current = { cost: 0, errors: 0 };
  }, [events[0]?.session_id]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismiss };
}
```

- [ ] **Step 4: Create `components/ui/AlertSettings.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { loadAlertConfig, saveAlertConfig } from "@/lib/alerts";

const MONO = "'IBM Plex Mono', monospace";

interface AlertSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function AlertSettings({ open, onClose }: AlertSettingsProps) {
  const [cost, setCost] = useState(0.5);
  const [errors, setErrors] = useState(5);

  useEffect(() => {
    if (open) {
      const cfg = loadAlertConfig();
      setCost(cfg.costThresholdUsd);
      setErrors(cfg.errorCountThreshold);
    }
  }, [open]);

  if (!open) return null;

  function save() {
    saveAlertConfig({ costThresholdUsd: cost, errorCountThreshold: errors });
    onClose();
  }

  return (
    <div
      style={{
        position: "absolute", top: "100%", right: 0, marginTop: 8, zIndex: 100,
        background: "rgba(7,17,31,0.97)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(140,194,255,0.18)", borderRadius: 14,
        padding: "14px 16px", minWidth: 220,
        fontFamily: MONO, fontSize: 11,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ color: "var(--muted)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
        Alert thresholds
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ color: "#edf5ff", marginBottom: 4 }}>Cost alert ($)</div>
        <input
          type="number" min={0} step={0.1} value={cost}
          onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(140,194,255,0.18)", borderRadius: 8,
            color: "#edf5ff", fontFamily: MONO, fontSize: 11,
            padding: "5px 8px", boxSizing: "border-box",
          }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 14 }}>
        <div style={{ color: "#edf5ff", marginBottom: 4 }}>Error alert (count)</div>
        <input
          type="number" min={1} step={1} value={errors}
          onChange={(e) => setErrors(parseInt(e.target.value) || 1)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(140,194,255,0.18)", borderRadius: 8,
            color: "#edf5ff", fontFamily: MONO, fontSize: 11,
            padding: "5px 8px", boxSizing: "border-box",
          }}
        />
      </label>

      <button
        onClick={save}
        style={{
          width: "100%", padding: "6px 0",
          background: "rgba(97,208,255,0.12)", border: "1px solid rgba(97,208,255,0.3)",
          borderRadius: 8, color: "#61d0ff", fontFamily: MONO, fontSize: 11, cursor: "pointer",
        }}
      >
        Save
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Update `components/layout/Topbar.tsx`**

```tsx
"use client";

import { useState } from "react";
import AlertSettings from "@/components/ui/AlertSettings";

interface TopbarProps {
  connected: boolean;
}

export default function Topbar({ connected }: TopbarProps) {
  const [alertsOpen, setAlertsOpen] = useState(false);

  return (
    <div className="glass" style={{
      gridColumn: "1 / -1",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 20px", borderRadius: 16,
    }}>
      <span style={{
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "0.04em",
      }}>
        cc-visualizer
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Live indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999,
          border: `1px solid ${connected ? "rgba(124,243,200,0.22)" : "rgba(140,194,255,0.12)"}`,
          background: connected ? "rgba(124,243,200,0.06)" : "rgba(255,255,255,0.03)",
        }}>
          <div
            className={connected ? "live-dot" : undefined}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: connected ? "#f87171" : "var(--muted)",
              boxShadow: connected ? "0 0 8px #f87171" : "none",
            }}
          />
          <span style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 11, color: connected ? "#f87171" : "var(--muted)",
          }}>
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>

        {/* Alert settings */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setAlertsOpen((o) => !o)}
            title="Alert settings"
            style={{
              background: alertsOpen ? "rgba(140,194,255,0.1)" : "none",
              border: "1px solid rgba(140,194,255,0.18)", borderRadius: 8,
              color: "var(--muted)", cursor: "pointer", fontSize: 14,
              padding: "4px 8px", lineHeight: 1,
            }}
          >
            ⚙
          </button>
          <AlertSettings open={alertsOpen} onClose={() => setAlertsOpen(false)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update `app/page.tsx` to render toasts**

Add imports:

```ts
import { useAlerts } from "@/hooks/useAlerts";
import { ToastContainer } from "@/components/ui/Toast";
```

Inside `Home`, add:

```ts
const { toasts, dismiss } = useAlerts(activeEvents);
```

Add `<ToastContainer>` as the last child in the outer grid div:

```tsx
<ToastContainer toasts={toasts} onDismiss={dismiss} />
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Manual test**

1. Set cost threshold to $0.00 in the ⚙ popover — a toast should appear immediately when events arrive
2. Set error threshold to 1 — trigger a tool error, toast should appear
3. Toast auto-dismisses after 5 seconds
4. Adjust thresholds back to sensible values ($0.50, 5)

- [ ] **Step 9: Commit**

```bash
git add lib/alerts.ts hooks/useAlerts.ts components/ui/Toast.tsx components/ui/AlertSettings.tsx components/layout/Topbar.tsx app/page.tsx
git commit -m "feat(ux): cost and error alert toasts with configurable thresholds"
```
