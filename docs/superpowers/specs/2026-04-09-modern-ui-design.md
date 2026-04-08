# Modern UI Design Spec
**Date:** 2026-04-09  
**Project:** cc-visualizer  
**Status:** Approved

---

## Overview

Modernize cc-visualizer's UI by porting the cc-visualizer-pro design system: deep-space dark theme, glass-morphism panels, cyan/teal accents, IBM Plex fonts, 3-column layout, animated particle edges, and orb-based nodes. Subagent sessions are grouped under their parent session.

**Reference:** `/Users/chettiarachchi/Documents/Projects/ai/cc-visualizer-pro`

---

## Section 1: Design System

### CSS Tokens (`app/globals.css`)

Replace all existing color variables with:

```css
:root {
  --bg:           #07111f;
  --bg-alt:       #0e1b31;
  --panel:        rgba(10, 22, 40, 0.86);
  --panel-strong: rgba(12, 27, 51, 0.96);
  --line:         rgba(140, 194, 255, 0.18);
  --line-strong:  rgba(140, 194, 255, 0.4);
  --text:         #edf5ff;
  --muted:        #91a8c7;
  --accent:       #61d0ff;
  --accent-2:     #7cf3c8;
  --warn:         #ffbf69;
  --danger:       #ff7a90;
}
```

### Typography

Install via npm:
- `@fontsource/ibm-plex-sans`
- `@fontsource/ibm-plex-mono`

Import in `app/layout.tsx`. Apply `font-family: "IBM Plex Sans", "Segoe UI", sans-serif` to `html, body`. Monospace elements use `"IBM Plex Mono", "SFMono-Regular", monospace`.

### Background

Three-layer composite on `html, body`:
```css
background:
  radial-gradient(ellipse 60% 40% at 20% 10%, rgba(124,243,200,0.14) 0%, transparent 60%),
  radial-gradient(ellipse 55% 45% at 80% 85%, rgba(97,208,255,0.16) 0%, transparent 60%),
  linear-gradient(160deg, #040a13 0%, #07111f 52%, #050913 100%);
```

Two fixed ambient glow divs (rendered in `app/layout.tsx`, `pointer-events: none`, `z-index: 0`):
- Glow A: 520×520px, top-center, `background: rgba(97,208,255,0.16)`, `filter: blur(80px)`, `opacity: 0.55`
- Glow B: 460×460px, bottom-right, `background: rgba(124,243,200,0.12)`, `filter: blur(80px)`, `opacity: 0.55`

Background grid overlay (fixed, full-screen, `z-index: 0`):
- `background-image: linear-gradient(rgba(134,178,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(134,178,255,0.04) 1px, transparent 1px)`
- `background-size: 44px 44px`
- Masked with `radial-gradient` so lines fade at edges

### Glass Panel Mixin

All panels use:
```css
background: var(--panel);
backdrop-filter: blur(18px);
border: 1px solid var(--line);
border-radius: 22px;
box-shadow: 0 24px 80px rgba(0,0,0,0.28);
```

Cards (list items within panels): `border-radius: 16px`, `border: 1px solid rgba(123,178,255,0.14)`, `background: rgba(255,255,255,0.03)`.

---

## Section 2: Layout

### 3-Column Grid (`app/page.tsx`)

```
┌──────────────────────────────────────────────┐
│           topbar (spans all 3 cols)           │
├──────────┬──────────────────────┬─────────────┤
│ left     │                      │ right       │
│ rail     │   graph canvas       │ rail        │
│ 300px    │   fluid              │ 360px       │
└──────────┴──────────────────────┴─────────────┘
```

CSS Grid: `grid-template-columns: 300px minmax(0, 1fr) 360px`, `grid-template-rows: auto 1fr`, `gap: 16px`, `padding: 18px`, `min-height: 100vh`.

Topbar: `grid-column: 1 / 4`.

### Topbar

- Left: app name ("cc-visualizer") in IBM Plex Sans, 16px, `--text`
- Right: live-dot pill — 10px circle `background: var(--accent-2)`, `box-shadow: 0 0 14px var(--accent-2)` when SSE connected; grey when not. Label "Live" / "Disconnected".
- Glass panel treatment, `padding: 12px 20px`

