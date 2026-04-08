# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-08 after Phase 3)

**Core value:** Developers can see their Claude Code agent sessions visualized in real-time — watching agents think, branch, and coordinate as they work.
**Current focus:** v0.1 — Phase 4: Inspection Panels

## Current Position

Milestone: v0.1 Initial Release
Phase: 4 of 4 (Inspection Panels) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-04-08 — Phase 3 complete, transitioned to Phase 4

Progress:
- Milestone: [████████░░] 75%
- Phase 4: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready to plan Phase 4]
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
- nodeTypes defined outside component — stable reference prevents React Flow remounting
- Imperative fitView via useReactFlow — fitView prop resets camera on every render
- Inline styles on custom nodes — Tailwind unreliable inside React Flow canvas DOM
- selectedNodeId in page.tsx state — ready for Phase 4 detail panels

### Deferred Issues
None yet.

### Blockers/Concerns
None.

### Git State
Last commit: e524da6
Branch: main

## Session Continuity

Last session: 2026-04-08
Stopped at: Phase 3 complete, ready to plan Phase 4
Next action: /paul:plan for Phase 4 (Inspection Panels)
Resume file: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
