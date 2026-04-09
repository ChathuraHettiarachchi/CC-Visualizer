import type { SelectedNode } from "@/components/canvas/GraphCanvas";

interface DiffPanelProps {
  nodeA: SelectedNode;
  nodeB: SelectedNode;
  onClear: () => void;
}

function fields(node: SelectedNode) {
  const d = node.data;
  return {
    type:     node.type ?? "—",
    tool:     (d.toolName as string) ?? "—",
    input:    d.toolInput ? JSON.stringify(d.toolInput, null, 2) : "—",
    output:   d.toolResponse ? JSON.stringify(d.toolResponse, null, 2).slice(0, 400) : "—",
    duration: d.duration != null ? `${d.duration}ms` : "—",
    status:   (d.status as string) ?? "—",
  };
}

function ValueCell({ value, isMultiline }: { value: string; isMultiline: boolean }) {
  if (isMultiline && value !== "—") {
    return (
      <pre style={{
        margin: 0, color: "#edf5ff", fontSize: 10,
        maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap",
        wordBreak: "break-all", fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {value}
      </pre>
    );
  }
  return (
    <span style={{
      color: "#edf5ff", fontSize: 11,
      fontFamily: "'IBM Plex Mono', monospace",
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}

export default function DiffPanel({ nodeA, nodeB, onClear }: DiffPanelProps) {
  const a = fields(nodeA);
  const b = fields(nodeB);

  const rows: { label: string; valA: string; valB: string; multiline?: boolean }[] = [
    { label: "Type",     valA: a.type,     valB: b.type },
    { label: "Tool",     valA: a.tool,     valB: b.tool },
    { label: "Status",   valA: a.status,   valB: b.status },
    { label: "Duration", valA: a.duration, valB: b.duration },
    { label: "Input",    valA: a.input,    valB: b.input,    multiline: true },
    { label: "Output",   valA: a.output,   valB: b.output,   multiline: true },
  ];

  return (
    <div style={{ overflow: "auto", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "#61d0ff", fontSize: 10 }}>{nodeA.id.slice(0, 14)}…</span>
        <button
          onClick={onClear}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(140,194,255,0.2)",
            borderRadius: 10, color: "#91a8c7", cursor: "pointer",
            fontSize: 10, padding: "3px 10px", fontFamily: "inherit",
          }}
        >
          ✕ Clear compare
        </button>
        <span style={{ color: "#ffbf69", fontSize: 10 }}>{nodeB.id.slice(0, 14)}…</span>
      </div>

      {/* Rows */}
      {rows.map(({ label, valA, valB, multiline }) => {
        const differs = valA !== valB;
        return (
          <div
            key={label}
            style={{
              display: "grid", gridTemplateColumns: "72px 1fr 1fr", gap: 6,
              padding: "5px 0",
              background: differs ? "rgba(255,191,105,0.08)" : "transparent",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: 10, alignSelf: "start", paddingTop: 2 }}>
              {label}
            </span>
            <ValueCell value={valA} isMultiline={!!multiline} />
            <ValueCell value={valB} isMultiline={!!multiline} />
          </div>
        );
      })}
    </div>
  );
}
