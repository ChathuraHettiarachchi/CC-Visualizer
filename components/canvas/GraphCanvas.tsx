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
  sessionGroups?: Map<string, ClaudeEvent[]>;
}

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

function buildClusteredGraph(sessionGroups: Map<string, ClaudeEvent[]>) {
  const allNodes: Record<string, unknown>[] = [];
  const allLinks: Record<string, unknown>[] = [];

  const entries = Array.from(sessionGroups.entries());
  const count = entries.length;
  const CLUSTER_RADIUS = count <= 1 ? 0 : Math.max(450, count * 160);

  entries.forEach(([sessionId, events], sessionIndex) => {
    const angle = (sessionIndex / count) * 2 * Math.PI;
    const cx = count > 1 ? CLUSTER_RADIUS * Math.cos(angle) : 0;
    const cz = count > 1 ? CLUSTER_RADIUS * Math.sin(angle) : 0;
    const color = SESSION_COLORS[sessionIndex % SESSION_COLORS.length];
    const sessionLabel = `Session ${sessionIndex + 1}`;

    const { nodes, edges } = eventsToGraph(events);

    // Pin each node to a spiral layout within the cluster
    nodes.forEach((node, i) => {
      const spiralAngle = (i / Math.max(nodes.length, 1)) * 4 * Math.PI;
      const r = Math.min(30 + i * 14, 130);
      allNodes.push({
        id:           node.id,
        type:         node.type,
        data:         node.data,
        sessionId,
        sessionColor: color,
        sessionLabel,
        fx: cx + r * Math.cos(spiralAngle),
        fy: (i % 5 - 2) * 28,
        fz: cz + r * Math.sin(spiralAngle),
      });
    });

    // Floating session label node at cluster top
    allNodes.push({
      id:           `__label_${sessionId}`,
      type:         "__session_label",
      data:         { label: sessionLabel },
      sessionId,
      sessionColor: color,
      sessionLabel,
      isLabel:      true,
      fx: cx,
      fy: 160,
      fz: cz,
    });

    edges.forEach(e => {
      allLinks.push({
        source:       e.source,
        target:       e.target,
        isActive:     ((e.data as Record<string, unknown>)?.isActive ?? false) as boolean,
        sessionColor: color,
      });
    });
  });

  return { nodes: allNodes, links: allLinks };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function GraphCanvas({ events, sessionId, onNodeSelect, sessionGroups }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });

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

  // Convert events → 3D graph data (reuse existing eventsToGraph, strip position)
  const graphData = useMemo(() => {
    if (sessionGroups && sessionGroups.size > 0) {
      return buildClusteredGraph(sessionGroups);
    }
    const { nodes, edges } = eventsToGraph(events);
    return {
      nodes: nodes.map((n) => ({
        id:   n.id,
        type: n.type,
        data: n.data,
      })),
      links: edges.map((e) => ({
        source:   e.source,
        target:   e.target,
        isActive: ((e.data as Record<string, unknown>)?.isActive ?? false) as boolean,
      })),
    };
  }, [events, sessionGroups]);

  // Reset camera when session changes
  const fgRef = useRef<ForceGraphMethods>(undefined);
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: 0 }, 800);
    }
  }, [sessionId]);

  const handleNodeClick = useCallback(
    (node: Record<string, unknown>) => {
      if ((node as Record<string, unknown>).type === "__session_label") return;
      onNodeSelect?.({
        id:   node.id as string,
        type: node.type as string | undefined,
        data: (node.data as Record<string, unknown>) ?? {},
      });
    },
    [onNodeSelect]
  );

  const handleBackgroundClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const isClusterMode = !!(sessionGroups && sessionGroups.size > 0);

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
        nodeColor={(node: Record<string, unknown>) =>
          (node.sessionColor as string) ?? TYPE_COLOR[node.type as string] ?? "#61d0ff"
        }
        nodeVal={(node: Record<string, unknown>) => {
          if (node.type === "__session_label") return 0;
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
          const sprite = makeNodeLabel(label);
          const size = TYPE_VAL[node.type as string] ?? 5;
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
        warmupTicks={isClusterMode ? 0 : 120}
        cooldownTicks={isClusterMode ? 0 : 200}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.5}
        showNavInfo={false}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
      />
    </div>
  );
}
