"use client";

import { useMemo } from "react";
import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
}

function FlowCanvas({ events }: FlowCanvasProps) {
  const { nodes, edges } = useMemo(() => eventsToGraph(events), [events]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      colorMode="dark"
      style={{ backgroundColor: "var(--background)" }}
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
}

export default function GraphCanvas({ events }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas events={events} />
    </ReactFlowProvider>
  );
}
