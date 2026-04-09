# Session Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-save every Claude Code session event to `.cc-visualizer/sessions/{id}.ndjson` on disk, expose saved sessions via API routes, and add a History tab to the left rail for browsing and loading past sessions.

**Architecture:** `lib/session-store.ts` owns all disk I/O (NDJSON append, list, load, delete, prune). `lib/event-store.ts` calls `appendEvent` inside `pushEvent`. Three new Next.js API routes expose sessions to the client. A new `hooks/useSavedSessions.ts` hook fetches the list. `app/page.tsx` gains `savedSession` state and `loadSavedSession`. `LeftRail` gains a History tab.

**Tech Stack:** Node.js `fs` (built-in), Next.js App Router API routes, React hooks, TypeScript.

> ⚠️ **Before writing any code:** Read `node_modules/next/dist/docs/` for current App Router conventions — dynamic route `params` typing may differ from your training data.

---

## File Map

| File | Action |
|---|---|
| `lib/session-store.ts` | Create — all disk I/O |
| `lib/event-store.ts` | Modify — call `appendEvent` in `pushEvent` |
| `app/api/sessions/saved/route.ts` | Create — GET list |
| `app/api/sessions/saved/[id]/route.ts` | Create — GET single + DELETE |
| `hooks/useSavedSessions.ts` | Create — client fetch hook |
| `app/page.tsx` | Modify — savedSession state + loadSavedSession |
| `components/layout/LeftRail.tsx` | Modify — History tab |

---

### Task 1: `lib/session-store.ts`

**Files:**
- Create: `lib/session-store.ts`

- [ ] **Step 1: Create the file**

```ts
import { existsSync, mkdirSync, appendFileSync, readdirSync, statSync, readFileSync, unlinkSync } from "fs";
import path from "path";
import type { ClaudeEvent } from "@/lib/types";

const SESSION_DIR = path.join(process.cwd(), ".cc-visualizer", "sessions");
const MAX_SESSIONS = 50;

export interface SessionMeta {
  id: string;
  startTime: number;
  endTime: number;
  eventCount: number;
}

export function initSessionDir(): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
}

export function appendEvent(event: ClaudeEvent): void {
  try {
    initSessionDir();
    const filePath = path.join(SESSION_DIR, `${event.session_id}.ndjson`);
    appendFileSync(filePath, JSON.stringify(event) + "\n", "utf8");
    pruneOldSessions();
  } catch (err) {
    console.warn("[session-store] Failed to append event:", err);
  }
}

export function listSessions(): SessionMeta[] {
  try {
    initSessionDir();
    const files = readdirSync(SESSION_DIR).filter((f) => f.endsWith(".ndjson"));
    const metas: SessionMeta[] = [];
    for (const file of files) {
      const filePath = path.join(SESSION_DIR, file);
      const stat = statSync(filePath);
      const content = readFileSync(filePath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      if (lines.length === 0) continue;
      try {
        const firstEvent = JSON.parse(lines[0]) as ClaudeEvent;
        metas.push({
          id: file.replace(".ndjson", ""),
          startTime: firstEvent.timestamp,
          endTime: stat.mtimeMs,
          eventCount: lines.length,
        });
      } catch {
        // skip unparseable files
      }
    }
    return metas.sort((a, b) => b.startTime - a.startTime);
  } catch {
    return [];
  }
}

export function loadSession(id: string): ClaudeEvent[] {
  const filePath = path.join(SESSION_DIR, `${id}.ndjson`);
  if (!existsSync(filePath)) throw new Error(`Session not found: ${id}`);
  const content = readFileSync(filePath, "utf8");
  const result: ClaudeEvent[] = [];
  for (const line of content.trim().split("\n").filter(Boolean)) {
    try {
      result.push(JSON.parse(line) as ClaudeEvent);
    } catch {
      // skip bad lines
    }
  }
  return result;
}

export function deleteSession(id: string): void {
  const filePath = path.join(SESSION_DIR, `${id}.ndjson`);
  if (!existsSync(filePath)) throw new Error(`Session not found: ${id}`);
  unlinkSync(filePath);
}

function pruneOldSessions(): void {
  try {
    const files = readdirSync(SESSION_DIR)
      .filter((f) => f.endsWith(".ndjson"))
      .map((f) => ({ f, mtime: statSync(path.join(SESSION_DIR, f)).mtimeMs }))
      .sort((a, b) => a.mtime - b.mtime);
    while (files.length > MAX_SESSIONS) {
      const oldest = files.shift()!;
      unlinkSync(path.join(SESSION_DIR, oldest.f));
    }
  } catch (err) {
    console.warn("[session-store] Failed to prune sessions:", err);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/session-store.ts
git commit -m "feat(persistence): session-store disk I/O module"
```

