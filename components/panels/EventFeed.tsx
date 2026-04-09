"use client";

import { useMemo, useState } from "react";
import type { ClaudeEvent } from "@/lib/types";

const TYPE_COLOR: Record<string, string> = {
  PreToolUse:   "#61d0ff",
  PostToolUse:  "#7cf3c8",
  Notification: "#ffbf69",
  Stop:         "#91a8c7",
  SubagentStop: "#91a8c7",
};

const MONO = "'IBM Plex Mono', monospace";
const COLS = "70px 110px 1fr 150px 54px 18px";
const HEADERS = ["Time", "Type", "Tool / Content", "File", "Dur", ""];

function basename(p: string): string {
  return p.replace(/\\/g, "/").split("/").pop() ?? p;
}

function fileHint(event: ClaudeEvent): string {
  if (event.hook_event_name !== "PreToolUse" && event.hook_event_name !== "PostToolUse") return "";
  const inp = event.tool_input;
  if (typeof inp.file_path === "string" && inp.file_path) return basename(inp.file_path);
  if (typeof inp.notebook_path === "string" && inp.notebook_path) return basename(inp.notebook_path);
  if (typeof inp.command === "string") return (inp.command as string).slice(0, 36).replace(/\n/g, " ");
  return "";
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

interface FeedRow {
  id: string;
  timestamp: number;
  type: string;
  content: string;
  file: string;
  duration: number | null;
  status: "complete" | "error" | "pending" | null;
}

interface EventFeedProps {
  events: ClaudeEvent[];
}

export default function EventFeed({ events }: EventFeedProps) {
  const [collapsed, setCollapsed] = useState(false);

  const rows = useMemo<FeedRow[]>(() => {
    const postMap = new Map<string, { timestamp: number; response: unknown }>();
    for (const e of events) {
      if (e.hook_event_name === "PostToolUse") {
        postMap.set(e.tool_use_id, { timestamp: e.timestamp, response: e.tool_response });
      }
    }

    const result: FeedRow[] = [];
    for (const e of events) {
      if (e.hook_event_name === "PostToolUse") continue;

      if (e.hook_event_name === "PreToolUse") {
        const post = postMap.get(e.tool_use_id);
        const duration = post ? post.timestamp - e.timestamp : null;
        const isError =
          post &&
          typeof post.response === "string" &&
          /error|exception|failed|traceback/i.test(post.response.slice(0, 500));
        result.push({
          id: `pre-${e.tool_use_id}`,
          timestamp: e.timestamp,
          type: "PreToolUse",
          content: e.tool_name,
          file: fileHint(e),
          duration,
          status: isError ? "error" : post ? "complete" : "pending",
        });
        continue;
      }

      if (e.hook_event_name === "Notification") {
        result.push({
          id: `notif-${e.timestamp}`,
          timestamp: e.timestamp,
          type: "Notification",
          content: e.message.slice(0, 120),
          file: "",
          duration: null,
          status: null,
        });
        continue;
      }

      result.push({
        id: `stop-${e.timestamp}`,
        timestamp: e.timestamp,
        type: e.hook_event_name,
        content: e.hook_event_name,
        file: "",
        duration: null,
        status: null,
      });
    }
    return result.reverse();
  }, [events]);

  return (
    <div style={{ borderTop: "1px solid var(--line)", background: "rgba(7,17,31,0.9)", flexShrink: 0 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", padding: "6px 12px",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--muted)", fontSize: 11, fontFamily: MONO, textAlign: "left",
        }}
      >
        <span style={{ transition: "transform 0.15s", display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "none" }}>▾</span>
        Feed ({events.length})
      </button>

      {!collapsed && (
        <div style={{ height: 180, overflowY: "auto" }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: COLS,
            padding: "2px 12px",
            position: "sticky", top: 0,
            background: "rgba(7,17,31,0.98)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            {HEADERS.map((h, i) => (
              <div key={i} style={{
                fontFamily: MONO, fontSize: 9, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: "0.07em", padding: "2px 0",
              }}>
                {h}
              </div>
            ))}
          </div>

          {rows.map((row) => {
            const color = TYPE_COLOR[row.type] ?? "#91a8c7";
            return (
              <div
                key={row.id}
                style={{
                  display: "grid", gridTemplateColumns: COLS,
                  alignItems: "center",
                  padding: "3px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  fontFamily: MONO, fontSize: 11,
                }}
              >
                {/* Time */}
                <span style={{ color: "var(--muted)", fontSize: 10 }}>
                  {new Date(row.timestamp).toLocaleTimeString("en-GB")}
                </span>

                {/* Type badge */}
                <span style={{
                  fontSize: 9, padding: "1px 6px", borderRadius: 10,
                  background: `${color}18`, color, border: `1px solid ${color}40`,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  display: "inline-block", maxWidth: 100,
                }}>
                  {row.type}
                </span>

                {/* Tool / Content */}
                <span style={{
                  color: "var(--text)", overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8,
                }}>
                  {row.content}
                </span>

                {/* File */}
                <span style={{
                  color: "rgba(140,194,255,0.45)", fontSize: 10,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8,
                }}>
                  {row.file}
                </span>

                {/* Duration */}
                <span style={{ color: "var(--muted)", fontSize: 10, textAlign: "right" }}>
                  {row.duration !== null ? fmtMs(row.duration) : ""}
                </span>

                {/* Status */}
                <span style={{ textAlign: "center", fontSize: 12 }}>
                  {row.status === "complete" && <span style={{ color: "#4ade80" }}>✓</span>}
                  {row.status === "error"    && <span style={{ color: "#f87171" }}>✗</span>}
                  {row.status === "pending"  && <span style={{ color: "var(--muted)" }}>…</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