### Left Rail (300px)

Two stacked glass panels, `gap: 14px`:

**Sessions panel:**
- Eyebrow label "Sessions" (11px, uppercase, `--accent-2`, `letter-spacing: 0.16em`)
- One tile per top-level session: `padding: 12px 13px`, `border-radius: 16px`
- Active tile: `border-color: rgba(97,208,255,0.34)`, `background: rgba(97,208,255,0.08)`
- Subagent indicator beneath active tile: `↳ N subagent(s)` in 11px muted text, indented 12px

**Stats panel:**
- 2×2 grid of metric cards
- Metrics: Events (total count), Tool Calls, Active Tool (name of in-flight tool or "—"), Sessions
- Each card: `padding: 14px`, `border-radius: 16px`, value in 28px bold `--text`, label in 12px uppercase `--muted`

### Right Rail (360px)

Three stacked glass panels, `gap: 14px`:

1. **Inspector** — node detail (when node selected) or "Select a node to inspect" empty state. Eyebrow "Inspector".
2. **Timeline** — scrollable event feed with timestamps. Eyebrow "Timeline". Selected event highlighted with `--accent` left border.
3. **Files** — file attention heatmap. Eyebrow "Files". Heat bars in `rgba(97,208,255,0.6)`.

Each panel has: sticky eyebrow header, scrollable body.

---

## Section 3: Node System

### Orb Nodes

Replace current flat rectangular nodes with circular orb nodes. Each orb is 120×120px, rendered as a React Flow custom node.

Three concentric layers (all centered via `position: absolute`, `inset: 0`, `margin: auto`):

| Layer | Size | Style |
|-------|------|-------|
| `.orb-core` | 54×54px | `border-radius: 50%`, radial-gradient highlight at `32% 28%`, `box-shadow` glow keyed to `--orb-color` |
| `.orb-ring` | 74×74px | `border-radius: 50%`, `border: 1px solid rgba(128,184,255,0.28)` |
| `.orb-pulse` | 96×96px | `border-radius: 50%`, `border: 1px solid` at low opacity, animated when active |

Node color by type:
- `toolcall` → `--accent` (`#61d0ff`)
- `notification` → `--warn` (`#ffbf69`)
- `stop` → `--accent-2` (`#7cf3c8`)

Node name label: 12px IBM Plex Mono, `--muted`, centered below orb.

### Pulse Animation

Active nodes (PreToolUse received, PostToolUse not yet received):

```css
@keyframes orbPulse {
  0%, 100% { transform: scale(0.94); opacity: 0.58; }
  50%       { transform: scale(1.04); opacity: 0.95; }
}
.orb-pulse.active { animation: orbPulse 2.8s ease-in-out infinite; }
```

"Active" state tracked in `useSSE` or graph-state: a node is active if it has a PreToolUse event with no matching PostToolUse (matched by `tool_use_id`).

### Selected State

Selected node ring: `border-color: rgba(97,208,255,0.52)`, `box-shadow: 0 0 22px rgba(97,208,255,0.18)`.

---

## Section 4: Edge Animations

### Edge Colors

| Edge | Color | Style |
|------|-------|-------|
| dispatch (agent → tool) | `#61d0ff` (cyan) | solid |
| return (tool → agent) | `#7cf3c8` (teal) | solid |
| subagent spawn | `#ffbf69` (amber) | dashed `8 7` |

### Breathing Stroke

CSS animation on React Flow edge `path` elements:

```css
@keyframes edgeBreath {
  0%, 100% { stroke-width: 2;   opacity: 0.46; }
  50%       { stroke-width: 2.8; opacity: 1;    }
}
```

Applied via React Flow's `style` prop on custom edge components.

### Particle Animation

