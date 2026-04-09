# Roadmap: cc-visualizer

## Overview

Build a real-time Claude Code session visualizer — HTTP hook server for zero-latency event ingestion, interactive node graph for agent execution, multi-session tab management, and inspection panels for timeline and transcripts. Reference: https://github.com/patoles/agent-flow

## Current Milestone

**v0.2 Enhanced Features**
Status: Complete
Phases: 5 of 5 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation | 1 | ✅ Complete | 2026-04-08 |
| 2 | Event Ingestion | 2 | ✅ Complete | 2026-04-08 |
| 3 | Graph Engine | 2 | ✅ Complete | 2026-04-08 |
| 4 | Inspection Panels | 2 | In progress | - |
| 5 | Enhanced Features | 5 | ✅ Complete | 2026-04-09 |

## Phase Details

### Phase 1: Foundation

**Goal:** Working Next.js app with React Flow installed, basic layout (header + session tabs + canvas area)
**Depends on:** Nothing (first phase)
**Research:** Unlikely (standard Next.js scaffold)

**Scope:**
- Next.js 14+ with TypeScript, Tailwind CSS, ESLint
- React Flow (@xyflow/react) installed and configured
- Layout: header, multi-session tab bar, canvas placeholder
- Empty canvas renders React Flow provider

**Plans:**
- [x] 01-01: Project scaffold + basic layout

### Phase 2: Event Ingestion

**Goal:** Claude Code hooks wired up; events stream from Claude Code → hook server → browser in real-time
**Depends on:** Phase 1 (Next.js app running)
**Research:** Likely (Claude Code hooks API format, SSE setup in Next.js App Router)

**Scope:**
- HTTP hook server (Next.js API route) receiving Claude Code events
- SSE endpoint broadcasting events to connected browser clients
- Event normalization (parse assistant, tool_use, tool_result events)
- Session auto-detection (one session per Claude Code process)
- JSONL log file replay support

**Plans:**
- [x] 02-01: Hook server + SSE broadcast
- [x] 02-02: Session management + JSONL replay

### Phase 3: Graph Engine

**Goal:** Live interactive node graph rendering agent execution with real-time updates
**Depends on:** Phase 2 (events flowing via SSE)
**Research:** Unlikely (React Flow patterns established)

**Scope:**
- Node types: agent message nodes, tool call nodes, tool result nodes
- Edge types: sequential flow, branch (parallel agent spawn), return
- Real-time SSE consumer updating graph state
- Pan, zoom, click-to-select interactions

**Plans:**
- [x] 03-01: Node/edge types + static graph rendering
- [x] 03-02: Live SSE → graph state updates

### Phase 4: Inspection Panels

**Goal:** Click any node to inspect detail; timeline and transcript panels complete the picture
**Depends on:** Phase 3 (graph nodes selectable)
**Research:** Unlikely (UI panels, internal state)

**Scope:**
- Timeline panel: execution history with timestamps
- Transcript panel: message content viewer
- File attention heatmap: which files were touched most
- Click-to-inspect: selected node shows detail panel

**Plans:**
- [x] 04-01: Inspector panel + timeline (click node → detail + timeline)
- [ ] 04-02: File attention heatmap

### Phase 5: Enhanced Features

**Goal:** Search/filter, live event feed, duration heatmap, subagent tree, export, bookmarks, node diff
**Depends on:** Phase 4 (inspection panels)

**Plans:**
- [x] 05-01: Node search + replay speed control
- [x] 05-02: Live event feed (collapsible drawer)
- [x] 05-03: Duration heatmap + subagent tree view
- [x] 05-04: Export (PNG/JSON) + node bookmarks
- [x] 05-05: Node detail diff (shift-click compare)

**Wave 1 (parallel):** 05-01, 05-02, 05-03
**Wave 2 (after 05-01):** 05-04, 05-05

---
*Roadmap created: 2026-04-08*
*Last updated: 2026-04-09 — Phase 5 planned (5 plans)*
