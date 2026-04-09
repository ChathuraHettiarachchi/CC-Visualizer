# Graph Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make individual graph nodes visually distinct and self-describing — color by tool name, size by duration, shape by status, richer labels, and status rings — with zero new files.

**Architecture:** Two file changes only: `lib/events-to-graph.ts` gets error detection (regex on tool_response), and `components/canvas/GraphCanvas.tsx` gets helper functions plus a rewritten `nodeThreeObject` that returns a `THREE.Group` owning the geometry, label sprite, and status ring. Tasks 1–4 build infrastructure; Task 5 assembles it into the final rewrite.

**Tech Stack:** Three.js (already imported), react-force-graph-3d, TypeScript. No new files, no new dependencies.

---

### Task 1: Error detection in eventsToGraph

**Files:**
- Modify: `lib/events-to-graph.ts:60-74`

- [ ] **Step 1: Add isError detection and update status field**

In `lib/events-to-graph.ts`, locate the `graphItems.push({...})` block for toolcall nodes (around line 63). Replace:

```ts
        graphItems.push({
          id: `tool-${event.tool_use_id}`,
          type: "toolcall",
          isStart: graphItems.length === 0,
          data: {
            toolName: event.tool_name,
            toolInput: event.tool_input,
            toolResponse: entry.post?.tool_response ?? undefined,
            status: entry.post ? "complete" : "pending",
            timestamp: event.timestamp,
            duration,
          },
        });
```

With:

```ts
        const isError = entry.post
          ? (typeof entry.post.tool_response === "string" &&
             /error|exception|failed|traceback/i.test(entry.post.tool_response.slice(0, 500)))
          : false;

        graphItems.push({
          id: `tool-${event.tool_use_id}`,
          type: "toolcall",
          isStart: graphItems.length === 0,
          data: {
            toolName: event.tool_name,
            toolInput: event.tool_input,
            toolResponse: entry.post?.tool_response ?? undefined,
            status: isError ? "error" : entry.post ? "complete" : "pending",
            timestamp: event.timestamp,
            duration,
          },
        });
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/events-to-graph.ts
git commit -m "feat(graph): detect error status from tool_response content"
```

---

### Task 2: Tool color palette and size-by-duration helpers

**Files:**
- Modify: `components/canvas/GraphCanvas.tsx` — add helpers above component, update `nodeColor` and `nodeVal`

- [ ] **Step 1: Add TOOL_PALETTE, toolColor, and toolNodeSize after SESSION_COLORS (line 47)**

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

function toolNodeSize(duration: number | null, minMs: number, maxMs: number): number {
  if (duration === null || maxMs === minMs) return 5;
  const t = (duration - minMs) / (maxMs - minMs);
  return Math.round(4 + t * 10); // range: 4–14
}
```

- [ ] **Step 2: Update nodeColor to use toolColor for non-heatmap toolcall nodes**

Locate the `nodeColor` prop in `<ForceGraph3D>` (around line 343). Find the `else` branch that sets `base` for non-heatmap non-start nodes:

```ts
          } else {
            base = (node.sessionColor as string) ?? TYPE_COLOR[node.type as string] ?? "#61d0ff";
          }
```

Replace with:

```ts
          } else if (node.type === "toolcall") {
            const toolName = ((node.data as Record<string, unknown>)?.toolName as string) ?? "";
            base = toolColor(toolName);
          } else {
            base = (node.sessionColor as string) ?? TYPE_COLOR[node.type as string] ?? "#61d0ff";
          }
```

- [ ] **Step 3: Update nodeVal to use toolNodeSize for toolcall nodes**

Locate the `nodeVal` prop (around line 359):

```ts
        nodeVal={(node: Record<string, unknown>) => {
          if (node.type === "__session_label") return 0;
          return TYPE_VAL[node.type as string] ?? 4;
        }}
```

Replace with:

```ts
        nodeVal={(node: Record<string, unknown>) => {
          if (node.type === "__session_label") return 0;
          if (node.type === "toolcall") {
            const dur = ((node.data as Record<string, unknown>)?.duration as number | null) ?? null;
            return toolNodeSize(dur, durationRange.min, durationRange.max);
          }
          return TYPE_VAL[node.type as string] ?? 4;
        }}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add components/canvas/GraphCanvas.tsx
