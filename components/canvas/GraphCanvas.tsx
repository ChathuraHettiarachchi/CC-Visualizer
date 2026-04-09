"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-3d";
import type { ClaudeEvent } from "@/lib/types";
import { eventsToGraph } from "@/lib/events-to-graph";
import * as THREE from "three";

// Dynamic import — Three.js/WebGL requires the browser.
// Cast to `any` for JSX usage to work around next/dynamic stripping the ref prop
// from the inferred component type. The underlying ForceGraph3D component does
// accept a ref via its FCwithRef signature; `any` is the standard workaround.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D: any = dynamic(
  () => import("react-force-graph-3d").then((m) => m.default),
  { ssr: false, loading: () => null }
);

export interface SelectedNode {
  id: string;
  type: string | undefined;
  data: Record<string, unknown>;
}

interface GraphCanvasProps {
  events: ClaudeEvent[];
  sessionId: string;
  onNodeSelect?: (node: SelectedNode | null) => void;
  onSecondNodeSelect?: (node: SelectedNode | null) => void;
}

const START_COLOR = "#22c55e";

const TYPE_COLOR: Record<string, string> = {
  toolcall:     "#61d0ff",
  notification: "#ffbf69",
  stop:         "#7cf3c8",
};

const TYPE_VAL: Record<string, number> = {
  toolcall:     5,
  notification: 9,
  stop:         11,
};

const SESSION_COLORS = ["#61d0ff","#7cf3c8","#ffbf69","#a78bfa","#f87171","#4ade80"];

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

function makeNodeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 56;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 56);
  ctx.font = "bold 20px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "rgba(237,245,255,0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 18), 128, 28);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(28, 7, 1);
  return sprite;
}

function makeSessionLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 320, 80);
  ctx.font = "bold 26px 'IBM Plex Mono', monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 160, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(48, 12, 1);
  return sprite;
}

// Animated pulsing ring around the start node
let startPulseFrame = 0;
const startPulseMeshes: THREE.Mesh[] = [];

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

