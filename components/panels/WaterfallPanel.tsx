"use client";

import { useMemo } from "react";
import type { ClaudeEvent } from "@/lib/types";

interface WaterfallPanelProps {
  events: ClaudeEvent[];
  onSelect?: (nodeId: string) => void;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-ibm-plex-mono), monospace" };

const TOOL_PALETTE = [
  "#61d0ff","#7cf3c8","#ffbf69","#a78bfa",
  "#f87171","#4ade80","#fb923c","#e879f9","#38bdf8","#facc15",
];
function toolColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return TOOL_PALETTE[Math.abs(h) % TOOL_PALETTE.length];
}

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function WaterfallPanel({ events, onSelect }: WaterfallPanelProps) {
  const rows = useMemo(() => {
    const pre = events.filter(e => e.hook_event_name === "PreToolUse") as Array<{
      tool_name: string;
      tool_use_id: string;
      timestamp: number;
    }>;
    const postMap = new Map(
      events
        .filter(e => e.hook_event_name === "PostToolUse")
        .map(e => [(e as { tool_use_id: string }).tool_use_id, e as { timestamp: number }])
    );

    const seen = new Set<string>();
    const result: Array<{
      id: string;
      name: string;
      start: number;
      end: number | null;
      duration: number | null;
    }> = [];

    for (const e of pre) {
      if (seen.has(e.tool_use_id)) continue;
      seen.add(e.tool_use_id);
      const post = postMap.get(e.tool_use_id);
      const end = post ? post.timestamp : null;
      result.push({
        id:       `tool-${e.tool_use_id}`,
        name:     e.tool_name,
        start:    e.timestamp,
        end,
        duration: end ? end - e.timestamp : null,
      });
    }

    return result;
  }, [events]);

  if (rows.length === 0) {
    return <div style={{ ...MONO, fontSize: 11, color: "var(--muted)", padding: 8 }}>No tool calls yet</div>;
  }

  const tMin = rows[0].start;
  const tMax = rows.reduce((m, r) => Math.max(m, r.end ?? r.start), tMin) || (tMin + 1);
  const span = tMax - tMin || 1;

  const LABEL_W = 80;
  const DUR_W   = 36;
  const BAR_H   = 12;
  const ROW_GAP = 8;

  return (
    <div style={{ overflowY: "auto", maxHeight: 260 }}>
      {rows.map((row) => {
        const color  = toolColor(row.name);
        const left   = ((row.start - tMin) / span) * 100;
        const width  = row.end ? (((row.end - row.start) / span) * 100) : 2;

        return (
          <div
            key={row.id}
            onClick={() => onSelect?.(row.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              marginBottom: ROW_GAP, cursor: onSelect ? "pointer" : "default",
            }}
          >
            {/* Tool name */}
            <div style={{
              ...MONO, fontSize: 9.5, color: "var(--text)",
              width: LABEL_W, flexShrink: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {row.name}
            </div>

            {/* Bar track */}
            <div style={{ flex: 1, height: BAR_H, borderRadius: 4, background: "rgba(255,255,255,0.05)", position: "relative" }}>
              <div style={{
                position: "absolute",
                left: `${Math.min(left, 98)}%`,
                width: `${Math.max(width, 1.5)}%`,
                height: "100%", borderRadius: 4,
                background: row.end ? color : `repeating-linear-gradient(90deg, ${color}88 0 4px, transparent 4px 8px)`,
                opacity: 0.85,
                transition: "width 0.3s",
              }} />
            </div>

            {/* Duration */}
            <div style={{
              ...MONO, fontSize: 9, color: "var(--muted)",
              width: DUR_W, flexShrink: 0, textAlign: "right",
            }}>
              {row.duration !== null ? fmtMs(row.duration) : "…"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
