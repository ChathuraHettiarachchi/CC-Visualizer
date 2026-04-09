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
  // Group calls by tool name — one row per tool, multiple segments per row
  const { groups, tMin, span } = useMemo(() => {
    const pre = events.filter(e => e.hook_event_name === "PreToolUse") as Array<{
      tool_name: string; tool_use_id: string; timestamp: number;
    }>;
    const postMap = new Map(
      events
        .filter(e => e.hook_event_name === "PostToolUse")
        .map(e => [(e as { tool_use_id: string }).tool_use_id, e as { timestamp: number }])
    );

    const seen = new Set<string>();
    const byName = new Map<string, Array<{ id: string; start: number; end: number | null; duration: number | null }>>();

    for (const e of pre) {
      if (seen.has(e.tool_use_id)) continue;
      seen.add(e.tool_use_id);
      const post = postMap.get(e.tool_use_id);
      const end = post?.timestamp ?? null;
      const calls = byName.get(e.tool_name) ?? [];
      calls.push({ id: `tool-${e.tool_use_id}`, start: e.timestamp, end, duration: end ? end - e.timestamp : null });
      byName.set(e.tool_name, calls);
    }

    const allTs = [...byName.values()].flat().flatMap(c => [c.start, c.end ?? c.start]);
    const tMin = allTs.length ? Math.min(...allTs) : 0;
    const tMax = allTs.length ? Math.max(...allTs) : 1;
    const span = tMax - tMin || 1;

    const groups = [...byName.entries()].map(([name, calls]) => ({
      name,
      calls,
      totalMs: calls.reduce((s, c) => s + (c.duration ?? 0), 0),
    }));
    // Sort by first call timestamp
    groups.sort((a, b) => a.calls[0].start - b.calls[0].start);

    return { groups, tMin, span };
  }, [events]);

  if (groups.length === 0) {
    return <div style={{ ...MONO, fontSize: 11, color: "var(--muted)", padding: 8 }}>No tool calls yet</div>;
  }

  const LABEL_W = 80;
  const DUR_W   = 40;
  const BAR_H   = 10;
  const ROW_GAP = 7;

  return (
    <div style={{ overflowY: "auto", maxHeight: 260 }}>
      {groups.map((group) => {
        const color = toolColor(group.name);
        return (
          <div
            key={group.name}
            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: ROW_GAP }}
          >
            {/* Tool name + count */}
            <div style={{
              ...MONO, fontSize: 9.5, color: "var(--text)",
              width: LABEL_W, flexShrink: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {group.name}
              {group.calls.length > 1 && (
                <span style={{ color: "var(--muted)", fontSize: 8.5, marginLeft: 3 }}>
                  ×{group.calls.length}
                </span>
              )}
            </div>

            {/* Bar track — one segment per call */}
            <div style={{ flex: 1, height: BAR_H, borderRadius: 4, background: "rgba(255,255,255,0.05)", position: "relative" }}>
              {group.calls.map((call) => {
                const left  = ((call.start - tMin) / span) * 100;
                const width = call.end ? Math.max(((call.duration!) / span) * 100, 1.5) : 2;
                return (
                  <div
                    key={call.id}
                    onClick={() => onSelect?.(call.id)}
                    title={call.duration !== null ? fmtMs(call.duration) : "pending"}
                    style={{
                      position: "absolute",
                      left: `${Math.min(left, 98)}%`,
                      width: `${width}%`,
                      height: "100%", borderRadius: 3,
                      background: call.end
                        ? color
                        : `repeating-linear-gradient(90deg, ${color}88 0 4px, transparent 4px 8px)`,
                      opacity: 0.85,
                      cursor: onSelect ? "pointer" : "default",
                      transition: "width 0.3s",
                    }}
                  />
                );
              })}
            </div>

            {/* Total duration */}
            <div style={{
              ...MONO, fontSize: 9, color: "var(--muted)",
              width: DUR_W, flexShrink: 0, textAlign: "right",
            }}>
              {group.totalMs > 0 ? fmtMs(group.totalMs) : "…"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
