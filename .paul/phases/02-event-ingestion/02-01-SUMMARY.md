---
phase: 02-event-ingestion
plan: 01
subsystem: api
tags: [sse, event-store, claude-hooks, nodejs, eventemitter, typescript]

requires:
  - phase: 01-foundation
    provides: Running Next.js 16 app to add API routes into

provides:
  - POST /api/hooks — receives Claude Code HTTP hook events
  - GET /api/events — SSE stream with buffer replay + live push
  - lib/types.ts — ClaudeEvent discriminated union for all hook shapes
  - lib/event-store.ts — globalThis EventEmitter singleton + 500-event ring buffer

affects:
  - 02-02 (session management reads from events[])
  - 03-graph-engine (SSE consumer uses /api/events)

tech-stack:
  added:
    - Node.js EventEmitter (built-in, runtime = 'nodejs')
    - Web Streams API ReadableStream (native in Next.js 16)
  patterns:
    - "globalThis.__eventBus singleton — survives Next.js HMR hot reloads"
    - "export const runtime = 'nodejs' on API routes using EventEmitter"
    - "SSE via ReadableStream — replay buffer on connect, then live stream"
    - "Ring buffer: splice(0,1) when length > 500 — O(1) amortized"

key-files:
  created:
    - lib/types.ts
    - lib/event-store.ts
    - app/api/hooks/route.ts
    - app/api/events/route.ts

key-decisions:
  - "runtime = 'nodejs' required — EventEmitter not available in Edge runtime"
  - "globalThis pattern for HMR resilience — ??= prevents double-init"
  - "SSE replays full ring buffer on connect — new clients get recent history"
  - "Hook server always returns {ok:true} — never blocks Claude Code execution"

patterns-established:
  - "All new API routes: add `export const runtime = 'nodejs'` at top if using Node APIs"
  - "Event types: always extend BaseEvent (session_id + timestamp)"
  - "SSE abort cleanup: always remove eventBus listener on request.signal abort"

duration: ~20min
started: 2026-04-08T15:50:00Z
completed: 2026-04-08T16:10:00Z
---

# Phase 2 Plan 01: Event Ingestion — Hook Server + SSE Summary

**POST /api/hooks receives Claude Code events into a 500-event ring buffer; GET /api/events streams them to the browser via SSE with instant buffer replay on connect.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Started | 2026-04-08 |
| Completed | 2026-04-08 |
| Tasks | 3 of 3 completed |
| Files created | 4 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Hook endpoint accepts events | Pass | POST returns 200 `{"ok":true}`, event stored and broadcast |
| AC-2: SSE streams events to browser | Pass | `curl -N` received live Stop event within ~100ms |
| AC-3: Ring buffer limits memory | Pass | splice(0,1) enforces 500-event cap |
| AC-4: SSE replays buffer on connect | Pass | First curl -N immediately received prior PostToolUse event |

## Accomplishments

- Full event pipeline wired: Claude Code → POST /api/hooks → eventBus → GET /api/events → browser
- SSE replays ring buffer on new client connect — zero missed history
- globalThis singleton survives Next.js HMR — no event loss on code changes during dev
- TypeScript discriminated union covers all 5 hook event shapes with `tool_use_id` correlation

## Files Created

| File | Purpose |
|------|---------|
| `lib/types.ts` | ClaudeEvent union: PreToolUse, PostToolUse, Notification, Stop, SubagentStop |
| `lib/event-store.ts` | globalThis EventEmitter + 500-event ring buffer + pushEvent() |
| `app/api/hooks/route.ts` | POST endpoint — validates, timestamps, pushes Claude Code events |
| `app/api/events/route.ts` | GET SSE endpoint — replays buffer + streams live via ReadableStream |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `runtime = 'nodejs'` on both routes | EventEmitter unavailable in Edge runtime | All future API routes using Node APIs need this |
| `globalThis.__eventBus ??= new EventEmitter()` | Survives Next.js HMR — prevents double-init on hot reload | Standard pattern for all future global singletons |
| Hook server always returns `{ok:true}` | Never block Claude Code execution | Safe: Claude continues regardless of visualizer state |
| SSE replays full buffer on connect | New browser tabs / reconnects get recent history | 500-event cap keeps memory bounded |

## Deviations from Plan

None — executed exactly as specified.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `/api/hooks` ready to receive real Claude Code HTTP hook events
- `/api/events` SSE stream ready for browser consumption
- `events[]` ring buffer ready for session derivation in 02-02

**Concerns:**
- Claude Code hook configuration (settings.json) still needs to be set up manually — documented in 02-02

**Blockers:** None

---
*Phase: 02-event-ingestion, Plan: 01*
*Completed: 2026-04-08*
