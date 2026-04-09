"use client";

import { useMemo } from "react";
import { getBookmarks, removeBookmark } from "@/lib/bookmarks";

interface BookmarkPanelProps {
  sessionId: string;
  onSelect: (nodeId: string) => void;
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function BookmarkPanel({ sessionId, onSelect, refreshTrigger, onRefresh }: BookmarkPanelProps) {
  const bookmarks = useMemo(
    () => getBookmarks(sessionId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, refreshTrigger]
  );

  if (bookmarks.length === 0) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
        No bookmarks yet. Select a node and click ☆ in the inspector.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
      {bookmarks.map(bm => (
        <div
          key={bm.nodeId}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 10,
            border: "1px solid var(--line)", background: "rgba(255,255,255,0.025)",
            cursor: "pointer",
          }}
          onClick={() => onSelect(bm.nodeId)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, color: "var(--text)",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {bm.label}
            </div>
            {bm.note && (
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                {bm.note}
              </div>
            )}
          </div>
          <button
            onClick={e => {
              e.stopPropagation();
              removeBookmark(sessionId, bm.nodeId);
              onRefresh();
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--muted)", fontSize: 14, flexShrink: 0, padding: "0 2px",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
