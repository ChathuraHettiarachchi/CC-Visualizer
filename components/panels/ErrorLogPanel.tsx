"use client";

import { useMemo } from "react";
import type { ClaudeEvent } from "@/lib/types";

interface ErrorLogPanelProps {
  events: ClaudeEvent[];
  onSelect?: (nodeId: string) => void;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-ibm-plex-mono), monospace" };

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function ErrorLogPanel({ events, onSelect }: ErrorLogPanelProps) {
  const errors = useMemo(() => {
    const postMap = new Map(
      events
        .filter(e => e.hook_event_name === "PostToolUse")
        .map(e => {
          const ev = e as { tool_use_id: string; tool_response: unknown; timestamp: number };
          return [ev.tool_use_id, ev];
        })
    );

    const seen = new Set<string>();
    const result: Array<{
      nodeId: string;
      toolName: string;
      timestamp: number;
      excerpt: string;
    }> = [];

    for (const e of events) {
      if (e.hook_event_name !== "PreToolUse") continue;
      const pre = e as { tool_name: string; tool_use_id: string; timestamp: number };
      if (seen.has(pre.tool_use_id)) continue;
      seen.add(pre.tool_use_id);

      const post = postMap.get(pre.tool_use_id);
      if (!post) continue;

      const resp = post.tool_response;
      const isError =
        typeof resp === "string" &&
        /error|exception|failed|traceback/i.test((resp as string).slice(0, 500));

      if (!isError) continue;

      const raw = String(resp);
      const firstLine = raw.split("\n").find(l => l.trim()) ?? raw;
      result.push({
        nodeId:    `tool-${pre.tool_use_id}`,
        toolName:  pre.tool_name,
        timestamp: pre.timestamp,
        excerpt:   firstLine.slice(0, 80),
      });
    }

    return result;
  }, [events]);

  if (errors.length === 0) {
    return (
      <div style={{ ...MONO, fontSize: 11, color: "var(--muted)", padding: "6px 0" }}>
        No errors
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
      {errors.map((err) => (
        <div
          key={err.nodeId}
          onClick={() => onSelect?.(err.nodeId)}
          style={{
            padding: "7px 10px", borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.22)",
            background: "rgba(248,113,113,0.05)",
            cursor: onSelect ? "pointer" : "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ ...MONO, fontSize: 9, color: "#f87171", fontWeight: 700 }}>
              ✕ {err.toolName}
            </span>
            <span style={{ ...MONO, fontSize: 9, color: "var(--muted)", marginLeft: "auto" }}>
              {fmtTime(err.timestamp)}
            </span>
          </div>
          <div style={{
            ...MONO, fontSize: 10, color: "rgba(248,113,113,0.7)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {err.excerpt}
          </div>
        </div>
      ))}
    </div>
  );
}
