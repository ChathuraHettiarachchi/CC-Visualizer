---
phase: 05-enhanced-features
plan: 03
status: complete
completed: 2026-04-09
---

# 05-03 Summary: Duration Heatmap + Subagent Tree

## What Was Built
- `duration` field added to toolcall node data in `eventsToGraph` (Pre→Post timestamp delta, null if no PostToolUse)
- `durationColor()` helper: green (#22c55e) → amber → red (#f87171) gradient by relative duration
- Heatmap toggle button (top-left overlay, alongside search) — toggling recolors toolcall nodes
- `childSessions: Map<string, string[]>` returned from `useSSE` (derived from parentMap on every event)
- `LeftRail` accepts `childSessions` and renders indented "↳ subagent" rows below parent sessions
- `app/page.tsx` passes `childSessions` to `LeftRail`

## Files Modified
- `lib/events-to-graph.ts`
- `components/canvas/GraphCanvas.tsx`
- `hooks/useSSE.ts`
- `components/layout/LeftRail.tsx`
- `app/page.tsx`

## Verification
- [x] npx tsc --noEmit passes
- [x] duration in node data for completed tool calls
- [x] Heatmap toggle recolors toolcall nodes
- [x] Non-toolcall nodes unaffected by heatmap
- [x] childSessions returned from useSSE
- [x] LeftRail tree renders correctly
