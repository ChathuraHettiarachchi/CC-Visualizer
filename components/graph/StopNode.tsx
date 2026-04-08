import { Handle, Position } from "@xyflow/react";

interface StopNodeData {
  eventType: "Stop" | "SubagentStop";
  timestamp: number;
}

export default function StopNode({ data, selected }: { data: StopNodeData; selected?: boolean }) {
  const label = data.eventType === "Stop" ? "Session complete" : "Subagent complete";

  return (
    <div
      style={{
        background: "#161b22",
        border: `1px solid ${selected ? "#1f6feb" : "#30363d"}`,
        borderRadius: 6,
        padding: "10px 14px",
        minWidth: 220,
        fontFamily: "monospace",
        fontSize: 12,
        color: "#8b949e",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#30363d" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10 }}>■</span>
        <span>{label}</span>
      </div>
    </div>
  );
}
