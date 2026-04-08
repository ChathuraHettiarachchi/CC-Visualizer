# cc-visualizer

## What This Is

A real-time visualization tool for Claude Code agent sessions. Renders agent execution as an interactive node graph showing tool calls, branching, and return flows live. Automatically discovers active Claude Code sessions via hooks-based HTTP streaming, supports multiple concurrent sessions in tabs, and provides an interactive canvas plus timeline/transcript inspection panels.

## Core Value

Developers can see their Claude Code agent sessions visualized in real-time — watching agents think, branch, and coordinate as they work.

## Current State

| Attribute | Value |
|-----------|-------|
| Version | 0.0.0 |
| Status | Prototype |
| Last Updated | 2026-04-08 |

## Requirements

### Validated (Shipped)
- [x] Project scaffold — Next.js 16 + TypeScript + Tailwind v4 — Phase 1
- [x] React Flow canvas — @xyflow/react integrated, pan/zoom working — Phase 1
- [x] Dark developer-tool shell — header, session tabs, canvas layout — Phase 1

### Active (In Progress)
- [ ] Claude Code hooks — lightweight HTTP hook server for zero-latency event streaming
- [ ] Auto-detect Claude Code sessions — discover active sessions in workspace, stream events

### Planned (Next)
- [ ] Live agent visualization — interactive node graph with real-time tool calls, branching, return flows
- [ ] Multi-session support — track concurrent agent sessions with tabs
- [ ] Interactive canvas — pan, zoom, click agents and tool calls to inspect details
- [ ] Timeline & transcript panels — full execution timeline, file attention heatmap, message transcript

### Out of Scope
- [ ] General AI workflow builder (not agent-flow replacement, focused on Claude Code specifically)

## Target Users

**Primary:** Developers using Claude Code with multi-agent / agentic workflows
- Want visibility into what agents are doing
- Need to debug agent coordination and tool call chains
- Working with complex, branching agent sessions

## Context

**Technical Context:**
- Reference implementation: https://github.com/patoles/agent-flow
- Requires Claude Code hooks integration for event streaming
- Real-time rendering of agent graphs via SSE or WebSocket

## Constraints

### Technical Constraints
- Must integrate with Claude Code hooks API
- Event streaming must be zero-latency (HTTP hook server)

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Build own vs fork agent-flow | Building own for full control and custom vision | 2026-04-08 | Active |
| npm over pnpm | pnpm not installed on machine | 2026-04-08 | Active |
| App in cc-visualizer/ subdir | Parent dir "AI" is invalid npm package name | 2026-04-08 | Active |
| Always-dark theme via CSS vars | Developer tool — no light mode needed | 2026-04-08 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Real-time latency | <100ms event-to-render | - | Not started |
| Session detection | Auto-discovers active sessions | - | Not started |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-04-08 after Phase 1*
