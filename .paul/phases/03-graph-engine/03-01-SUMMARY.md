---
phase: 03-graph-engine
plan: 01
subsystem: ui
tags: [react-flow, node-types, graph-rendering, events-to-graph, typescript]

requires:
  - phase: 02-event-ingestion/02-02
    provides: useSSE hook with sessions, SSE event stream, per-session event arrays

provides:
  - components/graph/ToolCallNode.tsx — custom React Flow node for tool calls
  - components/graph/NotificationNode.tsx — custom node for notification events
  - components/graph/StopNode.tsx — terminal node for Stop/SubagentStop events
  - lib/events-to-graph.ts — pure function: ClaudeEvent[] → { nodes, edges }
  - hooks/useSSE.ts — extended with per-session event tracking (sessionEvents Map)
  - components/canvas/GraphCanvas.tsx — accepts events prop, renders custom nodes
  - app/page.tsx — passes active session events to GraphCanvas

affects:
  - 03-02 (live SSE updates, animations, click-to-inspect, layout improvements)

tech-stack:
  added: []
  patterns:
    - "nodeTypes defined outside component — stable reference prevents React Flow remounting"
    - "useMemo on eventsToGraph — avoids recomputation unless events array changes"
    - "PreToolUse+PostToolUse grouped by tool_use_id into single ToolCallNode"
    - "useRef for eventsBySession — avoids stale closure; new Map() in setState forces re-render"
    - "Inline styles for React Flow custom nodes — Tailwind classes unreliable inside ReactFlow DOM"

key-files:
  created:
    - components/graph/ToolCallNode.tsx
    - components/graph/NotificationNode.tsx
    - components/graph/StopNode.tsx
    - lib/events-to-graph.ts
  modified:
    - hooks/useSSE.ts
    - components/canvas/GraphCanvas.tsx
    - app/page.tsx

key-decisions:
  - "Inline styles on node components — Tailwind unreliable inside React Flow canvas DOM"
  - "Two-pass algorithm in eventsToGraph — build toolCallMap first, then ordered graphItems"
  - "StopNode has no source Handle — terminal node, no outgoing edges"
  - "NODE_SPACING=140px — visually comfortable for node height ~80-100px"

patterns-established:
  - "Custom node data typed via interface, passed as data prop from eventsToGraph"
  - "eventsToGraph is pure — no side effects, fully testable in isolation"

duration: ~25min
started: 2026-04-08T16:50:00Z
completed: 2026-04-08T17:15:00Z
---

# Phase 3 Plan 01: Node Types + Static Graph Rendering Summary

**Custom ToolCall/Notification/Stop node components render ClaudeEvent[] as a vertical timeline graph; switching session tabs shows each session's event graph independently.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25 min |
| Started | 2026-04-08 |
| Completed | 2026-04-08 |
| Tasks | 3 of 3 completed |
| Files created/modified | 7 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: ToolCall nodes render with correct content | Pass | Bash/Read nodes showed tool name + "complete" badge |
| AC-2: Notification and Stop nodes render | Pass | Amber notification header, muted "Session complete" stop node |
| AC-3: Nodes connect with sequential edges | Pass | 4 nodes, 3 edges in correct timestamp order |
| AC-4: Active session drives the graph | Pass | Tab switching updates canvas to session-specific events |
| AC-5: Empty session shows empty canvas | Pass | Cold start shows empty canvas with "No sessions yet" tab |

## Accomplishments

- Full event→graph pipeline: replay JSONL → SSE → useSSE → eventsToGraph → ReactFlow nodes visible in browser
- PreToolUse+PostToolUse correctly merged into single ToolCallNode with pending/complete status
- Stable `nodeTypes` ref outside component — no React Flow remount warnings
- `useMemo` on eventsToGraph — graph only recomputes when events change
- Human checkpoint verified with 6-event replay producing 4 nodes

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `components/graph/ToolCallNode.tsx` | Created | Tool call node: name, input preview, status badge |
| `components/graph/NotificationNode.tsx` | Created | Notification node: amber header + message |
| `components/graph/StopNode.tsx` | Created | Terminal stop node: no source handle |
| `lib/events-to-graph.ts` | Created | Pure ClaudeEvent[] → { nodes, edges } converter |
| `hooks/useSSE.ts` | Modified | Added eventsBySession ref + sessionEvents state |
| `components/canvas/GraphCanvas.tsx` | Modified | Added events prop, nodeTypes, useMemo |
| `app/page.tsx` | Modified | Passes active session events to GraphCanvas |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Inline styles on node components | Tailwind classes unreliable inside React Flow canvas DOM | All future custom nodes must use inline styles |
| Two-pass algorithm (toolCallMap then graphItems) | Ensures PostToolUse always found before node is created | Clean complete/pending status on all tool calls |
| StopNode has no source Handle | Terminal event — no outgoing edges meaningful | visually clear graph termination |
| NODE_SPACING = 140px | Comfortable gap between ~80-100px tall nodes | May need adjustment for very long input previews |

## Deviations from Plan

None — executed exactly as specified.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Graph renders correctly for any session's events
- Per-session event tracking in useSSE ready for live updates
- Node vocabulary established — ToolCall, Notification, Stop cover all ClaudeEvent types
- eventsToGraph is pure — 03-02 can call it incrementally or replace with streaming approach

**Concerns:**
- fitView runs on every render when events change — may cause jarring camera jumps as new events arrive. 03-02 should disable fitView after initial fit.
- No layout for subagent branching yet — sequential vertical layout only.

**Blockers:** None

---
*Phase: 03-graph-engine, Plan: 01*
*Completed: 2026-04-08*