---

### Task 2: Wire `lib/event-store.ts`

**Files:**
- Modify: `lib/event-store.ts`

- [ ] **Step 1: Add import and call**

Open `lib/event-store.ts`. Add the import at the top (after existing imports):

```ts
import { appendEvent as persistEvent } from "@/lib/session-store";
```

Inside `pushEvent`, add one line after `events.push(event)`:

```ts
export function pushEvent(event: ClaudeEvent): void {
  events.push(event);
  if (events.length > RING_BUFFER_MAX) {
    events.splice(0, 1);
  }
  persistEvent(event);                    // ← add this line
  eventBus.emit("event", event);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server (`node bin/cc-visualizer.js`), run Claude Code briefly, then check:

```bash
ls .cc-visualizer/sessions/
# Should show one .ndjson file per session_id
head -1 .cc-visualizer/sessions/*.ndjson
# Should show a valid JSON event object
```

- [ ] **Step 4: Commit**

```bash
git add lib/event-store.ts
git commit -m "feat(persistence): wire event-store to persist events on disk"
```

---

### Task 3: `GET /api/sessions/saved` — list route

**Files:**
- Create: `app/api/sessions/saved/route.ts`

- [ ] **Step 1: Create the route**

```ts
export const runtime = "nodejs";

import { listSessions } from "@/lib/session-store";

export async function GET(): Promise<Response> {
  const sessions = listSessions();
  return Response.json({ sessions });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test**

With the server running and at least one session saved:

```bash
curl http://localhost:3000/api/sessions/saved
# Expected: {"sessions":[{"id":"...","startTime":...,"endTime":...,"eventCount":...}]}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/sessions/saved/route.ts
git commit -m "feat(persistence): GET /api/sessions/saved list route"
```

---

### Task 4: `GET` + `DELETE /api/sessions/saved/[id]`

**Files:**
- Create: `app/api/sessions/saved/[id]/route.ts`

> ⚠️ Check `node_modules/next/dist/docs/` for how dynamic route `params` are typed in this version — it may be `Promise<{ id: string }>` requiring an `await`.

- [ ] **Step 1: Create the route**

```ts
export const runtime = "nodejs";

import { loadSession, deleteSession } from "@/lib/session-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  try {
    const events = loadSession(id);
    return Response.json({ events });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  try {
    deleteSession(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you get a type error on `params`, check the docs and adjust the typing (may be `{ params: { id: string } }` without `Promise`).

- [ ] **Step 3: Manual test**

```bash
# Get the id from the list endpoint first
ID=$(curl -s http://localhost:3000/api/sessions/saved | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sessions[0]?.id))")
echo $ID

curl http://localhost:3000/api/sessions/saved/$ID
# Expected: {"events":[...]}

curl -X DELETE http://localhost:3000/api/sessions/saved/$ID
# Expected: {"ok":true}

curl http://localhost:3000/api/sessions/saved/$ID
# Expected: {"error":"Not found"} with 404
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/sessions/saved/[id]/route.ts"
git commit -m "feat(persistence): GET+DELETE /api/sessions/saved/[id] routes"
```

---

### Task 5: `hooks/useSavedSessions.ts`

**Files:**
- Create: `hooks/useSavedSessions.ts`

- [ ] **Step 1: Create the hook**

```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { SessionMeta } from "@/lib/session-store";

export function useSavedSessions() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/saved");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions: SessionMeta[] };
      setSessions(data.sessions ?? []);
    } catch {
      // network error — ignore silently
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/sessions/saved/${id}`, { method: "DELETE" });
    refresh();
  }, [refresh]);

  return { sessions, refresh, remove };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useSavedSessions.ts
git commit -m "feat(persistence): useSavedSessions client hook"
```

---

### Task 6: Update `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports and state**

Add to the existing imports at the top:

```ts
import { useSavedSessions } from "@/hooks/useSavedSessions";
import type { SessionMeta } from "@/lib/session-store";
```

Inside the `Home` component, add after existing state declarations:

```ts
const [savedSession, setSavedSession] = useState<{ meta: SessionMeta; events: ClaudeEvent[] } | null>(null);
const { sessions: savedSessions, refresh: refreshSaved, remove: removeSaved } = useSavedSessions();
```

- [ ] **Step 2: Add loadSavedSession and update activeEvents**

Replace:
```ts
const activeEvents = (activeId ? sessionEvents.get(activeId) : undefined) ?? [];
```

With:
```ts
const activeEvents = savedSession?.events ?? (activeId ? sessionEvents.get(activeId) : undefined) ?? [];
const isReadOnly = savedSession !== null;

async function loadSavedSession(meta: SessionMeta) {
  try {
    const res = await fetch(`/api/sessions/saved/${meta.id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { events: ClaudeEvent[] };
    setSavedSession({ meta, events: data.events });
    setSelectedNode(null);
    setCompareNode(null);
  } catch {
    // ignore
  }
}

function clearSavedSession() {
  setSavedSession(null);
}
```

- [ ] **Step 3: Pass new props to LeftRail**

Update the `<LeftRail />` JSX to add:

```tsx
<LeftRail
  sessions={sessions}
  activeId={activeId}
  onSelect={(id) => { clearSavedSession(); setActiveId(id); }}
  events={activeEvents}
  sessionEvents={sessionEvents}
  childSessions={childSessions}
  savedSessions={savedSessions}
  onLoadSaved={loadSavedSession}
  onDeleteSaved={removeSaved}
  activeSavedId={savedSession?.meta.id ?? null}
/>
```

- [ ] **Step 4: Add read-only banner above graph**

In the graph container div (the middle column), add a banner above `<GraphCanvas>`:

```tsx
<div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 16 }}>
  {isReadOnly && (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 14px", marginBottom: 8,
      background: "rgba(167,139,250,0.10)",
      border: "1px solid rgba(167,139,250,0.25)",
      borderRadius: 12,
      fontFamily: "var(--font-ibm-plex-mono), monospace",
      fontSize: 11, color: "#a78bfa",
    }}>
      <span>Saved session — read only</span>
      <button
        onClick={clearSavedSession}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", fontSize: 13 }}
      >
        ✕ Back to live
      </button>
    </div>
  )}
  <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
    <GraphCanvas ... />
  </div>
  <EventFeed events={activeEvents} />
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors about `savedSessions`, `onLoadSaved`, `onDeleteSaved`, `activeSavedId` not existing on `LeftRailProps` — fix those in Task 7.

- [ ] **Step 6: Commit after Task 7 passes tsc**

Hold this commit until LeftRail is updated (Task 7).

---

### Task 7: History tab in `components/layout/LeftRail.tsx`

**Files:**
- Modify: `components/layout/LeftRail.tsx`

- [ ] **Step 1: Add new props to LeftRailProps**

```ts
import type { SessionMeta } from "@/lib/session-store";

interface LeftRailProps {
  sessions: SessionInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  events: ClaudeEvent[];
  sessionEvents: Map<string, ClaudeEvent[]>;
  childSessions: Map<string, string[]>;
  // New:
  savedSessions: SessionMeta[];
  onLoadSaved: (meta: SessionMeta) => void;
  onDeleteSaved: (id: string) => void;
  activeSavedId: string | null;
}
```

- [ ] **Step 2: Add tab state and update Sessions panel**

At the top of the `LeftRail` component body, add:

```ts
const [tab, setTab] = React.useState<"live" | "history">("live");
```

Add `import React, { useState } from "react";` at the top (or just `useState` if React is already imported).

- [ ] **Step 3: Replace the Sessions panel with tabbed version**

Replace the existing Sessions `<div className="glass">` block with:

```tsx
<div className="glass" style={{ padding: 14, flexShrink: 0 }}>
  {/* Tab bar */}
  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
    {(["live", "history"] as const).map((t) => (
      <button
        key={t}
        onClick={() => setTab(t)}
        style={{
          ...MONO,
          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
          padding: "3px 10px", borderRadius: 20, cursor: "pointer",
          background: tab === t ? "rgba(97,208,255,0.12)" : "transparent",
          border: `1px solid ${tab === t ? "rgba(97,208,255,0.34)" : "rgba(140,194,255,0.14)"}`,
          color: tab === t ? "var(--accent)" : "var(--muted)",
        }}
      >
        {t === "live" ? `Live (${sessions.length})` : `History (${savedSessions.length})`}
      </button>
    ))}
  </div>

  {/* Live tab */}
  {tab === "live" && (
    sessions.length === 0 ? (
      <div style={{ ...MONO, color: "var(--muted)", fontSize: 12 }}>No sessions yet</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 260 }}>
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          const evts = sessionEvents.get(s.id) ?? [];
          const { total, tools } = sessionStats(evts);
          const children = childSessions.get(s.id) ?? [];
          return (
            <div key={s.id}>
              <button
                onClick={() => onSelect(s.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 12px", borderRadius: 12,
                  border: `1px solid ${isActive ? "rgba(97,208,255,0.34)" : "rgba(123,178,255,0.14)"}`,
                  background: isActive ? "rgba(97,208,255,0.08)" : "rgba(255,255,255,0.025)",
                  boxShadow: isActive ? "0 0 0 1px rgba(97,208,255,0.15)" : "none",
                  cursor: "pointer", color: "var(--text)", transition: "all 0.15s",
                }}
              >
                <div style={{ ...MONO, fontSize: 12, marginBottom: total > 0 ? 5 : 0 }}>{s.label}</div>
                {total > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Chip value={total} label="events" color="rgba(140,194,255,0.5)" />
                    {tools > 0 && <Chip value={tools} label="tools" color="rgba(124,243,200,0.5)" />}
                    {s.subagentCount > 0 && <Chip value={s.subagentCount} label="agents" color="rgba(167,139,250,0.5)" />}
                  </div>
                )}
              </button>
              {children.map((childId, idx) => {
                const isChildActive = childId === activeId;
                return (
                  <button
                    key={childId}
                    onClick={() => onSelect(childId)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "6px 12px 6px 20px", borderRadius: 10, marginTop: 3,
                      border: `1px solid ${isChildActive ? "rgba(167,139,250,0.34)" : "rgba(123,178,255,0.10)"}`,
                      background: isChildActive ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.015)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ ...MONO, fontSize: 11, color: "var(--muted)" }}>↳ Subagent {idx + 1}</div>
                    <div style={{ ...MONO, fontSize: 9, color: "rgba(140,194,255,0.35)", marginTop: 2 }}>{childId.slice(0, 12)}…</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    )
  )}

  {/* History tab */}
  {tab === "history" && (
    savedSessions.length === 0 ? (
      <div style={{ ...MONO, color: "var(--muted)", fontSize: 12 }}>No saved sessions yet</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", maxHeight: 260 }}>
        {savedSessions.map((s) => {
          const isActive = s.id === activeSavedId;
          const date = new Date(s.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return (
            <div
              key={s.id}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 10px", borderRadius: 12,
                border: `1px solid ${isActive ? "rgba(167,139,250,0.34)" : "rgba(123,178,255,0.14)"}`,
                background: isActive ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.025)",
                cursor: "pointer",
              }}
              onClick={() => onLoadSaved(s)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...MONO, fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.id.slice(0, 16)}…
                </div>
                <div style={{ ...MONO, fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                  {date} · {s.eventCount} events
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSaved(s.id); }}
                title="Delete session"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted)", fontSize: 13, padding: "2px 4px", flexShrink: 0,
                }}
              >×</button>
            </div>
          );
        })}
      </div>
    )
  )}
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual end-to-end test**

1. Start server: `node bin/cc-visualizer.js`
2. Run Claude Code in another terminal — triggers a few tool calls
3. Reload the browser — switch to History tab in left rail
4. Confirm the session appears with correct event count
5. Click it — graph populates with saved events, purple "Saved session — read only" banner appears
6. Click "✕ Back to live" — banner clears, live sessions resume
7. Click × on the history entry — it disappears from the list

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/layout/LeftRail.tsx hooks/useSavedSessions.ts
git commit -m "feat(persistence): History tab + read-only saved session view"
```
