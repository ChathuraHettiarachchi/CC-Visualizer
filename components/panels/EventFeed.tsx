"use client";

import { useState } from "react";
import type { ClaudeEvent } from "@/lib/types";

const TYPE_COLOR: Record<string, string> = {
  PreToolUse:   "#61d0ff",
  PostToolUse:  "#7cf3c8",
  Notification: "#ffbf69",
  Stop:         "#91a8c7",
  SubagentStop: "#91a8c7",
};

function eventContent(event: ClaudeEvent): string {
  if (event.hook_event_name === "PreToolUse" || event.hook_event_name === "PostToolUse") {
    return event.tool_name;
  }
  if (event.hook_event_name === "Notification") {
    return event.message.slice(0, 60);
  }
  return event.hook_event_name;
}

interface EventFeedProps {
  events: ClaudeEvent[];
}

export default function EventFeed({ events }: EventFeedProps) {
  const [collapsed, setCollapsed] = useState(false);

  const last200 = events.slice(-200).reverse();

  return (
    <div style={{
      borderTop: "1px solid var(--line)",
      background: "rgba(7,17,31,0.9)",
      flexShrink: 0,
    }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", padding: "6px 12px",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--muted)", fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          textAlign: "left",
        }}
      >
        <span style={{ transition: "transform 0.15s", display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "none" }}>▾</span>
        Feed ({events.length})
      </button>

      {!collapsed && (
        <div style={{ height: 180, overflowY: "auto", padding: "4px 12px 8px" }}>
          {last200.map((event, i) => {
            const color = TYPE_COLOR[event.hook_event_name] ?? "#91a8c7";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "baseline", gap: 10,
                padding: "3px 0", fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}>
                <span style={{ color: "var(--muted)", flexShrink: 0, fontSize: 11 }}>
                  {new Date(event.timestamp).toLocaleTimeString("en-GB")}
                </span>
                <span style={{
                  flexShrink: 0, fontSize: 10, padding: "1px 7px", borderRadius: 10,
                  background: `${color}18`, color, border: `1px solid ${color}40`,
                }}>
                  {event.hook_event_name}
                </span>
                <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {eventContent(event)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
