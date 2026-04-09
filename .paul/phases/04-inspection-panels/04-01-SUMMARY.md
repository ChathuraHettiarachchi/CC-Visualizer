---
phase: 04-inspection-panels
plan: 01
subsystem: ui
tags: [inspector-panel, node-detail, timeline, click-to-inspect, typescript]

requires:
  - phase: 03-graph-engine/03-02
    provides: selectedNodeId in page.tsx, onNodeSelect callback in GraphCanvas

provides:
  - components/panels/InspectorPanel.tsx — 320px right sidebar with header, close, NodeDetail, Timeline
  - components/panels/NodeDetail.tsx — type-specific node content (ToolCall input/output, Notification message, Stop label)
  - components/panels/Timeline.tsx — chronological event list with selected event highlighted
  - components/canvas/GraphCanvas.tsx — onNodeSelect upgraded to pass { id, type, data }
  - app/page.tsx — selectedNode state, flex-row layout with panel

affects:
  - 04-02 (file heatmap will be added as panel tab or additional section)

tech-stack:
  added: []
  patterns:
    - "SelectedNode type exported from GraphCanvas — shared between GraphCanvas and panel components"
    - "InspectorPanel receives full node { id, type, data } — no re-derivation needed"
    - "isSelected() in Timeline uses tool_use_id prefix strip for toolcall, timestamp match for others"
    - "Sticky 'Timeline' header inside scrollable div"

key-files:
  created:
    - components/panels/InspectorPanel.tsx
    - components/panels/NodeDetail.tsx
    - components/panels/Timeline.tsx
  modified:
    - components/canvas/GraphCanvas.tsx
    - app/page.tsx

key-decisions:
  - "SelectedNode type exported from GraphCanvas (not a separate types file) — co-located with its producer"
  - "onNodeSelect passes { id, type, data } — avoids re-deriving node data from events in the panel"
  - "Inline styles throughout panels — consistent with node components, avoids Tailwind/ReactFlow conflicts"
  - "min-w-0 on graph flex child — prevents flexbox overflow when panel is open"

patterns-established:
  - "Panel components use React.CSSProperties for inline style typing"
  - "isSelected() pure function for timeline highlight logic — easy to test and extend"

duration: ~20min
started: 2026-04-08T17:40:00Z
completed: 2026-04-08T18:00:00Z
---

# Phase 4 Plan 01: Inspector Panel + Timeline Summary

**320px inspector panel opens on node click showing formatted tool input/output (or notification message/stop label) and a scrollable session timeline with the selected event highlighted.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Started | 2026-04-08 |
| Completed | 2026-04-08 |
| Tasks | 2 of 2 completed |
| Files created/modified | 5 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Panel opens on node click | Pass | Flex-row layout, 320px panel slides in beside graph |
| AC-2: ToolCallNode detail shows input/output | Pass | Formatted JSON in Pre blocks, status badge, timestamp |
| AC-3: NotificationNode and StopNode detail | Pass | Full message / type label shown correctly |
| AC-4: Panel closes cleanly | Pass | × button and session tab switch both close panel |
| AC-5: Timeline shows all session events | Pass | 6 entries for 6-event replay, selected highlighted blue |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `components/panels/InspectorPanel.tsx` | Created | Panel shell: header (title + ×), NodeDetail, divider, Timeline |
| `components/panels/NodeDetail.tsx` | Created | Type-specific node content with Label/Pre/Badge/Timestamp helpers |
| `components/panels/Timeline.tsx` | Created | Scrollable event list, isSelected() highlight logic |
| `components/canvas/GraphCanvas.tsx` | Modified | onNodeSelect passes { id, type, data }; SelectedNode type exported |
| `app/page.tsx` | Modified | selectedNode state, flex-row layout, InspectorPanel wired |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| SelectedNode exported from GraphCanvas | Co-located with its producer; avoids a separate types file | All panel components import from GraphCanvas |
| Pass full { id, type, data } to panel | Avoids re-deriving node content from events in panel | Panel has everything it needs without calling eventsToGraph again |
| Timeline isSelected() uses tool_use_id prefix strip | toolcall node IDs are `tool-{tool_use_id}` — strip prefix to compare | Works correctly for Pre+Post pairs (both highlighted) |

## Deviations from Plan

None — executed exactly as specified.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Inspector panel working end-to-end: click node → see detail + timeline
- SelectedNode type and panel component structure ready for 04-02 extension

**Concerns:**
- NodeDetail section is not scrollable — very long tool outputs (e.g. large file reads) may overflow. 04-02 could add a max-height + scroll to the NodeDetail section.

**Blockers:** None

---
*Phase: 04-inspection-panels, Plan: 01*
*Completed: 2026-04-08*