git commit -m "feat(graph): color toolcall nodes by tool name, size by duration"
```

---

### Task 3: Richer label helper

**Files:**
- Modify: `components/canvas/GraphCanvas.tsx` — add `formatNodeLabel` above the component

- [ ] **Step 1: Add formatNodeLabel after toolNodeSize**

Add this function immediately after `toolNodeSize`:

```ts
function formatNodeLabel(node: Record<string, unknown>): string {
  const data = (node.data as Record<string, unknown>) ?? {};
  if (node.type === "toolcall") {
    const toolName = (data.toolName as string) ?? "tool";
    const status = data.status as string;
    const duration = data.duration as number | null;
    if (status === "error") return `${toolName} ✕`;
    if (status === "pending" || duration === null) return `${toolName} …`;
    const durStr = duration >= 1000
      ? `${(duration / 1000).toFixed(1)}s`
      : `${duration}ms`;
    return `${toolName} ${durStr}`;
  }
  if (node.type === "notification") {
    const msg = (data.message as string) ?? "";
    return msg.slice(0, 20);
  }
  return (node.type as string) ?? "stop";
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/canvas/GraphCanvas.tsx
git commit -m "feat(graph): formatNodeLabel helper with duration and status suffix"
```

---

### Task 4: Status ring infrastructure

**Files:**
- Modify: `components/canvas/GraphCanvas.tsx` — add `makeStatusRing`, `statusRingMeshes`, `statusRingFrame`, clear on rebuild, animate in `onRenderFramePre`

- [ ] **Step 1: Add statusRingFrame, statusRingMeshes, and makeStatusRing**

Locate the module-level declarations (lines 86–99):

```ts
let startPulseFrame = 0;
const startPulseMeshes: THREE.Mesh[] = [];

function makeStartRing(size: number): THREE.Mesh {
```

Add immediately after `const startPulseMeshes: THREE.Mesh[] = [];` and before `function makeStartRing`:

```ts
let statusRingFrame = 0;
const statusRingMeshes: THREE.Mesh[] = [];

function makeStatusRing(size: number, color: string): THREE.Mesh {
  const geo = new THREE.SphereGeometry(size + 2.5, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    wireframe: true,
  });
  return new THREE.Mesh(geo, mat);
}
```

- [ ] **Step 2: Clear statusRingMeshes when graph rebuilds**

Locate the useEffect that clears `startPulseMeshes`:

```ts
  useEffect(() => {
    startPulseMeshes.length = 0;
  }, [events]);
```

Replace with:

```ts
  useEffect(() => {
    startPulseMeshes.length = 0;
    statusRingMeshes.length = 0;
  }, [events]);
```

- [ ] **Step 3: Animate statusRingMeshes in onRenderFramePre**

Locate `onRenderFramePre` (around line 458):

```ts
        onRenderFramePre={() => {
          // Pulse the start node rings every frame regardless of simulation state
          startPulseFrame += 0.04;
          const scale = 1 + 0.28 * Math.sin(startPulseFrame);
          const opacity = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(startPulseFrame));
          startPulseMeshes.forEach((m) => {
            m.scale.setScalar(scale);
            (m.material as THREE.MeshBasicMaterial).opacity = opacity;
          });
        }}
```

Replace with:

```ts
        onRenderFramePre={() => {
          startPulseFrame += 0.04;
          const scale = 1 + 0.28 * Math.sin(startPulseFrame);
          const opacity = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(startPulseFrame));
          startPulseMeshes.forEach((m) => {
            m.scale.setScalar(scale);
            (m.material as THREE.MeshBasicMaterial).opacity = opacity;
          });

          statusRingFrame += 0.05;
          const ringScale = 1 + 0.2 * Math.sin(statusRingFrame);
          const ringOpacity = 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(statusRingFrame));
          statusRingMeshes.forEach((m) => {
            m.scale.setScalar(ringScale);
            (m.material as THREE.MeshBasicMaterial).opacity = ringOpacity;
          });
        }}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add components/canvas/GraphCanvas.tsx