For each active tool call (PreToolUse received, no matching PostToolUse):
- A `<circle>` SVG element (r=4, glow via SVG `filter: drop-shadow`) rides the edge path
- Uses SVG `<animateMotion>` with `<mpath xlink:href="#edge-path-id"/>` to follow the exact path
- `dur="1.7s"`, `repeatCount="indefinite"`, `rotate="auto"`
- Particle color matches edge color (`fill` attribute)
- Particle element removed when PostToolUse arrives (React conditional render)

Implementation: custom React Flow edge component renders an extra `<g>` alongside the path containing the `<circle>` + `<animateMotion>`. React Flow custom edges receive the SVG path `d` string as a prop (`EdgeProps.data` or computed via `getBezierPath`), so no DOM reads needed.

### Edge State

Edges are derived from the event sequence:
- `PreToolUse` → add dispatch edge (parent agent node → tool call node), start particle
- `PostToolUse` → add return edge (tool call node → parent agent node), remove particle, stop pulse on node

---

## Section 5: Subagent Grouping

### Detection Heuristic

In `useSSE`:
1. When a `PreToolUse` event with `tool_name: "Agent"` arrives, record: `pendingSubagent = { parentSessionId, tool_use_id, timestamp }`
2. When a new `session_id` is seen for the first time, if `pendingSubagent` exists and `event.timestamp - pendingSubagent.timestamp < 5000`, map `newSessionId → parentSessionId` in `parentMap`
3. Clear `pendingSubagent` after match (or after 5s timeout)

### Event Handling

Subagent events (session in `parentMap`):
- Appended to the parent session's event list with `_isSubagent: true` marker
- NOT added as a separate session in `sessions[]`
- On the graph: subagent nodes rendered offset from parent cluster, connected via amber dashed edge

### Left Rail

While subagents are active: tile shows `↳ N subagent(s)` indented beneath the session tile. Disappears when `SubagentStop` received.

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `app/globals.css` | Replace with new token set + background + animations |
| `app/layout.tsx` | Add font imports, ambient glow divs, background grid |
| `app/page.tsx` | 3-column grid layout, topbar, rail composition |
| `components/layout/LeftRail.tsx` | New — session tiles + stats grid |
| `components/layout/RightRail.tsx` | New — inspector + timeline + files stacked |
| `components/layout/Topbar.tsx` | New — app name + live-dot pill |
| `components/canvas/OrbNode.tsx` | New — orb node (replaces ToolCallNode, NotificationNode, StopNode) |
| `components/canvas/AnimatedEdge.tsx` | New — breathing stroke + particle overlay |
| `components/canvas/GraphCanvas.tsx` | Register new node/edge types, remove old node components |
| `components/panels/InspectorPanel.tsx` | Reskin to glass panel, remove own header (rail owns header) |
| `components/panels/Timeline.tsx` | Reskin to glass panel style |
| `components/panels/HeatmapPanel.tsx` | Reskin to glass panel style, remove own panel shell |
| `hooks/useSSE.ts` | Add subagent detection + parentMap; export `SessionInfo` with `subagentCount` |
| `lib/types.ts` | Add `SessionEvent` wrapper type `{ event: ClaudeEvent; isSubagent: boolean }` — keeps wire types clean |
| `package.json` | Add `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` |

---

## Out of Scope (v0.1)

- Responsive/mobile layout (< 1200px)
- Light mode
- Node drag-to-rearrange on canvas
- Clicking subagent indicator to expand/collapse
- Transcript panel (already deferred)
- Particle physics / collision avoidance

---

## Success Criteria

- [ ] All 11 CSS tokens in place, page background matches cc-visualizer-pro aesthetic
- [ ] IBM Plex Sans/Mono rendering in all UI text
- [ ] 3-column layout renders at 1440px+ without overflow
- [ ] Topbar shows live-dot connected state
- [ ] Session tiles in left rail, active state highlighted
- [ ] Stats panel shows live event/tool counts
- [ ] Graph canvas has orb nodes (not rectangles)
- [ ] Active nodes pulse
- [ ] Edges breathe and show traveling particle on active tool calls
- [ ] Right rail shows inspector + timeline + files stacked
- [ ] Subagent events grouped under parent session (no separate tab)
- [ ] TypeScript build clean
