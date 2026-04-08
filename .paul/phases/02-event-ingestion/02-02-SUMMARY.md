---
phase: 02-event-ingestion
plan: 02
subsystem: ui
tags: [sse, react-hook, session-management, jsonl-replay, typescript]

requires:
  - phase: 02-event-ingestion/02-01
    provides: /api/events SSE stream, /api/hooks ingest, lib/types.ts ClaudeEvent, lib/event-store.ts ring buffer

provides:
  - hooks/useSSE.ts — EventSource hook returning { sessions, connected }
  - app/page.tsx — wired to real sessions, "No sessions yet" placeholder
  - components/layout/Header.tsx — live green/amber/grey connection dot
  - app/api/replay/route.ts — POST endpoint to replay JSONL log files

affects:
  - 03-graph-engine (SSE consumer, session selection, per-session graph rendering)

tech-stack:
  added: []
  patterns:
    - "useRef for sessionMap — avoids stale closure on EventSource message handler"
    - "Two separate EventSource connections (Header + useSSE) — acceptable for local dev tool"
    - "Placeholder session __none — non-selectable tab when ring buffer empty"

key-files:
  created:
    - hooks/useSSE.ts
    - app/api/replay/route.ts
  modified:
    - app/page.tsx
    - components/layout/Header.tsx

key-decisions:
  - "Separate EventSource in Header vs page — simpler than prop-drilling connected state"
  - "useRef for sessionMap — useRef avoids stale closure; useState would cause re-render storms"
  - "JSONL replay has no path restrictions — local-only dev tool, not exposed to internet"

patterns-established:
  - "Placeholder tab id='__none' — guard against onSelect firing for non-session items"
  - "Auto-select first session in useEffect watching sessions array"

duration: ~30min
started: 2026-04-08T16:15:00Z
completed: 2026-04-08T16:45:00Z
---

# Phase 2 Plan 02: UI Wiring + JSONL Replay Summary

**useSSE hook drives SessionTabs from live SSE events; Header shows real connection status; JSONL replay endpoint lets users load past sessions without Claude Code running.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-04-08 |
| Completed | 2026-04-08 |
| Tasks | 3 of 3 completed |
| Files modified | 4 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Sessions appear from live events | Pass | useSSE derives sessions from unique session_ids, labels "Session N" |
| AC-2: Header shows real connection status | Pass | Green/amber/grey dot with text, opens own EventSource |
| AC-3: JSONL replay loads past session | Pass | POST /api/replay reads file, pushes events, returns { ok, pushed } |
| AC-4: No-session placeholder | Pass | "__none" tab shows "No sessions yet" when ring buffer empty |

## Accomplishments

- Full browser SSE pipeline: `/api/events` → `useSSE` → `SessionTabs` updates without refresh
- Header connection dot live: green "Connected" on open, grey "Disconnected" on close
- "No sessions yet" placeholder shown on cold start — disappears when first event arrives
- JSONL replay: `curl -X POST /api/replay -d '{"filePath":"/tmp/demo.jsonl"}'` pushes events live into UI
- Build passes clean: `npm run build` with no TypeScript errors

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `hooks/useSSE.ts` | Created | EventSource hook → SessionInfo[] + connected boolean |
| `app/api/replay/route.ts` | Created | POST: reads JSONL, pushes valid events via pushEvent() |
| `app/page.tsx` | Modified | Replaced PLACEHOLDER_SESSIONS with useSSE(); auto-select first session |
| `components/layout/Header.tsx` | Modified | Added ConnectionDot sub-component with live status |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Separate EventSource in Header | Simpler than prop-drilling; local tool won't notice 2 connections | Header always shows accurate status independently of page mount |
| `useRef` for sessionMap | `useState` would trigger re-render on every SSE message; ref avoids this | Efficient: only re-renders when sessions array changes |
| No path validation on replay | Local dev tool — not exposed to network | Replay any JSONL path without whitelist friction |

## Deviations from Plan

None — executed exactly as specified.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Session tab bar updates in real-time from Claude Code hook events
- JSONL replay available for development/testing without live Claude Code
- `activeId` state managed cleanly — Phase 3 can read it to filter events per session

**Concerns:**
- Phase 3 graph engine needs to receive filtered events per session — `useSSE` currently returns all sessions, not per-session event lists. Phase 3 will extend or supplement this.

**Blockers:** None

---
*Phase: 02-event-ingestion, Plan: 02*
*Completed: 2026-04-08*
