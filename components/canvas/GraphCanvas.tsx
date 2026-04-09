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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function GraphCanvas({ events, sessionId, onNodeSelect }: GraphCanvasProps) {
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
  }, [events]);

  // Reset camera when session changes
  const fgRef = useRef<ForceGraphMethods>(undefined);
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: 0 }, 800);
    }
  }, [sessionId]);

  const handleNodeClick = useCallback(
    (node: Record<string, unknown>) => {
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
        nodeColor={(node: Record<string, unknown>) => TYPE_COLOR[node.type as string] ?? "#61d0ff"}
        nodeVal={(node: Record<string, unknown>) => TYPE_VAL[node.type as string] ?? 4}
        nodeResolution={16}
        nodeOpacity={0.92}
        linkColor={() => "rgba(140,194,255,0.5)"}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowColor={() => "rgba(140,194,255,0.6)"}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={(link: Record<string, unknown>) => (link.isActive ? 4 : 0)}
        linkDirectionalParticleColor={() => "#61d0ff"}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={2}
        nodeThreeObjectExtend={true}
        nodeThreeObject={(node: Record<string, unknown>) => {
          const label = node.type === "toolcall"
            ? ((node.data as Record<string, unknown>)?.toolName as string || "tool")
            : (node.type as string);
          const sprite = makeNodeLabel(label);
          const size = TYPE_VAL[node.type as string] ?? 5;
          sprite.position.y = size + 7;
          return sprite;
        }}
        nodeLabel={(node: Record<string, unknown>) => {
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
        warmupTicks={120}
        cooldownTicks={200}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.5}
        showNavInfo={false}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
      />
    </div>
  );
}