function makeStartRing(size: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(size + 3, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: START_COLOR,
    transparent: true,
    opacity: 0.35,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  startPulseMeshes.push(mesh);
  return mesh;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function durationColor(duration: number | null, minMs: number, maxMs: number): string {
  if (duration === null) return TYPE_COLOR.toolcall;
  if (maxMs === minMs) return "#22c55e";
  const t = (duration - minMs) / (maxMs - minMs); // 0=fast, 1=slow
  if (t < 0.5) {
    const u = t * 2;
    return `rgb(${Math.round(34 + u * (255 - 34))}, ${Math.round(197 + u * (191 - 197))}, ${Math.round(94 + u * (105 - 94))})`;
  } else {
    const u = (t - 0.5) * 2;
    return `rgb(${Math.round(255 + u * (248 - 255))}, ${Math.round(191 + u * (113 - 191))}, ${Math.round(105 + u * (113 - 105))})`;
  }
}

export default function GraphCanvas({ events, sessionId, onNodeSelect, onSecondNodeSelect }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Track container size so the 3D canvas fills its parent
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setDims({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clear accumulated start-node pulse meshes when graph rebuilds
  useEffect(() => {
    startPulseMeshes.length = 0;
    statusRingMeshes.length = 0;
  }, [events]);

  // Convert events → 3D graph data
  const graphData = useMemo(() => {
    const { nodes, edges } = eventsToGraph(events);
    return {
      nodes: nodes.map((n) => ({
        id:      n.id,
        type:    n.type,
        data:    n.data,
        isStart: (n.data as Record<string, unknown>)?.isStart ?? false,
      })),
      links: edges.map((e) => ({
        source:   e.source,
        target:   e.target,
        isActive: ((e.data as Record<string, unknown>)?.isActive ?? false) as boolean,
      })),
    };
  }, [events]);

  // After simulation settles, fly camera to the start node (set flag on session change)
  const fgRef = useRef<ForceGraphMethods>(undefined);
  const flyToStart = useRef(false);

  useEffect(() => {
    flyToStart.current = true;
    setFollowMode(false);
    prevNodeCountRef.current = 0;
  }, [sessionId]);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Heatmap ───────────────────────────────────────────────────────────────
  const [heatmapMode, setHeatmapMode] = useState(false);

  const durationRange = useMemo(() => {
    const durations = graphData.nodes
      .map(n => ((n as Record<string, unknown>).data as Record<string, unknown>)?.duration as number | null)
      .filter((d): d is number => d !== null);
    if (durations.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...durations), max: Math.max(...durations) };
  }, [graphData.nodes]);

  // ── Follow mode ───────────────────────────────────────────────────────────
  // When active, every new node added to the end auto-selects and the camera follows it.
  const [followMode, setFollowMode] = useState(false);

  // ── Playback ──────────────────────────────────────────────────────────────
  const [playbackIdx, setPlaybackIdx] = useState<number | null>(null);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const isPlaying = playbackIdx !== null;

  const orderedPlaybackNodes = useMemo(() =>
    graphData.nodes
      .filter(n => (n as Record<string, unknown>).type !== "__session_label")
      .sort((a, b) => {
        const aTs = ((a as Record<string, unknown>).data as Record<string, unknown>)?.timestamp as number ?? 0;
        const bTs = ((b as Record<string, unknown>).data as Record<string, unknown>)?.timestamp as number ?? 0;
        return aTs - bTs;
      }),
    [graphData.nodes]
  );

  // Follow mode: when new nodes arrive, fly to and select the latest one
  const prevNodeCountRef = useRef(0);
  useEffect(() => {
    const count = orderedPlaybackNodes.length;
    if (followMode && count > prevNodeCountRef.current && count > 0) {
      const node = orderedPlaybackNodes[count - 1] as Record<string, unknown>;
      onNodeSelect?.({
        id:   node.id as string,
        type: node.type as string | undefined,
        data: (node.data as Record<string, unknown>) ?? {},
      });
      if (fgRef.current && node.x !== undefined) {
        fgRef.current.cameraPosition(
          { x: (node.x as number) + 20, y: (node.y as number) + 20, z: (node.z as number) + 120 },
          { x: node.x as number, y: node.y as number, z: node.z as number },
          600
        );
      }
    }
    prevNodeCountRef.current = count;
  }, [orderedPlaybackNodes, followMode, onNodeSelect]);

  // Advance playback: fly to node, select it, then advance after delay
  useEffect(() => {
    if (playbackIdx === null) return;
    if (playbackIdx >= orderedPlaybackNodes.length) {
      setPlaybackIdx(null);
      return;
    }
    const node = orderedPlaybackNodes[playbackIdx] as Record<string, unknown>;
    onNodeSelect?.({
      id:   node.id as string,
      type: node.type as string | undefined,
      data: (node.data as Record<string, unknown>) ?? {},
    });
    if (fgRef.current && node.x !== undefined) {
      const x = node.x as number;
      const y = node.y as number;
      const z = node.z as number;
      fgRef.current.cameraPosition(
        { x: x + 20, y: y + 20, z: z + 120 },
        { x, y, z },
        700
      );
    }
    const timer = setTimeout(
      () => setPlaybackIdx(idx => idx !== null ? idx + 1 : null),
      Math.round(2200 / replaySpeed)
    );
    return () => clearTimeout(timer);
  }, [playbackIdx, orderedPlaybackNodes, onNodeSelect, replaySpeed]);

  // ── Export ────────────────────────────────────────────────────────────────
  function exportPNG() {
    if (!fgRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = (fgRef.current as any).renderer?.() as THREE.WebGLRenderer | undefined;
    if (!renderer) return;
    const url = renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId}-${Date.now()}.png`;
    a.click();
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleNodeClick = useCallback(
    (node: Record<string, unknown>, event: MouseEvent) => {
      if (node.type === "__session_label") return;
      setPlaybackIdx(null);
      setFollowMode(false); // manual click exits follow mode
      const selected: SelectedNode = {
        id:   node.id as string,
        type: node.type as string | undefined,
        data: (node.data as Record<string, unknown>) ?? {},
      };
      if (event?.shiftKey && onSecondNodeSelect) {
        onSecondNodeSelect(selected);
      } else {
        onNodeSelect?.(selected);
        onSecondNodeSelect?.(null);
      }
    },
    [onNodeSelect, onSecondNodeSelect]
  );

  const handleBackgroundClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const handleLinkClick = useCallback(
    (link: Record<string, unknown>) => {
      const targetId = typeof link.target === "object" && link.target !== null
        ? (link.target as Record<string, unknown>).id as string
        : link.target as string;
      const targetNode = graphData.nodes.find((n) => (n as Record<string, unknown>).id === targetId);
      if (!targetNode) return;
      const n = targetNode as Record<string, unknown>;
      if (n.type === "__session_label") return;
      onNodeSelect?.({
        id:   n.id as string,
        type: n.type as string | undefined,
        data: (n.data as Record<string, unknown>) ?? {},
      });
      // Fly camera to target node
      if (fgRef.current && n.x !== undefined) {
        const x = n.x as number;
        const y = n.y as number;
        const z = n.z as number;
        fgRef.current.cameraPosition(
          { x: x + 60, y: y + 40, z: z + 100 },
          { x, y, z },
          600
        );
      }
    },
    [graphData.nodes, onNodeSelect]
  );

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative", borderRadius: 16, overflow: "hidden" }}
    >
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dims.width}
        height={dims.height}
        backgroundColor="#07111f"
        nodeColor={(node: Record<string, unknown>) => {
          if (node.isStart) return START_COLOR;
          let base: string;
          if (heatmapMode && node.type === "toolcall") {
            const dur = ((node.data as Record<string, unknown>)?.duration as number | null) ?? null;
            base = durationColor(dur, durationRange.min, durationRange.max);
          } else if (node.type === "toolcall") {
            const toolName = ((node.data as Record<string, unknown>)?.toolName as string) ?? "";
            base = toolColor(toolName);
          } else {
            base = (node.sessionColor as string) ?? TYPE_COLOR[node.type as string] ?? "#61d0ff";
          }
          if (!searchQuery || node.type === "__session_label") return base;
          const label = node.type === "toolcall"
            ? (((node.data as Record<string, unknown>)?.toolName as string) ?? "tool")
            : (node.type as string);
          const matches = label.toLowerCase().includes(searchQuery.toLowerCase());
          return matches ? base : `${base}15`;
        }}
        nodeVal={(node: Record<string, unknown>) => {
          if (node.type === "__session_label") return 0;
          if (node.type === "toolcall") {
            const dur = ((node.data as Record<string, unknown>)?.duration as number | null) ?? null;
            return toolNodeSize(dur, durationRange.min, durationRange.max);
          }
          return TYPE_VAL[node.type as string] ?? 4;
        }}
        nodeResolution={16}
        nodeOpacity={0.92}
        linkColor={(link: Record<string, unknown>) => {
          const c = link.sessionColor as string | undefined;
          return c ? `${c}88` : "rgba(140,194,255,0.5)";
        }}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowColor={() => "rgba(140,194,255,0.6)"}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={(link: Record<string, unknown>) => (link.isActive ? 4 : 0)}
        linkDirectionalParticleColor={(link: Record<string, unknown>) =>
          (link.sessionColor as string) ?? "#61d0ff"
        }
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={2}
        nodeThreeObjectExtend={(node: Record<string, unknown>) => node.type !== "__session_label"}
        nodeThreeObject={(node: Record<string, unknown>) => {
          if (node.type === "__session_label") {
            return makeSessionLabel(node.sessionLabel as string, node.sessionColor as string);
          }
          const label = node.type === "toolcall"
            ? ((node.data as Record<string, unknown>)?.toolName as string || "tool")
            : (node.type as string);
          const size = TYPE_VAL[node.type as string] ?? 5;

          if (node.isStart) {
            // Group: label sprite + pulsing ring
            const group = new THREE.Group();
            const sprite = makeNodeLabel(label);
            sprite.position.y = size + 7;
            group.add(sprite);
            const ring = makeStartRing(size);
            group.add(ring);
            return group;
          }

          const sprite = makeNodeLabel(label);
          sprite.position.y = size + 7;
          return sprite;
        }}
        nodeLabel={(node: Record<string, unknown>) => {
          if (node.type === "__session_label") return "";
          const nData = (node.data as Record<string, unknown>) ?? {};
          const title = node.type === "toolcall"
            ? (nData.toolName as string || "Tool Call")
            : (node.type as string);
          const input = nData.toolInput;
          let inputStr = "";
          if (input && typeof input === "object") {
            inputStr = escapeHtml(JSON.stringify(input, null, 2));
            if (inputStr.length > 600) inputStr = inputStr.slice(0, 600) + "\n…";
          }
          return [
            `<div style="background:rgba(10,22,40,0.96);border:1px solid rgba(140,194,255,0.28);`,
            `border-radius:14px;padding:12px 16px;font-family:'IBM Plex Mono',monospace;`,
            `max-width:320px;box-shadow:0 8px 40px rgba(0,0,0,0.5);pointer-events:none">`,
            `<div style="color:#edf5ff;font-size:13px;font-weight:700;margin-bottom:${inputStr ? "8" : "0"}px">`,
            escapeHtml(title),
            `</div>`,
            inputStr
              ? `<pre style="color:#91a8c7;font-size:11px;margin:0;white-space:pre-wrap;overflow:auto;max-height:220px;line-height:1.5">${inputStr}</pre>`
              : "",
            `</div>`,
          ].join("");
        }}
        rendererConfig={{ preserveDrawingBuffer: true }}
        warmupTicks={120}
        cooldownTicks={200}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.5}
        showNavInfo={false}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onLinkClick={handleLinkClick}
        onEngineStop={() => {
          if (flyToStart.current && fgRef.current) {
            flyToStart.current = false;
            const startNode = graphData.nodes.find(
              (n) => (n as Record<string, unknown>).isStart
            ) as Record<string, unknown> | undefined;
            if (startNode && startNode.x !== undefined) {
              const x = startNode.x as number;
              const y = startNode.y as number;
              const z = startNode.z as number;
              fgRef.current.cameraPosition(
                { x: x + 20, y: y + 20, z: z + 120 },
                { x, y, z },
                600
              );
            } else if (fgRef.current) {
              fgRef.current.zoomToFit(600, 40);
            }
          }
        }}
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
      />

      {/* Search overlay — client-only */}
      {mounted && (
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search nodes…"
            style={{
              background: "rgba(7,17,31,0.82)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(140,194,255,0.18)", borderRadius: 20,
              color: "#edf5ff", fontSize: 12, padding: "6px 14px",
              fontFamily: "'IBM Plex Mono', monospace", outline: "none", width: 180,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none", border: "none",
                color: "#91a8c7", cursor: "pointer", fontSize: 14,
              }}
            >✕</button>
          )}
          <button
            onClick={() => setHeatmapMode(m => !m)}
            style={{
              background: heatmapMode ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${heatmapMode ? "rgba(248,113,113,0.4)" : "rgba(140,194,255,0.2)"}`,
              borderRadius: 14, color: heatmapMode ? "#f87171" : "#91a8c7",
              cursor: "pointer", fontSize: 11, padding: "4px 12px",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {heatmapMode ? "● Heatmap" : "○ Heatmap"}
          </button>
          <button
            onClick={() => {
              const node = orderedPlaybackNodes[0];
              if (!node || !fgRef.current) return;
              setFollowMode(false);
              const n = node as Record<string, unknown>;
              onNodeSelect?.({ id: n.id as string, type: n.type as string | undefined, data: (n.data as Record<string, unknown>) ?? {} });
              if (n.x !== undefined) {
                fgRef.current.cameraPosition(
                  { x: (n.x as number) + 20, y: (n.y as number) + 20, z: (n.z as number) + 120 },
                  { x: n.x as number, y: n.y as number, z: n.z as number },
                  600
                );
              }
            }}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(140,194,255,0.2)",
              borderRadius: 14, color: "#91a8c7", cursor: "pointer",
              fontSize: 11, padding: "4px 12px", fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ⇤ First
          </button>
          <button
            onClick={() => {
              const node = orderedPlaybackNodes[orderedPlaybackNodes.length - 1];
              if (!node || !fgRef.current) return;
              const isNowFollow = !followMode;
              setFollowMode(isNowFollow);
              const n = node as Record<string, unknown>;
              onNodeSelect?.({ id: n.id as string, type: n.type as string | undefined, data: (n.data as Record<string, unknown>) ?? {} });
              if (n.x !== undefined) {
                fgRef.current.cameraPosition(
                  { x: (n.x as number) + 20, y: (n.y as number) + 20, z: (n.z as number) + 120 },
                  { x: n.x as number, y: n.y as number, z: n.z as number },
                  600
                );
              }
            }}
            style={{
              background: followMode ? "rgba(124,243,200,0.15)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${followMode ? "rgba(124,243,200,0.45)" : "rgba(140,194,255,0.2)"}`,
              borderRadius: 14, color: followMode ? "#7cf3c8" : "#91a8c7", cursor: "pointer",
              fontSize: 11, padding: "4px 12px", fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {followMode ? "● Last" : "Last ⇥"}
          </button>
        </div>
      )}

      {/* Export buttons — top-right */}
      {mounted && (
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
          {(["PNG", "JSON"] as const).map(fmt => (
            <button
              key={fmt}
              onClick={fmt === "PNG" ? exportPNG : exportJSON}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(140,194,255,0.2)",
                borderRadius: 14, color: "#91a8c7", cursor: "pointer",
                fontSize: 11, padding: "4px 12px",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              ↓ {fmt}
            </button>
          ))}
        </div>
      )}

      {/* Playback controls — client-only to avoid SSR/hydration mismatch */}
      {mounted && <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(7,17,31,0.82)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(140,194,255,0.18)", borderRadius: 40,
        padding: "8px 18px", fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {isPlaying ? (
          <>
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setReplaySpeed(speed)}
                style={{
                  background: replaySpeed === speed ? "rgba(97,208,255,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${replaySpeed === speed ? "rgba(97,208,255,0.5)" : "rgba(140,194,255,0.15)"}`,
                  borderRadius: 14, color: replaySpeed === speed ? "#61d0ff" : "#91a8c7",
                  cursor: "pointer", fontSize: 11, padding: "3px 9px", fontFamily: "inherit",
                }}
              >
                {speed}×
              </button>
            ))}
            <span style={{ color: "#91a8c7", fontSize: 12 }}>
              {playbackIdx! + 1} / {orderedPlaybackNodes.length}
            </span>
            <button
              onClick={() => setPlaybackIdx(null)}
              style={{
                background: "rgba(140,194,255,0.12)", border: "1px solid rgba(140,194,255,0.25)",
                borderRadius: 20, color: "#edf5ff", cursor: "pointer",
                fontSize: 13, padding: "4px 14px", fontFamily: "inherit",
              }}
            >
              ■ Stop
            </button>
          </>
        ) : (
          <button
            onClick={() => orderedPlaybackNodes.length > 0 && setPlaybackIdx(0)}
            style={{
              background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)",
              borderRadius: 20, color: "#22c55e", cursor: "pointer",
              fontSize: 13, padding: "4px 18px", fontFamily: "inherit",
            }}
          >
            ▶ Replay Session
          </button>
        )}
      </div>}
    </div>
  );
}
