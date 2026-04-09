import { useMemo } from "react";
import { detectPatterns } from "@/lib/detect-patterns";
import type { ClaudeEvent } from "@/lib/types";

const MONO = "'IBM Plex Mono', monospace";

const PATTERN_COLORS: Record<string, string> = {
  "read-edit-loop":     "#a78bfa",
  "error-retry":        "#f87171",
  "long-chain":         "#ffbf69",
  "repeated-failures":  "#f87171",
};

interface PatternPanelProps {
  events: ClaudeEvent[];
  onNodeClick: (nodeId: string) => void;
}

export default function PatternPanel({ events, onNodeClick }: PatternPanelProps) {
  const patterns = useMemo(() => detectPatterns(events), [events]);

  if (patterns.length === 0) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--muted)" }}>
        No patterns detected
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {patterns.map((p, i) => {
        const color = PATTERN_COLORS[p.id] ?? "#61d0ff";
        return (
          <div
            key={i}
            style={{
              padding: "8px 10px", borderRadius: 10,
              border: `1px solid ${color}22`,
              background: `${color}08`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 11, color, marginBottom: 3, fontWeight: 600 }}>
              {p.label}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>
              {p.description}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {p.nodeIds.slice(0, 6).map((id) => (
                <button
                  key={id}
                  onClick={() => onNodeClick(id)}
                  style={{
                    fontFamily: MONO, fontSize: 9,
                    background: `${color}12`, border: `1px solid ${color}30`,
                    borderRadius: 4, padding: "1px 6px",
                    color, cursor: "pointer",
                  }}
                >
                  {id.slice(5, 13)}…
                </button>
              ))}
              {p.nodeIds.length > 6 && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--muted)" }}>
                  +{p.nodeIds.length - 6} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
