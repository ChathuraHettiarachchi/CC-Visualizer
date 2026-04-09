"use client";

import { useMemo, useRef, useEffect, useImperativeHandle, forwardRef, useState } from "react";
import type { ClaudeEvent } from "@/lib/types";

interface FlowNode {
  id: string;
  type: string;
  label: string;
  sublabel: string;
  color: string;
  heatColor: string;
  status: "complete" | "pending" | "error" | "start";
  duration: number | null;
  timestamp: number;
}

interface FlowView2DProps {
  events: ClaudeEvent[];
  onNodeClick?: (id: string) => void;
  selectedId?: string | null;
  heatmapMode?: boolean;
}

export interface FlowView2DHandle {
  scrollToFirst: () => void;
  scrollToLast:  () => void;
}

// ── Colours (must match GraphCanvas) ────────────────────────────────────────

const TOOL_PALETTE = [
  "#61d0ff","#7cf3c8","#ffbf69","#a78bfa",
  "#f87171","#4ade80","#fb923c","#e879f9",
  "#38bdf8","#facc15",
];
function toolColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return TOOL_PALETTE[Math.abs(h) % TOOL_PALETTE.length];
}

function heatColor(duration: number | null, minMs: number, maxMs: number): string {
  if (duration === null || !isFinite(duration) || maxMs === minMs) return "#22c55e";
  const t = Math.max(0, Math.min(1, (duration - minMs) / (maxMs - minMs)));
  if (t < 0.5) {
    const u = t * 2;
    return `rgb(${Math.round(34 + u * 221)},${Math.round(197 - u * 6)},${Math.round(94 + u * 11)})`;
  }
  const u = (t - 0.5) * 2;
  return `rgb(255,${Math.round(191 - u * 78)},${Math.round(105 + u * 8)})`;
}

const TYPE_COLOR: Record<string, string> = {
  notification: "#ffbf69",
  stop:         "#7cf3c8",
};

const MONO = "'IBM Plex Mono', monospace";

// ── Layout constants ──────────────────────────────────────────────────────────

const R      = 16;     // node radius
const COL_W  = 110;    // horizontal stride between nodes
const ROW_H  = 80;     // vertical stride between rows
const COLS   = 10;     // nodes per row
const PAD_X  = 28;     // left/right padding
const PAD_Y  = 42;     // top padding

function nodePos(index: number) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const x = PAD_X + (row % 2 === 0 ? col : COLS - 1 - col) * COL_W;
  const y = PAD_Y + row * ROW_H;
  return { x, y };
}

