"use client";

import { useEffect, useState } from "react";

type ConnectionState = "connecting" | "connected" | "disconnected";

function ConnectionDot() {
  const [state, setState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onopen = () => setState("connected");
    es.onerror = () => setState("disconnected");
    return () => {
      es.close();
      setState("disconnected");
    };
  }, []);

  const color =
    state === "connected"
      ? "#3fb950"
      : state === "connecting"
      ? "#d29922"
      : "#3d444d";

  const label =
    state === "connected"
      ? "Connected"
      : state === "connecting"
      ? "Connecting..."
      : "Disconnected";

  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: "#8b949e" }}>
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

export default function Header() {
  return (
    <header
      style={{
        backgroundColor: "var(--header-bg)",
        borderBottom: "1px solid var(--border)",
        height: "48px",
      }}
      className="flex items-center justify-between px-4 shrink-0"
      aria-label="cc-visualizer header"
    >
      <span
        className="font-mono text-sm font-semibold tracking-tight"
        style={{ color: "var(--foreground)" }}
      >
        cc-visualizer
      </span>
      <ConnectionDot />
    </header>
  );
}
