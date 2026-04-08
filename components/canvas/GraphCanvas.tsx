"use client";

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from "@xyflow/react";

function FlowCanvas() {
  return (
    <ReactFlow
      nodes={[]}
      edges={[]}
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

export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
