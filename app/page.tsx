"use client";

import { useEffect, useMemo, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import GraphCanvas, { type SelectedNode } from "@/components/canvas/GraphCanvas";
import Topbar from "@/components/layout/Topbar";
import LeftRail from "@/components/layout/LeftRail";
import RightRail from "@/components/layout/RightRail";
import EventFeed from "@/components/panels/EventFeed";
import { eventsToGraph } from "@/lib/events-to-graph";

export default function Home() {
  const { sessions, sessionEvents, connected, childSessions } = useSSE();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [compareNode, setCompareNode] = useState<SelectedNode | null>(null);

  useEffect(() => {
    if (sessions.length > 0 && (!activeId || !sessions.find((s) => s.id === activeId))) {
      setActiveId(sessions[0].id);
    }
    if (sessions.length === 0) setActiveId(null);
  }, [sessions, activeId]);

  useEffect(() => { setSelectedNode(null); setCompareNode(null); }, [activeId]);

  const activeEvents = (activeId ? sessionEvents.get(activeId) : undefined) ?? [];

  // Node lookup map — used by bookmark and error log jump-to
  const nodeById = useMemo(() => {
    if (activeEvents.length === 0) return new Map<string, SelectedNode>();
    const { nodes } = eventsToGraph(activeEvents);
    return new Map(
      nodes.map(n => [
        n.id,
        {
          id:   n.id,
          type: n.type,
          data: n.data as Record<string, unknown>,
        } satisfies SelectedNode,
      ])
    );
  }, [activeEvents]);

  function selectNodeById(nodeId: string) {
    const node = nodeById.get(nodeId);
    if (node) { setSelectedNode(node); setCompareNode(null); }
  }

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
        sessionEvents={sessionEvents}
        childSessions={childSessions}
      />
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 16 }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <GraphCanvas
            events={activeEvents}
            sessionId={activeId ?? ""}
            onNodeSelect={(n) => { setSelectedNode(n); setCompareNode(null); }}
            onSecondNodeSelect={setCompareNode}
          />
        </div>
        <EventFeed events={activeEvents} />
      </div>
      <RightRail
        node={selectedNode}
        events={activeEvents}
        onClose={() => setSelectedNode(null)}
        sessionId={activeId ?? ""}
        compareNode={compareNode}
        onClearCompare={() => setCompareNode(null)}
        onSelectNodeById={selectNodeById}
      />
    </div>
  );
}
