"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { ClaudeEvent } from "@/lib/types";
import type { SelectedNode } from "@/components/canvas/GraphCanvas";
import InspectorPanel from "@/components/panels/InspectorPanel";
import Timeline from "@/components/panels/Timeline";
import HeatmapPanel from "@/components/panels/HeatmapPanel";
import BookmarkPanel from "@/components/panels/BookmarkPanel";
import DiffPanel from "@/components/panels/DiffPanel";
import ErrorLogPanel from "@/components/panels/ErrorLogPanel";
import { isBookmarked, addBookmark, removeBookmark } from "@/lib/bookmarks";
import { estimateContextUsage } from "@/lib/context-estimate";

interface RightRailProps {
  node: SelectedNode | null;
  events: ClaudeEvent[];
  onClose: () => void;
  sessionId: string;
  compareNode?: SelectedNode | null;
  onClearCompare?: () => void;
  onSelectNodeById?: (nodeId: string) => void;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-ibm-plex-mono), monospace" };

function RailPanel({
  eyebrow, children, collapsible = false,
}: { eyebrow: string; children: ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="glass" style={{
      padding: 16, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: open ? 10 : 0, flexShrink: 0 }}>
        <div className="eyebrow">{eyebrow}</div>
        {collapsible && (
          <button
            onClick={() => setOpen(o => !o)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", ...MONO, fontSize: 12, padding: 0 }}
          >
            {open ? "▾" : "▸"}
          </button>
        )}
      </div>
      {open && children}
    </div>
  );
}

export default function RightRail({
  node, events, onClose, sessionId, compareNode, onClearCompare, onSelectNodeById,
}: RightRailProps) {
  const [bookmarkRefresh, setBookmarkRefresh] = useState(0);

  // ── Stats computation ──────────────────────────────────────────────
  const { globalStats, contextUsage } = (() => {
    // Sort all events chronologically for the cumulative context walk
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Build a map of tool_use_id → response char count
    const postMap = new Map<string, number>();
    for (const e of sorted) {
      if (e.hook_event_name === "PostToolUse") {
        postMap.set(
          (e as { tool_use_id: string }).tool_use_id,
          String((e as { tool_response: unknown }).tool_response ?? "").length,
        );
      }
    }

    // Walk turns in order; for each tool call the API input = full context so far
    let cumulativeChars = 0;
    let outTokTotal = 0;
    let sessionCost = 0;
    const seen = new Set<string>();

    for (const e of sorted) {
      if (e.hook_event_name === "PreToolUse") {
        const id = (e as { tool_use_id: string }).tool_use_id;
        if (seen.has(id)) continue;
        seen.add(id);
        cumulativeChars += JSON.stringify((e as { tool_input: unknown }).tool_input ?? {}).length;
        const responseChars = postMap.get(id) ?? 0;
        const inTok  = cumulativeChars / 4;
        const outTok = responseChars / 4;
        sessionCost  += (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
        outTokTotal  += outTok;
        cumulativeChars += responseChars;
      } else if (e.hook_event_name === "Notification") {
        cumulativeChars += ((e as { message?: string }).message ?? "").length;
      }
    }

    const totalInTok  = Math.round(cumulativeChars / 4);
    const totalOutTok = Math.round(outTokTotal);
    const fmtTok = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    const pending = events.filter(e => e.hook_event_name === "PreToolUse");
    const done = new Set(
      events.filter(e => e.hook_event_name === "PostToolUse")
        .map(e => (e as { tool_use_id: string }).tool_use_id)
    );
    const active = pending.find(e => !done.has((e as { tool_use_id: string }).tool_use_id));

    return {
      globalStats: [
        { label: "Events",   value: events.length },
        { label: "Tools",    value: pending.length },
        { label: "Active",   value: active ? (active as { tool_name: string }).tool_name : "—" },
        { label: "~Cost",    value: sessionCost < 0.01 ? "<$0.01" : `$${sessionCost.toFixed(2)}` },
        { label: "~In tok",  value: fmtTok(totalInTok) },
        { label: "~Out tok", value: fmtTok(totalOutTok) },
      ] as Array<{ label: string; value: string | number }>,
      contextUsage: estimateContextUsage(events),
    };
  })();

  const bookmarked = node ? isBookmarked(sessionId, node.id) : false;

  function toggleBookmark() {
    if (!node) return;
    if (bookmarked) {
      removeBookmark(sessionId, node.id);
    } else {
      const label = node.type === "toolcall"
        ? ((node.data.toolName as string) ?? "tool")
        : (node.type ?? "node");
      addBookmark(sessionId, { nodeId: node.id, nodeType: node.type, label, note: "", timestamp: Date.now() });
    }
    setBookmarkRefresh(n => n + 1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", height: "100%" }}>

      {/* Stats */}
      <RailPanel eyebrow="Stats" collapsible>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {globalStats.map(({ label, value }) => (
            <div key={label} style={{
              padding: 10, borderRadius: 12,
              border: "1px solid var(--line)", background: "rgba(255,255,255,0.03)",
            }}>
              <div style={{
                ...MONO,
                fontSize: typeof value === "string" && value.length > 4 ? 13 : 20,
                fontWeight: 700, color: "var(--text)", lineHeight: 1.1,
                marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {value}
              </div>
              <div style={{ ...MONO, fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
        {/* Context window bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
            <span style={{ ...MONO, fontSize: 9, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
              Context window
            </span>
            <span style={{ ...MONO, fontSize: 9, color: "var(--muted)" }}>
              ~{contextUsage.percentage}%
            </span>
          </div>
          <div style={{ height: 4, background: "var(--line)", borderRadius: 2 }}>
            <div style={{
              height: "100%", width: `${contextUsage.percentage}%`, borderRadius: 2,
              background: contextUsage.percentage < 60 ? "#22c55e" : contextUsage.percentage < 85 ? "#ffbf69" : "#f87171",
              transition: "width 0.3s ease",
            }} />
          </div>
          <div style={{ ...MONO, fontSize: 9, color: "rgba(140,194,255,0.35)", marginTop: 3 }}>
            ~{(contextUsage.usedTokens / 1000).toFixed(1)}k / {(contextUsage.totalTokens / 1000).toFixed(0)}k tokens
          </div>
        </div>
      </RailPanel>

      {/* Inspector */}
      <RailPanel eyebrow="Inspector">
        {compareNode && node ? (
          <div style={{ overflowY: "auto", maxHeight: 420 }}>
            <DiffPanel nodeA={node} nodeB={compareNode} onClear={onClearCompare ?? (() => {})} />
          </div>
        ) : node ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <button
                onClick={toggleBookmark}
                title={bookmarked ? "Remove bookmark" : "Bookmark this node"}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: bookmarked ? "#ffbf69" : "var(--muted)", fontSize: 18, lineHeight: 1, padding: "2px 4px",
                }}
              >
                {bookmarked ? "★" : "☆"}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: "none", border: "none",
                  color: "var(--muted)", cursor: "pointer",
                  fontSize: 16, lineHeight: 1, padding: "2px 4px",
                }}
                aria-label="Close inspector"
              >×</button>
            </div>
            <div style={{ overflowY: "auto", maxHeight: 420 }}>
              <InspectorPanel node={node} events={events} />
            </div>
          </div>
        ) : (
          <div style={{ ...MONO, color: "var(--muted)", fontSize: 12 }}>
            Select a node to inspect
          </div>
        )}
      </RailPanel>

      {/* Timeline */}
      <RailPanel eyebrow="Timeline" collapsible>
        <div style={{ overflowY: "auto", maxHeight: 180 }}>
          <Timeline events={events} selectedNode={node} />
        </div>
      </RailPanel>

      {/* Errors */}
      <RailPanel eyebrow="Errors" collapsible>
        <ErrorLogPanel
          events={events}
          onSelect={onSelectNodeById}
        />
      </RailPanel>

      {/* Files */}
      <RailPanel eyebrow="Files" collapsible>
        <div style={{ maxHeight: 130, overflowY: "auto" }}>
          <HeatmapPanel events={events} />
        </div>
      </RailPanel>

      {/* Bookmarks */}
      <RailPanel eyebrow="Bookmarks" collapsible>
        <BookmarkPanel
          sessionId={sessionId}
          onSelect={(nodeId) => {
            onSelectNodeById?.(nodeId);
            setBookmarkRefresh(n => n + 1);
          }}
          refreshTrigger={bookmarkRefresh}
          onRefresh={() => setBookmarkRefresh(n => n + 1)}
        />
      </RailPanel>

    </div>
  );
}