git commit -m "feat(graph): status ring infrastructure for pending/error animation"
```

---

### Task 5: Node shape by status — full Three.js ownership

**Files:**
- Modify: `components/canvas/GraphCanvas.tsx` — add `nodeMaterialMap`, reactive color useEffect, switch `nodeThreeObjectExtend=false`, rewrite `nodeThreeObject`

- [ ] **Step 1: Add nodeMaterialMap after statusRingMeshes**

After `const statusRingMeshes: THREE.Mesh[] = [];`, add:

```ts
// Tracks materials by node id for reactive color updates (heatmap / search)
const nodeMaterialMap = new Map<string, THREE.MeshLambertMaterial>();
```

- [ ] **Step 2: Clear nodeMaterialMap in the rebuild useEffect**

Locate the useEffect from Task 4 Step 2:

```ts
  useEffect(() => {
    startPulseMeshes.length = 0;
    statusRingMeshes.length = 0;
  }, [events]);
```

Replace with:

```ts
  useEffect(() => {
    startPulseMeshes.length = 0;
    statusRingMeshes.length = 0;
    nodeMaterialMap.clear();
  }, [events]);
```

- [ ] **Step 3: Add reactive material color useEffect**

Inside the component, after the `durationRange` useMemo (around line 182), add:

```ts
  // Reactively update cached material colors when heatmap mode or search query changes
  useEffect(() => {
    nodeMaterialMap.forEach((mat, nodeId) => {
      const node = graphData.nodes.find(
        (n) => (n as Record<string, unknown>).id === nodeId
      ) as Record<string, unknown> | undefined;
      if (!node) return;

      if (node.isStart) {
        mat.color.set(START_COLOR);
        mat.opacity = 1;
        mat.needsUpdate = true;
        return;
      }

      let base: string;
      if (heatmapMode && node.type === "toolcall") {
        const dur = ((node.data as Record<string, unknown>)?.duration as number | null) ?? null;
        base = durationColor(dur, durationRange.min, durationRange.max);
      } else if (node.type === "toolcall") {
        const toolName = ((node.data as Record<string, unknown>)?.toolName as string) ?? "";
        base = toolColor(toolName);
      } else {
        base = TYPE_COLOR[node.type as string] ?? "#61d0ff";
      }

      if (searchQuery) {
        const matchLabel = node.type === "toolcall"
          ? (((node.data as Record<string, unknown>)?.toolName as string) ?? "tool")
          : (node.type as string);
        const matches = matchLabel.toLowerCase().includes(searchQuery.toLowerCase());
        mat.color.set(matches ? base : "#0a1628");
        mat.opacity = matches ? 1 : 0.15;
      } else {
        mat.color.set(base);
        mat.opacity = 1;
      }
      mat.needsUpdate = true;
    });
  }, [heatmapMode, searchQuery, durationRange, graphData.nodes]);
```

- [ ] **Step 4: Switch nodeThreeObjectExtend to false**

Locate:

```ts
        nodeThreeObjectExtend={(node: Record<string, unknown>) => node.type !== "__session_label"}
```

Replace with:

```ts
        nodeThreeObjectExtend={false}
```

- [ ] **Step 5: Rewrite nodeThreeObject to return a full THREE.Group**

Replace the entire `nodeThreeObject` prop (from `nodeThreeObject={(node` to its closing `}}`) with:

```ts
        nodeThreeObject={(node: Record<string, unknown>) => {
          // Session labels: sprite only, no geometry
          if (node.type === "__session_label") {
            return makeSessionLabel(node.sessionLabel as string, node.sessionColor as string);
          }

          const data = (node.data as Record<string, unknown>) ?? {};
          const status = data.status as string | undefined;
          const toolName = (data.toolName as string) ?? "";
          const duration = data.duration as number | null;
          const size = node.type === "toolcall"
            ? toolNodeSize(duration, durationRange.min, durationRange.max)
            : (TYPE_VAL[node.type as string] ?? 5);

          // Geometry by status (toolcall only; others use sphere)
          let geometry: THREE.BufferGeometry;
          if (node.type === "toolcall") {
            if (status === "error") {
              geometry = new THREE.BoxGeometry(size * 1.4, size * 1.4, size * 1.4);
            } else if (status === "pending") {
              geometry = new THREE.OctahedronGeometry(size);
            } else {
              geometry = new THREE.SphereGeometry(size, 16, 16);
            }
          } else {
            geometry = new THREE.SphereGeometry(size, 16, 16);
          }

          // Material color (initial; useEffect keeps it reactive)
          let baseColor: string;
          if (node.isStart) {
            baseColor = START_COLOR;
          } else if (heatmapMode && node.type === "toolcall") {
            baseColor = durationColor(duration, durationRange.min, durationRange.max);
          } else if (node.type === "toolcall") {
            baseColor = toolColor(toolName);
          } else {
            baseColor = TYPE_COLOR[node.type as string] ?? "#61d0ff";
          }

          const mat = new THREE.MeshLambertMaterial({
            color: baseColor,
            transparent: true,
            opacity: 1,
          });
          nodeMaterialMap.set(node.id as string, mat);

          const group = new THREE.Group();
          group.add(new THREE.Mesh(geometry, mat));

          // Label sprite above the mesh
          const sprite = makeNodeLabel(formatNodeLabel(node));
          sprite.position.y = size + 7;
          group.add(sprite);

          // Status ring: pulsing amber for pending, static red for error, green for start
          if (node.isStart) {
            const ring = makeStartRing(size);
            group.add(ring);
          } else if (node.type === "toolcall" && status === "pending") {
            const ring = makeStatusRing(size, "#ffbf69");
            statusRingMeshes.push(ring);
            group.add(ring);
          } else if (node.type === "toolcall" && status === "error") {
            group.add(makeStatusRing(size, "#f87171"));
            // error ring stays at fixed opacity — not pushed to statusRingMeshes
          }

          return group;
        }}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add components/canvas/GraphCanvas.tsx