function fmtDur(ms: number | null) {
  if (ms === null) return "";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

const FlowView2D = forwardRef<FlowView2DHandle, FlowView2DProps>(
function FlowView2D({ events, onNodeClick, selectedId, heatmapMode = false }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    scrollToFirst() {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, top: 0, behavior: "smooth" });
      }
    },
    scrollToLast() {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    },
  }));

  const nodes = useMemo<FlowNode[]>(() => {
    if (events.length === 0) return [];

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Build tool call map
    const postMap = new Map<string, { timestamp: number; response: unknown }>();
    for (const e of sorted) {
      if (e.hook_event_name === "PostToolUse") {
        postMap.set(e.tool_use_id, { timestamp: e.timestamp, response: e.tool_response });
      }
    }

    const seen = new Set<string>();
    const rawNodes: FlowNode[] = [];

    for (const e of sorted) {
      if (e.hook_event_name === "PreToolUse") {
        if (seen.has(e.tool_use_id)) continue;
        seen.add(e.tool_use_id);
        const post = postMap.get(e.tool_use_id);
        const dur = post ? post.timestamp - e.timestamp : null;
        const isError = post
          ? typeof post.response === "string" &&
            /error|exception|failed|traceback/i.test((post.response as string).slice(0, 500))
          : false;

        rawNodes.push({
          id:        `tool-${e.tool_use_id}`,
          type:      "toolcall",
          label:     e.tool_name,
          sublabel:  isError ? "error" : dur !== null ? fmtDur(dur) : "…",
          color:     toolColor(e.tool_name),
          heatColor: "#61d0ff", // filled below
          status:    isError ? "error" : post ? "complete" : "pending",
          duration:  dur,
          timestamp: e.timestamp,
        });
      } else if (e.hook_event_name === "Notification") {
        rawNodes.push({
          id:        `notif-${e.timestamp}`,
          type:      "notification",
          label:     "notify",
          sublabel:  (e.message ?? "").slice(0, 14),
          color:     TYPE_COLOR.notification,
          heatColor: TYPE_COLOR.notification,
          status:    "complete",
          duration:  null,
          timestamp: e.timestamp,
        });
      } else if (e.hook_event_name === "Stop" || e.hook_event_name === "SubagentStop") {
        rawNodes.push({
          id:        `stop-${e.timestamp}`,
          type:      "stop",
          label:     e.hook_event_name === "SubagentStop" ? "sub-stop" : "stop",
          sublabel:  "",
          color:     TYPE_COLOR.stop,
          heatColor: TYPE_COLOR.stop,
          status:    "complete",
          duration:  null,
          timestamp: e.timestamp,
        });
      }
    }

    // Compute heatmap colors
    const durations = rawNodes.map(n => n.duration).filter((d): d is number => d !== null && isFinite(d));
    const minMs = durations.length ? Math.min(...durations) : 0;
    const maxMs = durations.length ? Math.max(...durations) : 0;
    for (const n of rawNodes) {
      if (n.type === "toolcall") n.heatColor = heatColor(n.duration, minMs, maxMs);
    }

    // Mark start
    if (rawNodes.length > 0) rawNodes[0].status = "start";

    return rawNodes;
  }, [events]);

  // SVG dimensions
  const rows = Math.ceil(nodes.length / COLS);
  const svgW = PAD_X * 2 + COLS * COL_W;
  const svgH = PAD_Y + rows * ROW_H + 48;

  // Scroll selected node into view
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const idx = nodes.findIndex(n => n.id === selectedId);
    if (idx === -1) return;
    const { x } = nodePos(idx);
    scrollRef.current.scrollLeft = Math.max(0, x - 200);
  }, [selectedId, nodes]);

  if (nodes.length === 0) {
    return (
      <div style={{
        height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--muted)", fontFamily: MONO, fontSize: 13,
      }}>
        No events yet
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{ width: "100%", height: "100%", overflowX: "auto", overflowY: "auto", background: "#07111f", borderRadius: 16 }}
    >
      <svg
        width={svgW}
        height={svgH}
        style={{ display: "block", minWidth: svgW }}
      >
        {/* ── Edges ──────────────────────────────────────────────────────── */}
        {nodes.slice(0, -1).map((node, i) => {
          const a = nodePos(i);
          const b = nodePos(i + 1);
          const sameRow = Math.floor(i / COLS) === Math.floor((i + 1) / COLS);
          const color = node.color + "55";

          if (sameRow) {
            // Straight horizontal arrow
            const dir = a.x < b.x ? 1 : -1;
            return (
              <g key={`e-${i}`}>
                <line
                  x1={a.x + dir * R} y1={a.y}
                  x2={b.x - dir * R} y2={b.y}
                  stroke={color} strokeWidth={1.5}
                />
                {/* arrowhead */}
                <polygon
                  points={`
                    ${b.x - dir * (R + 7)},${b.y - 4}
                    ${b.x - dir * R},${b.y}
                    ${b.x - dir * (R + 7)},${b.y + 4}
                  `}
                  fill={color}
                />
              </g>
            );
          } else {
            // Turn: go right/left to edge then down to next row
            const midY = (a.y + b.y) / 2;
            const edgeX = a.x < b.x ? PAD_X + COLS * COL_W - PAD_X / 2 : PAD_X / 2;
            return (
              <g key={`e-${i}`}>
                <polyline
                  points={`${a.x},${a.y} ${edgeX},${a.y} ${edgeX},${midY} ${b.x === a.x ? b.x : b.x},${midY} ${b.x},${b.y}`}
                  fill="none" stroke={color} strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              </g>
            );
          }
        })}

        {/* ── Nodes ──────────────────────────────────────────────────────── */}
        {nodes.map((node, i) => {
          const { x, y } = nodePos(i);
          const isSelected = node.id === selectedId;
          const isHovered  = node.id === hoveredId;
          const glow = isSelected || isHovered;

          return (
            <g
              key={node.id}
              style={{ cursor: "pointer" }}
              onClick={() => onNodeClick?.(node.id)}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* selection ring */}
              {glow && (
                <circle cx={x} cy={y} r={R + 5}
                  fill="none" stroke={node.color} strokeWidth={2} opacity={0.5}
                />
              )}

              {/* start ring */}
              {node.status === "start" && (
                <circle cx={x} cy={y} r={R + 8}
                  fill="none" stroke="#22c55e" strokeWidth={1.5} opacity={0.4}
                />
              )}

              {/* error ring */}
              {node.status === "error" && (
                <circle cx={x} cy={y} r={R + 5}
                  fill="none" stroke="#f87171" strokeWidth={2} opacity={0.7}
                  strokeDasharray="3 2"
                />
              )}

              {/* pending ring */}
              {node.status === "pending" && (
                <circle cx={x} cy={y} r={R + 5}
                  fill="none" stroke="#ffbf69" strokeWidth={1.5} opacity={0.5}
                  strokeDasharray="3 2"
                />
              )}

              {/* main circle */}
              <circle
                cx={x} cy={y} r={R}
                fill={(heatmapMode ? node.heatColor : node.color) + "22"}
                stroke={heatmapMode ? node.heatColor : node.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />

              {/* index number */}
              <text
                x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                fontFamily={MONO} fontSize={9} fill={node.color} fontWeight={700}
              >
                {i + 1}
              </text>

              {/* tool name label */}
              <text
                x={x} y={y + R + 13} textAnchor="middle"
                fontFamily={MONO} fontSize={9.5}
                fill={isSelected ? node.color : "rgba(237,245,255,0.85)"}
                fontWeight={isSelected ? 700 : 400}
              >
                {node.label.slice(0, 12)}
              </text>

              {/* sublabel (duration / status) */}
              {node.sublabel && (
                <text
                  x={x} y={y + R + 25} textAnchor="middle"
                  fontFamily={MONO} fontSize={8.5}
                  fill={
                    node.status === "error"   ? "#f87171" :
                    node.status === "pending" ? "#ffbf69" :
                    "rgba(140,194,255,0.55)"
                  }
                >
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
});

FlowView2D.displayName = "FlowView2D";
export default FlowView2D;
