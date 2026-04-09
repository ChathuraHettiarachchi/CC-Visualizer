"use client";

import { useState, useEffect, useRef } from "react";

const MONO = "'IBM Plex Mono', monospace";

interface PaletteNode {
  id: string;
  label: string;
  type: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  nodes: PaletteNode[];
  onSelect: (nodeId: string) => void;
}

export default function CommandPalette({ open, onClose, nodes, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const filtered = nodes
    .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && filtered[cursor]) { onSelect(filtered[cursor].id); onClose(); }
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 120,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 480, background: "rgba(7,17,31,0.97)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(140,194,255,0.2)", borderRadius: 16,
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Jump to tool call…"
          style={{
            width: "100%", padding: "14px 18px",
            background: "transparent", border: "none", borderBottom: "1px solid rgba(140,194,255,0.12)",
            color: "#edf5ff", fontFamily: MONO, fontSize: 13, outline: "none",
            boxSizing: "border-box",
          }}
        />
        {filtered.length === 0 ? (
          <div style={{ padding: "12px 18px", fontFamily: MONO, fontSize: 12, color: "var(--muted)" }}>
            No results
          </div>
        ) : (
          filtered.map((n, i) => (
            <div
              key={n.id}
              onClick={() => { onSelect(n.id); onClose(); }}
              style={{
                padding: "10px 18px", cursor: "pointer", fontFamily: MONO,
                background: i === cursor ? "rgba(97,208,255,0.08)" : "transparent",
                borderLeft: `2px solid ${i === cursor ? "#61d0ff" : "transparent"}`,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{ fontSize: 11, color: "#edf5ff" }}>{n.label}</span>
              <span style={{ fontSize: 9, color: "var(--muted)", marginLeft: "auto" }}>{n.type}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
