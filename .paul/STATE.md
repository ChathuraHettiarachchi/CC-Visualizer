# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-08 after Phase 2)

**Core value:** Developers can see their Claude Code agent sessions visualized in real-time — watching agents think, branch, and coordinate as they work.
**Current focus:** v0.1 — Phase 3: Graph Engine

## Current Position

Milestone: v0.1 Initial Release
Phase: 3 of 4 (Graph Engine) — In Progress
Plan: 03-01 complete, 03-02 not started
Status: Ready for next plan
Last activity: 2026-04-08 — 03-01 UNIFY complete

Progress:
- Milestone: [██████░░░░] 62%
- Phase 3: [█████░░░░░] 50%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete - ready for 03-02]
```

## Accumulated Context

### Decisions
- Building own implementation (not forking agent-flow) for full control
- Tech stack: Next.js 16 App Router + TypeScript + Tailwind v4 + @xyflow/react + SSE
- Package manager: npm (pnpm not installed on machine)
- .paul/ now lives inside cc-visualizer/ (moved from parent workspace dir)
- Always-dark theme via CSS custom properties — no light mode toggle
- SSE via Web Streams API (ReadableStream) — confirmed works in Next.js 16
- Hook endpoints use `export const runtime = 'nodejs'` (EventEmitter not in Edge runtime)
- Global singleton via `globalThis.__eventBus` — survives Next.js HMR
- Two EventSource connections (Header + page) — acceptable for local dev tool
- `useRef` for sessionMap in useSSE — avoids stale closure re-renders

### Deferred Issues
None yet.

### Blockers/Concerns
- Phase 3 graph engine needs per-session event filtering — useSSE currently exposes all sessions, not per-session event lists. Phase 3 plan must extend this.

### Git State
Last commit: 6658ff9
Branch: main

## Session Continuity

Last session: 2026-04-08
Stopped at: 03-01 complete — nodes visible in canvas
Next action: /paul:plan for 03-02 (Live SSE → graph state updates)
Resume file: .paul/phases/03-graph-engine/03-01-SUMMARY.md

---
*STATE.md — Updated after every significant action*
