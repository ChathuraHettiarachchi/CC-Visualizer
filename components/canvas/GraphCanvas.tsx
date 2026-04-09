"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-3d";
import type { ClaudeEvent } from "@/lib/types";
import { eventsToGraph } from "@/lib/events-to-graph";

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
  toolcall:     4,
  notification: 6,
  stop:         5,
};

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
        linkColor={() => "rgba(140,194,255,0.2)"}
        linkWidth={0.6}
        linkDirectionalParticles={(link: Record<string, unknown>) => (link.isActive ? 4 : 0)}
        linkDirectionalParticleColor={() => "#61d0ff"}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={2}
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
