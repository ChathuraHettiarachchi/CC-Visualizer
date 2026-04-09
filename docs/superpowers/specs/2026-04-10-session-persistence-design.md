# Session Persistence Design

**Goal:** Auto-save every Claude Code session to disk so sessions survive server restarts and can be reviewed after the fact.

**Architecture:** Server-side NDJSON files (one per session) in `.cc-visualizer/sessions/`, appended event-by-event. A new `lib/session-store.ts` module owns all disk I/O. Three new API routes expose session metadata and full event payloads to the client. The left rail gains a History tab for browsing saved sessions.

**Tech Stack:** Node.js `fs` (built-in, no new deps), Next.js API routes, React hooks.

---

## Storage

Sessions are written to `.cc-visualizer/sessions/` relative to the directory where `npx cc-visualizer` was run.

```
.cc-visualizer/
  sessions/
    {sessionId}.ndjson    ← one file per session, one JSON event per line
```

Each line is a complete `ClaudeEvent` JSON object. Files are append-only. A session file is considered complete when a `Stop` or `SubagentStop` event is written to it.

**Retention:** When total file count in the sessions dir exceeds 50, the oldest file (by `mtime`) is deleted. This check runs on every `appendEvent` call.

---

## `lib/session-store.ts`

New module. All disk I/O lives here.

```ts
export function initSessionDir(): void
// Creates .cc-visualizer/sessions/ if it doesn't exist.
// Called once at server startup (in the hooks API route module).

export function appendEvent(event: ClaudeEvent): void
// Appends JSON.stringify(event) + "\n" to sessions/{event.session_id}.ndjson.
// After writing, checks total file count and prunes oldest if > 50.

export function listSessions(): SessionMeta[]
// Scans sessions dir. For each .ndjson file reads the first line (start time)
// and counts total lines (event count). Returns array sorted newest-first.
// SessionMeta: { id, startTime, endTime, eventCount, filePath }
// endTime = file mtime (last modified time).

export function loadSession(id: string): ClaudeEvent[]
// Reads sessions/{id}.ndjson, parses each line, returns ClaudeEvent[].
// Throws if file not found.

export function deleteSession(id: string): void
// Deletes sessions/{id}.ndjson. Throws if not found.

interface SessionMeta {
  id: string;
  startTime: number;   // timestamp of first event
  endTime: number;     // file mtime
  eventCount: number;
}
```

---

## `lib/event-store.ts` change

One addition to `pushEvent`:

```ts
export function pushEvent(event: ClaudeEvent): void {
  events.push(event);
  if (events.length > RING_BUFFER_MAX) events.splice(0, 1);
  appendEvent(event);          // ← new: persist to disk
  eventBus.emit("event", event);
}
```

`initSessionDir()` is called once at module load time (top-level side effect in `session-store.ts`).

---

## API Routes

### `GET /api/sessions/saved`

Returns `SessionMeta[]` sorted newest-first. No body params.

```ts
// Response
{ sessions: SessionMeta[] }
```

### `GET /api/sessions/saved/[id]`

Returns full event array for one saved session.

```ts
// Response
{ events: ClaudeEvent[] }
```

Returns 404 if session file not found.

### `DELETE /api/sessions/saved/[id]`

Deletes the session file.

```ts
// Response 200 on success, 404 if not found
```

---

## Client

### `hooks/useSavedSessions.ts`

```ts
export function useSavedSessions(): {
  sessions: SessionMeta[];
  refresh: () => void;
  deleteSession: (id: string) => Promise<void>;
}
```

Fetches `GET /api/sessions/saved` on mount and after any delete. No polling (manual refresh on tab focus via `visibilitychange` event).

### `app/page.tsx` changes

New state:

```ts
const [savedSession, setSavedSession] = useState<ClaudeEvent[] | null>(null);
```

`activeEvents` becomes:

```ts
const activeEvents = savedSession ?? (activeId ? sessionEvents.get(activeId) : undefined) ?? [];
const isReadOnly = savedSession !== null;
```

`loadSavedSession(id)` fetches `/api/sessions/saved/{id}` and sets `savedSession`. Selecting a live session clears `savedSession`.

### Left Rail — History Tab

The Sessions panel gains two tab buttons: **Live** | **History**.

**Live tab** — existing session list, no change.

**History tab:**
- Lists `SessionMeta[]` from `useSavedSessions`
- Each row: session ID (first 8 chars), date/time, event count, × delete button
- Clicking a row calls `loadSavedSession(id)`, sets the graph into read-only mode
- A **"Saved session — read only"** banner renders above the graph canvas (absolute positioned, dismissible)

No new pages or routes. Everything renders within the existing layout.

---

## Error Handling

- `appendEvent` wraps disk write in try/catch — logs warning, never crashes the server
- `loadSession` returns empty array on parse errors for individual lines (skip bad lines)
- API routes return structured `{ error: string }` on failures with appropriate HTTP status

---

## Out of Scope

- Session search / filtering by date range
- Session renaming / tagging
- Export of saved sessions (covered by existing JSON export)
- Cross-machine sync
