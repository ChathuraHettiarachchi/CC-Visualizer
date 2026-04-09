"use client";

import { useEffect, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import GraphCanvas, { type SelectedNode } from "@/components/canvas/GraphCanvas";
import Topbar from "@/components/layout/Topbar";
import LeftRail from "@/components/layout/LeftRail";
import RightRail from "@/components/layout/RightRail";

export default function Home() {
  const { sessions, sessionEvents, connected } = useSSE();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  useEffect(() => {
    if (sessions.length > 0 && (!activeId || (activeId !== "__all" && !sessions.find((s) => s.id === activeId)))) {
      setActiveId(sessions[0].id);
    }
    if (sessions.length === 0) setActiveId(null);
  }, [sessions, activeId]);

  useEffect(() => { setSelectedNode(null); }, [activeId]);

  const activeEvents = activeId === "__all"
    ? Array.from(sessionEvents.values()).flat()
    : (activeId ? sessionEvents.get(activeId) : undefined) ?? [];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "300px minmax(0, 1fr) 360px",
      gridTemplateRows: "auto 1fr",
      gap: 16,
      padding: 18,
      height: "100%",
      boxSizing: "border-box",
    }}>
      <Topbar connected={connected} />
      <LeftRail
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        events={activeEvents}
      />
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
        <GraphCanvas
          events={activeEvents}
          sessionId={activeId ?? ""}
          onNodeSelect={setSelectedNode}
          sessionGroups={activeId === "__all" ? sessionEvents : undefined}
        />
      </div>
      <RightRail
        node={selectedNode}
        events={activeEvents}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
