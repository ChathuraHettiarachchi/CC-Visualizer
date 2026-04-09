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
import WaterfallPanel from "@/components/panels/WaterfallPanel";
import ErrorLogPanel from "@/components/panels/ErrorLogPanel";
import { isBookmarked, addBookmark, removeBookmark } from "@/lib/bookmarks";

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
  eyebrow, children, flex, collapsible = false,
}: { eyebrow: string; children: ReactNode; flex?: number; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="glass" style={{
      padding: 16, display: "flex", flexDirection: "column",
      overflow: "hidden", flex: open ? (flex ?? "none") : "none",
      minHeight: 0, flexShrink: 0,
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

      {/* Inspector */}
      <RailPanel eyebrow="Inspector" flex={node ? 2 : undefined}>
        {compareNode && node ? (
          <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
            <DiffPanel nodeA={node} nodeB={compareNode} onClear={onClearCompare ?? (() => {})} />
          </div>
        ) : node ? (
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
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
            <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
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
      <RailPanel eyebrow="Timeline" collapsible flex={1}>
        <div style={{ overflowY: "auto", maxHeight: 200, flex: 1 }}>
          <Timeline events={events} selectedNode={node} />
        </div>
      </RailPanel>

      {/* Waterfall */}
      <RailPanel eyebrow="Waterfall" collapsible>
        <WaterfallPanel
          events={events}
          onSelect={onSelectNodeById}
        />
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
        <HeatmapPanel events={events} />
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
