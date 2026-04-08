import { Handle, Position } from "@xyflow/react";

interface ToolCallNodeData {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResponse?: unknown;
  status: "pending" | "complete";
  timestamp: number;
}

function inputPreview(toolInput: Record<string, unknown>): string {
  const keys = Object.keys(toolInput);
  if (keys.length === 0) return "";
  const key = keys[0];
  const value = String(toolInput[key]);
  const line = `${key}: ${value}`;
  return line.length > 60 ? line.slice(0, 57) + "..." : line;
}

export default function ToolCallNode({ data }: { data: ToolCallNodeData }) {
  const preview = inputPreview(data.toolInput);

  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 6,
        padding: "10px 14px",
        minWidth: 220,
        fontFamily: "monospace",
        fontSize: 12,
        color: "#e6edf3",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#30363d" }} />

      <div style={{ color: "#1f6feb", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
        {data.toolName}
      </div>

      {preview && (
        <div style={{ color: "#8b949e", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden" }}>
          {preview}
        </div>
      )}

      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 600,
          background: data.status === "complete" ? "rgba(63,185,80,0.15)" : "rgba(210,153,34,0.15)",
          color: data.status === "complete" ? "#3fb950" : "#d29922",
          border: `1px solid ${data.status === "complete" ? "#3fb950" : "#d29922"}`,
        }}
      >
        {data.status}
      </span>

      <Handle type="source" position={Position.Bottom} style={{ background: "#30363d" }} />
    </div>
  );
}
