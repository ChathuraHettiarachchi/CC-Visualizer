"use client";

import { useState } from "react";
import SessionTabs, { Session } from "@/components/layout/SessionTabs";
import GraphCanvas from "@/components/canvas/GraphCanvas";

const PLACEHOLDER_SESSIONS: Session[] = [
  { id: "1", label: "Session 1" },
];

export default function Home() {
  const [activeId, setActiveId] = useState("1");

  return (
    <>
      <SessionTabs
        sessions={PLACEHOLDER_SESSIONS}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <div className="flex-1 relative">
        <GraphCanvas />
      </div>
    </>
  );
}
