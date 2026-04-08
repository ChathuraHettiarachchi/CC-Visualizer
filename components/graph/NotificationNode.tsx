import { Handle, Position } from "@xyflow/react";

interface NotificationNodeData {
  message: string;
  timestamp: number;
}

export default function NotificationNode({ data }: { data: NotificationNodeData }) {
  const msg = data.message.length > 100 ? data.message.slice(0, 97) + "..." : data.message;

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

      <div style={{ color: "#d29922", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
        Notification
      </div>

      <div style={{ color: "#8b949e" }}>{msg}</div>

      <Handle type="source" position={Position.Bottom} style={{ background: "#30363d" }} />
    </div>
  );
}
