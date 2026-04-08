"use client";

import { useEffect, useState } from "react";
import SessionTabs, { Session } from "@/components/layout/SessionTabs";
import GraphCanvas from "@/components/canvas/GraphCanvas";
import { useSSE } from "@/hooks/useSSE";

export default function Home() {
  const { sessions, sessionEvents } = useSSE();
  const [activeId, setActiveId] = useState<string>("");

  const tabSessions: Session[] =
    sessions.length > 0
      ? sessions.map((s) => ({ id: s.id, label: s.label }))
      : [{ id: "__none", label: "No sessions yet" }];

  useEffect(() => {
    if (sessions.length > 0 && (!activeId || !sessions.find((s) => s.id === activeId))) {
      setActiveId(sessions[0].id);
    }
    if (sessions.length === 0) {
      setActiveId("__none");
    }
  }, [sessions, activeId]);

  return (
    <>
      <SessionTabs
        sessions={tabSessions}
        activeId={activeId || "__none"}
        onSelect={(id) => { if (id !== "__none") setActiveId(id); }}
      />
      <div className="flex-1 relative">
        <GraphCanvas events={sessionEvents.get(activeId) ?? []} />
      </div>
    </>
  );
}
