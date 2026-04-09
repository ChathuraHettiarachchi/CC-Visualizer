"use client";

import { useState } from "react";
import type { SelectedNode } from "@/components/canvas/GraphCanvas";
import { computeDiff } from "@/lib/diff";
import DiffViewer from "@/components/panels/DiffViewer";

const MONO = "'IBM Plex Mono', monospace";

function Label({ children, open, onToggle }: { children: React.ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        width: "100%", background: "none", border: "none", cursor: "pointer",
        padding: "8px 0 4px", margin: 0,
      }}
    >
      <span style={{
        fontSize: 9, fontWeight: 700, color: "var(--muted)",
        textTransform: "uppercase", letterSpacing: "0.12em",
        fontFamily: MONO,
      }}>{children}</span>
      <span style={{ fontFamily: MONO, color: "var(--muted)", fontSize: 10, marginLeft: "auto" }}>
        {open ? "▾" : "▸"}
      </span>
    </button>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      maxHeight: 220,
      overflowY: "auto",
      borderRadius: 12,
      border: "1px solid rgba(140,194,255,0.12)",
      background: "rgba(0,0,0,0.3)",
      marginBottom: 4,
    }}>
      <pre style={{
        margin: 0,
        padding: "10px 12px",
        fontSize: 11,
        fontFamily: MONO,
        color: "#c5d5e8",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        lineHeight: 1.55,
      }}>
        {children}
      </pre>
    </div>
  );
}

function Timestamp({ ts }: { ts: number }) {
  return (
    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 10, fontFamily: MONO }}>
      {new Date(ts).toLocaleTimeString()}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    complete: ["rgba(63,185,80,0.15)", "#3fb950"],
    pending:  ["rgba(210,153,34,0.15)", "#d29922"],
    error:    ["rgba(248,113,113,0.15)", "#f87171"],
  };
  const [bg, fg] = colors[status] ?? ["rgba(140,194,255,0.1)", "#91a8c7"];
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 10, fontWeight: 600, fontFamily: MONO,
      background: bg, color: fg, border: `1px solid ${fg}`,
      marginBottom: 8,
    }}>
      {status}
    </span>
  );
}

function FileHeader({ filePath, badge }: { filePath: string; badge?: string }) {
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  const basename = lastSlash === -1 ? filePath : normalized.slice(lastSlash + 1);
  const dir = lastSlash === -1 ? "." : normalized.slice(0, lastSlash);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
          {basename}
        </span>
        {badge && (
          <span style={{
            fontFamily: MONO, fontSize: 9, color: "rgba(140,194,255,0.6)",
            background: "rgba(140,194,255,0.08)", border: "1px solid rgba(140,194,255,0.18)",
            borderRadius: 5, padding: "1px 6px",
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--muted)", marginTop: 2, wordBreak: "break-all" }}>
        {dir}
      </div>
    </div>
  );
}

export default function NodeDetail({ node }: { node: SelectedNode }) {
  const [inputOpen,  setInputOpen]  = useState(true);
  const [outputOpen, setOutputOpen] = useState(true);

  const { type, data } = node;

  if (type === "toolcall") {
    const toolName     = data.toolName as string;
    const toolInput    = data.toolInput as Record<string, unknown>;
    const toolResponse = data.toolResponse;
    const status       = data.status as string;
    const timestamp    = data.timestamp as number;

    // ── Edit / MultiEdit ────────────────────────────────────────────
    if (toolName === "Edit" || toolName === "MultiEdit") {
      const filePath = (toolInput.file_path as string) ?? "";

      if (toolName === "Edit") {
        const oldStr = typeof toolInput.old_string === "string" ? toolInput.old_string : null;
        const newStr = typeof toolInput.new_string === "string" ? toolInput.new_string : null;

        if (oldStr !== null && newStr !== null) {
          const diff = computeDiff(oldStr, newStr);
          return (
            <div style={{ fontFamily: MONO }}>
              <Badge status={status} />
              <FileHeader filePath={filePath} />
              <DiffViewer diff={diff} />
              <Timestamp ts={timestamp} />
            </div>
          );
        }
      }

      if (toolName === "MultiEdit") {
        const edits = Array.isArray(toolInput.edits)
          ? (toolInput.edits as Array<{ old_string?: string; new_string?: string }>)
          : [];
        return (
          <div style={{ fontFamily: MONO }}>
            <Badge status={status} />
            <FileHeader filePath={filePath} />
            {edits.map((edit, i) => {
              const diff = computeDiff(edit.old_string ?? "", edit.new_string ?? "");
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4 }}>
                    Edit {i + 1} of {edits.length}
                  </div>
                  <DiffViewer diff={diff} />
                </div>
              );
            })}
            <Timestamp ts={timestamp} />
          </div>
        );
      }
    }

    // ── Write / NotebookEdit ─────────────────────────────────────────
    if (toolName === "Write" || toolName === "NotebookEdit") {
      const filePath = ((toolInput.file_path ?? toolInput.notebook_path) as string) ?? "";
      const content  = typeof toolInput.content === "string"
        ? toolInput.content
        : JSON.stringify(toolInput.content, null, 2);
      return (
        <div style={{ fontFamily: MONO }}>
          <Badge status={status} />
          <FileHeader filePath={filePath} badge="Written" />
          <CodeBlock>{content}</CodeBlock>
          <Timestamp ts={timestamp} />
        </div>
      );
    }

    // ── Read ─────────────────────────────────────────────────────────
    if (toolName === "Read") {
      const filePath = (toolInput.file_path as string) ?? "";
      const content  = typeof toolResponse === "string"
        ? toolResponse
        : JSON.stringify(toolResponse, null, 2);
      return (
        <div style={{ fontFamily: MONO }}>
          <Badge status={status} />
          <FileHeader filePath={filePath} badge="Read" />
          {toolResponse !== undefined ? (
            <CodeBlock>{content}</CodeBlock>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 11 }}>No response yet</div>
          )}
          <Timestamp ts={timestamp} />
        </div>
      );
    }

    // ── Default: all other tool calls ────────────────────────────────
    return (
      <div style={{ fontFamily: MONO }}>
        <Badge status={status} />

        <Label open={inputOpen} onToggle={() => setInputOpen(o => !o)}>Input</Label>
        {inputOpen && (
          <CodeBlock>{JSON.stringify(toolInput, null, 2)}</CodeBlock>
        )}

        {toolResponse !== undefined && (
          <>
            <Label open={outputOpen} onToggle={() => setOutputOpen(o => !o)}>Output</Label>
            {outputOpen && (
              <CodeBlock>
                {typeof toolResponse === "string"
                  ? toolResponse
                  : JSON.stringify(toolResponse, null, 2)}
              </CodeBlock>
            )}
          </>
        )}

        <Timestamp ts={timestamp} />
      </div>
    );
  }

  if (type === "notification") {
    return (
      <div style={{ fontFamily: MONO }}>
        <div style={{ color: "var(--text)", lineHeight: 1.6, fontSize: 12 }}>
          {data.message as string}
        </div>
        <Timestamp ts={data.timestamp as number} />
      </div>
    );
  }

  if (type === "stop") {
    return (
      <div style={{ fontFamily: MONO }}>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {data.eventType === "Stop" ? "Session complete" : "Subagent complete"}
        </div>
        <Timestamp ts={data.timestamp as number} />
      </div>
    );
  }

  return null;
}
