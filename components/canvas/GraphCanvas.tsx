"use client";

import { useEffect, useMemo, useRef } from "react";
import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import type { ClaudeEvent } from "@/lib/types";
import { eventsToGraph } from "@/lib/events-to-graph";
import OrbNode from "@/components/graph/OrbNode";
import AnimatedEdge from "@/components/graph/AnimatedEdge";

// Defined outside component — stable reference required by React Flow
const nodeTypes = {
  toolcall:     OrbNode,
  notification: OrbNode,
  stop:         OrbNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

export interface SelectedNode {
  id: string;
  type: string | undefined;
  data: Record<string, unknown>;
}

interface FlowCanvasProps {
  events: ClaudeEvent[];
  sessionId: string;
  onNodeSelect?: (node: SelectedNode) => void;
}

function FlowCanvas({ events, sessionId, onNodeSelect }: FlowCanvasProps) {
  const { fitView } = useReactFlow();
  const { nodes, edges } = useMemo(() => eventsToGraph(events), [events]);
  const prevSessionId = useRef<string>("");
  const hasFitted = useRef(false);

  useEffect(() => {
    if (nodes.length === 0) {
      hasFitted.current = false;
      return;
    }
    const sessionChanged = sessionId !== prevSessionId.current;
    const firstNodes = !hasFitted.current;
    if (sessionChanged || firstNodes) {
      prevSessionId.current = sessionId;
      hasFitted.current = true;
      const t = setTimeout(() => fitView({ duration: 300, padding: 0.2 }), 50);
      return () => clearTimeout(t);
    }
  }, [nodes.length, sessionId, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      colorMode="dark"
      style={{ background: "transparent" }}
      onNodeClick={(_, node) =>
        onNodeSelect?.({ id: node.id, type: node.type, data: node.data as Record<string, unknown> })
      }
    />
  );
}

interface GraphCanvasProps {
  events: ClaudeEvent[];
  sessionId: string;
  onNodeSelect?: (node: SelectedNode) => void;
}

export default function GraphCanvas({ events, sessionId, onNodeSelect }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas events={events} sessionId={sessionId} onNodeSelect={onNodeSelect} />
    </ReactFlowProvider>
  );
}