git commit -m "feat(graph): node shape by status with full Three.js ownership (sphere/octahedron/box)"
```

---

## Self-Review

**Spec coverage:**
- Section 1 (Color by tool name): ✅ Task 2 adds `toolColor()`, Task 5 uses it in initial material color. Heatmap override preserved in both `nodeColor` and `nodeThreeObject`.
- Section 2 (Size by duration): ✅ Task 2 adds `toolNodeSize()`, updates `nodeVal`. Task 5 uses it for geometry sizing.
- Section 3 (Richer label): ✅ Task 3 adds `formatNodeLabel()`. Task 5 uses `formatNodeLabel(node)` in the sprite.
- Section 4 (Status rings): ✅ Task 4 adds `makeStatusRing()`, `statusRingMeshes`, animation. Task 5 creates rings inside the Group — pending rings pushed to `statusRingMeshes`, error rings static.
- Section 5 (Node shape): ✅ Task 5 switches `nodeThreeObjectExtend=false`, returns `THREE.Group` with SphereGeometry (complete), OctahedronGeometry (pending), BoxGeometry (error). Session labels unaffected (early return with Sprite).
- Section 6 (Error detection): ✅ Task 1.

**Acceptance criteria:**
- AC-1: `toolColor()` is deterministic. With 10 palette entries and fewer than 10 tools, all get unique colors. Heatmap still overrides via `durationColor()` in both `nodeThreeObject` and the reactive useEffect. ✅
- AC-2: `toolNodeSize()` returns 4–14 range. `null` duration → 5. `nodeVal` still drives physics with same values. Non-toolcall nodes use `TYPE_VAL` sizes. ✅
- AC-3: `formatNodeLabel()` implements all cases: `"Bash 1.2s"`, `"Bash 340ms"`, `"Bash …"`, `"Bash ✕"`, notification excerpt (20 chars). ✅
- AC-4: Pending → amber pulsing ring (in `statusRingMeshes`). Error → red static ring (not in `statusRingMeshes`). Complete → no ring. Start node → green ring via `makeStartRing`. ✅
- AC-5: Complete → sphere, pending → octahedron, error → box. Session labels → sprite-only. `tsc --noEmit` runs after each task. ✅

**Placeholder scan:** No TBDs. All steps have complete code.

**Type consistency:**
- `toolColor(name: string)` — defined Task 2, used Task 2 (nodeColor) and Task 5 (nodeThreeObject, useEffect)
- `toolNodeSize(duration, minMs, maxMs)` — defined Task 2, called with `durationRange.min/max` throughout
- `formatNodeLabel(node: Record<string, unknown>)` — defined Task 3, used Task 5
- `makeStatusRing(size, color)` — defined Task 4, used Task 5
- `nodeMaterialMap: Map<string, THREE.MeshLambertMaterial>` — declared Task 5 Step 1, cleared Task 5 Step 2, populated in `nodeThreeObject`, read in reactive useEffect
- `statusRingMeshes: THREE.Mesh[]` — declared Task 4, cleared Task 4 Step 2 (updated in Task 5 Step 2), populated in Task 5's `nodeThreeObject`
