# Graph Visual Overhaul — Design Spec

**Date:** 2026-04-09
**Status:** Approved

---

## Goal

Make individual nodes visually distinct and self-describing. At a glance the developer should know: which tool ran, how long it took, and whether it succeeded, errored, or is still running — without clicking anything.

---

## Architecture

Single file change: `components/canvas/GraphCanvas.tsx`.
Supporting change: `lib/events-to-graph.ts` — add error detection to node data.

No new files. No changes to layout, panels, hooks, or types.

---

## Changes

### 1. Color by tool name

Add a deterministic `toolColor(name: string): string` function above the component.

```ts
const TOOL_PALETTE = [
  "#61d0ff", // blue
  "#7cf3c8", // teal
  "#ffbf69", // amber
  "#a78bfa", // purple
  "#f87171", // red
  "#4ade80", // green
  "#fb923c", // orange
  "#e879f9", // pink
  "#38bdf8", // sky
  "#facc15", // yellow
];

function toolColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return TOOL_PALETTE[Math.abs(hash) % TOOL_PALETTE.length];
}
```

Update `nodeColor` for `toolcall` nodes to use `toolColor(node.data.toolName)` instead of the flat `TYPE_COLOR.toolcall`. Heatmap mode overrides this (existing behavior preserved).

### 2. Size by duration

Add a `toolNodeSize(duration, min, max): number` function:

```ts
function toolNodeSize(duration: number | null, minMs: number, maxMs: number): number {
  if (duration === null || maxMs === minMs) return 5;
  const t = (duration - minMs) / (maxMs - minMs);
  return Math.round(4 + t * 10); // 4–14
}
```

Update `nodeVal` for `toolcall` nodes to use `toolNodeSize(node.data.duration, durationRange.min, durationRange.max)`. Non-toolcall nodes keep existing values.

### 3. Richer label

Update `makeNodeLabel` call inside `nodeThreeObject`:

- toolcall complete: `"${toolName} ${duration >= 1000 ? (duration/1000).toFixed(1)+'s' : duration+'ms'}"`
- toolcall running: `"${toolName} …"`
- toolcall error: `"${toolName} ✕"`
- notification: first 20 chars of `message`
- stop: `"stop"`

### 4. Status rings

Generalize the existing `makeStartRing` into `makeStatusRing(size, color)`. Remove the start-node-only restriction.

Add a `statusRingMeshes` module-level array (separate from `startPulseMeshes`) to track running-node rings for animation.

Ring rules per toolcall node:
- `status === "pending"` → amber (`#ffbf69`) pulsing ring, added to `statusRingMeshes`
- `status === "error"` → red (`#f87171`) static ring (opacity fixed at 0.5, no pulse)
- `status === "complete"` → no ring

Animate `statusRingMeshes` in `onRenderFramePre` alongside the existing start pulse.

### 5. Node shape by status

Switch `nodeThreeObjectExtend` from `true` to `false` for all nodes. Take full ownership of the Three.js object in `nodeThreeObject`.

Return a `THREE.Group` containing:
1. **Geometry mesh** — colored with `toolColor` (or type color for non-toolcall):
   - complete → `SphereGeometry(size, 16, 16)`
   - pending/running → `OctahedronGeometry(size)`
   - error → `BoxGeometry(size*1.4, size*1.4, size*1.4)`
2. **Label sprite** — positioned above the mesh (y = size + 7), same canvas texture as before
3. **Status ring** — added to group (pending/error nodes only)

Material: `MeshLambertMaterial` with the node color. No wireframe on the main geometry (wireframe only on status rings).

### 6. Error detection in eventsToGraph

In `eventsToGraph`, update the toolcall data block to detect errors:

```ts
const isError = entry.post
  ? (typeof entry.post.tool_response === "string" &&
     /error|exception|failed|traceback/i.test(entry.post.tool_response.slice(0, 500)))
  : false;

data: {
  ...existing fields,
  status: isError ? "error" : entry.post ? "complete" : "pending",
}
```

---

## Acceptance Criteria

**AC-1: Color by tool name**
- Each unique tool name renders a consistent color across sessions
- Two different tool names never share the same color if fewer than 10 tools are present
- Heatmap mode still overrides node color (existing behavior)

**AC-2: Size by duration**
- The slowest toolcall node is visually larger than the fastest
- Nodes without duration data (pending or no PostToolUse) use base size 5
- Non-toolcall nodes (notification, stop) are unaffected

**AC-3: Richer label**
- Completed toolcall shows `"Bash 1.2s"` or `"Bash 340ms"` format
- In-flight toolcall shows `"Bash …"`
- Error toolcall shows `"Bash ✕"`
- Notification shows message excerpt (max 20 chars)

**AC-4: Status rings**
- Pending toolcall has a pulsing amber ring
- Error toolcall has a static red ring
- Completed toolcall has no ring
- Start node retains its existing green pulse ring

**AC-5: Node shape**
- Complete toolcall → sphere
- Running toolcall → octahedron
- Error toolcall → box
- Session label nodes are unaffected (still use their existing sprite-only rendering)
- `npx tsc --noEmit` passes

---

## Out of Scope

- No changes to edge rendering
- No changes to search, heatmap, playback, or export
- No new panels or layout changes
- No legend/key for tool colors (future enhancement)
