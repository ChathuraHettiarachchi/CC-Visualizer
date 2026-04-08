import type { ClaudeEvent, PreToolUseEvent } from "@/lib/types";

interface HeatmapPanelProps {
  events: ClaudeEvent[];
}

// Tools that touch specific files and their tool_input key for the path
const FILE_TOOL_KEYS: Record<string, string> = {
  Read: "file_path",
  Write: "file_path",
  Edit: "file_path",
  MultiEdit: "file_path",
  NotebookEdit: "notebook_path",
};

function extractFileCounts(events: ClaudeEvent[]): Array<{ path: string; count: number }> {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.hook_event_name !== "PreToolUse") continue;
    const e = event as PreToolUseEvent;
    const key = FILE_TOOL_KEYS[e.tool_name];
    if (!key) continue;
    const filePath = e.tool_input[key];
    if (typeof filePath !== "string" || !filePath) continue;
    counts.set(filePath, (counts.get(filePath) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);
}

function splitPath(filePath: string): { basename: string; dir: string } {
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) return { basename: filePath, dir: "." };
  return {
    basename: normalized.slice(lastSlash + 1),
    dir: normalized.slice(0, lastSlash) || "/",
  };
}

export default function HeatmapPanel({ events }: HeatmapPanelProps) {
  const files = extractFileCounts(events);
  const maxCount = files[0]?.count ?? 1;

  return (
    <div style={{ overflowY: "auto", fontFamily: "var(--font-ibm-plex-mono), monospace", flex: 1 }}>
      {files.length === 0 ? (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          No file activity yet
        </div>
      ) : (
        files.map(({ path, count }) => {
          const { basename, dir } = splitPath(path);
          const barWidth = Math.max(4, Math.round((count / maxCount) * 100));

          return (
            <div
              key={path}
              style={{ padding: "6px 0 8px" }}
            >
              {/* File name + count */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    color: "var(--text)",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {basename}
                </span>
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  {count}×
                </span>
              </div>

              {/* Directory path */}
              <div
                style={{
                  color: "var(--muted)",
                  fontSize: 10,
                  marginBottom: 5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {dir}
              </div>

              {/* Heat bar */}
              <div
                style={{
                  height: 3,
                  background: "var(--line)",
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    background: "var(--accent)",
                    borderRadius: 2,
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
