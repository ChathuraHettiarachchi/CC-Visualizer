import type { SelectedNode } from "@/components/canvas/GraphCanvas";

const sectionStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontFamily: "monospace",
  fontSize: 12,
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#8b949e",
        textTransform: "uppercase",
        letterSpacing: 1,
        margin: "12px 0 4px",
      }}
    >
      {children}
    </div>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        background: "#0d1117",
        border: "1px solid #30363d",
        borderRadius: 4,
        padding: "8px 10px",
        fontSize: 11,
        fontFamily: "monospace",
        color: "#e6edf3",
        overflowX: "auto",
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {children}
    </pre>
  );
}

function Timestamp({ ts }: { ts: number }) {
  return (
    <div style={{ fontSize: 10, color: "#8b949e", marginTop: 8 }}>
      {new Date(ts).toLocaleTimeString()}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const isComplete = status === "complete";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 600,
        background: isComplete ? "rgba(63,185,80,0.15)" : "rgba(210,153,34,0.15)",
        color: isComplete ? "#3fb950" : "#d29922",
        border: `1px solid ${isComplete ? "#3fb950" : "#d29922"}`,
        marginBottom: 8,
      }}
    >
      {status}
    </span>
  );
}

export default function NodeDetail({ node }: { node: SelectedNode }) {
  const { type, data } = node;

  if (type === "toolcall") {
    const toolInput = data.toolInput as Record<string, unknown>;
    const toolResponse = data.toolResponse;
    const status = data.status as string;
    const timestamp = data.timestamp as number;

    return (
      <div style={sectionStyle}>
        <Badge status={status} />
        <Label>Input</Label>
        <Pre>{JSON.stringify(toolInput, null, 2)}</Pre>
        {toolResponse !== undefined && (
          <>
            <Label>Output</Label>
            <Pre>
              {typeof toolResponse === "string"
                ? toolResponse
                : JSON.stringify(toolResponse, null, 2)}
            </Pre>
          </>
        )}
        <Timestamp ts={timestamp} />
      </div>
    );
  }

  if (type === "notification") {
    return (
      <div style={sectionStyle}>
        <div style={{ color: "#e6edf3", lineHeight: 1.6 }}>{data.message as string}</div>
        <Timestamp ts={data.timestamp as number} />
      </div>
    );
  }

  if (type === "stop") {
    return (
      <div style={sectionStyle}>
        <div style={{ color: "#8b949e" }}>
          {data.eventType === "Stop" ? "Session complete" : "Subagent complete"}
        </div>
        <Timestamp ts={data.timestamp as number} />
      </div>
    );
  }

  return null;
}
