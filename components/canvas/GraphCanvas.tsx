"use client";

import { useEffect, useMemo, useRef } from "react";
import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import type { ClaudeEvent } from "@/lib/types";
import { eventsToGraph } from "@/lib/events-to-graph";
import ToolCallNode from "@/components/graph/ToolCallNode";
import NotificationNode from "@/components/graph/NotificationNode";
import StopNode from "@/components/graph/StopNode";

// Defined outside component — stable reference required by React Flow
const nodeTypes = {
  toolcall: ToolCallNode,
  notification: NotificationNode,
  stop: StopNode,
};

interface FlowCanvasProps {
  events: ClaudeEvent[];
  sessionId: string;
  onNodeSelect?: (nodeId: string) => void;
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
      colorMode="dark"
      style={{ backgroundColor: "var(--background)" }}
      onNodeClick={(_, node) => onNodeSelect?.(node.id)}
    >
      <Background
        variant={BackgroundVariant.Dots}
        color="#30363d"
        gap={24}
        size={1.5}
      />
      <Controls
        style={{
          backgroundColor: "var(--header-bg)",
          border: "1px solid var(--border)",
        }}
      />
      <MiniMap
        style={{
          backgroundColor: "var(--header-bg)",
          border: "1px solid var(--border)",
        }}
        maskColor="rgba(13,17,23,0.7)"
      />
    </ReactFlow>
  );
}

interface GraphCanvasProps {
  events: ClaudeEvent[];
  sessionId: string;
  onNodeSelect?: (nodeId: string) => void;
}

export default function GraphCanvas({ events, sessionId, onNodeSelect }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas events={events} sessionId={sessionId} onNodeSelect={onNodeSelect} />
    </ReactFlowProvider>
  );
}
