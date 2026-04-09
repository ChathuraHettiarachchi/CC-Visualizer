import { useState } from "react";
import type { ReactNode } from "react";
import type { ClaudeEvent } from "@/lib/types";
import type { SelectedNode } from "@/components/canvas/GraphCanvas";
import InspectorPanel from "@/components/panels/InspectorPanel";
import Timeline from "@/components/panels/Timeline";
import HeatmapPanel from "@/components/panels/HeatmapPanel";
import BookmarkPanel from "@/components/panels/BookmarkPanel";
import DiffPanel from "@/components/panels/DiffPanel";
import { isBookmarked, addBookmark, removeBookmark } from "@/lib/bookmarks";

interface RightRailProps {
  node: SelectedNode | null;
  events: ClaudeEvent[];
  onClose: () => void;
  sessionId: string;
  compareNode?: SelectedNode | null;
  onClearCompare?: () => void;
}

function RailPanel({ eyebrow, children, flex }: { eyebrow: string; children: ReactNode; flex?: number }) {
  return (
    <div className="glass" style={{
      padding: 16,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      flex: flex ?? "none",
      minHeight: 0,
    }}>
      <div className="eyebrow" style={{ marginBottom: 10, flexShrink: 0 }}>{eyebrow}</div>
      {children}
    </div>
  );
}

export default function RightRail({ node, events, onClose, sessionId, compareNode, onClearCompare }: RightRailProps) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

      {/* Inspector */}
      <RailPanel eyebrow="Inspector" flex={node ? 2 : undefined}>
        {compareNode && node ? (
          <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
            <DiffPanel nodeA={node} nodeB={compareNode} onClear={onClearCompare ?? (() => {})} />
          </div>
        ) : node ? (
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexShrink: 0 }}>
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
            <InspectorPanel node={node} events={events} />
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
            Select a node to inspect
          </div>
        )}
      </RailPanel>

      {/* Timeline */}
      <RailPanel eyebrow="Timeline" flex={1}>
        <Timeline events={events} selectedNode={node} />
      </RailPanel>

      {/* Files */}
      <RailPanel eyebrow="Files" flex={1}>
        <HeatmapPanel events={events} />
      </RailPanel>

      {/* Bookmarks */}
      <RailPanel eyebrow="Bookmarks">
        <BookmarkPanel
          sessionId={sessionId}
          onSelect={() => {}}
          refreshTrigger={bookmarkRefresh}
          onRefresh={() => setBookmarkRefresh(n => n + 1)}
        />
      </RailPanel>

    </div>
  );
}
