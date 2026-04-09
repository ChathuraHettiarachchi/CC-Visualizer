import type { DiffLine } from "@/lib/diff";

interface DiffViewerProps {
  diff: DiffLine[];
  maxHeight?: number;
}

const MONO = "'IBM Plex Mono', monospace";

export default function DiffViewer({ diff, maxHeight = 300 }: DiffViewerProps) {
  if (diff.length === 0) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>
        No changes
      </div>
    );
  }

  return (
    <div style={{
      overflowY: "auto",
      maxHeight,
      borderRadius: 12,
      border: "1px solid rgba(140,194,255,0.12)",
      background: "rgba(0,0,0,0.3)",
      marginBottom: 4,
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 11 }}>
        <tbody>
          {diff.map((line, i) => {
            const bg =
              line.type === "add"    ? "rgba(74,222,128,0.10)" :
              line.type === "remove" ? "rgba(248,113,113,0.10)" :
              "transparent";
            const prefixColor =
              line.type === "add"    ? "#4ade80" :
              line.type === "remove" ? "#f87171" :
              "rgba(140,194,255,0.3)";
            const prefix =
              line.type === "add"    ? "+" :
              line.type === "remove" ? "−" :
              " ";

            return (
              <tr key={i} style={{ background: bg }}>
                {/* Old line number */}
                <td style={{
                  width: 28, textAlign: "right", paddingRight: 6, paddingLeft: 6,
                  color: "rgba(140,194,255,0.3)", userSelect: "none", verticalAlign: "top",
                  paddingTop: 2, paddingBottom: 2,
                }}>
                  {line.oldNo ?? ""}
                </td>
                {/* New line number */}
                <td style={{
                  width: 28, textAlign: "right", paddingRight: 8,
                  color: "rgba(140,194,255,0.3)", userSelect: "none", verticalAlign: "top",
                  paddingTop: 2, paddingBottom: 2,
                }}>
                  {line.newNo ?? ""}
                </td>
                {/* Prefix */}
                <td style={{
                  width: 14, color: prefixColor, userSelect: "none",
                  fontWeight: 700, verticalAlign: "top",
                  paddingTop: 2, paddingBottom: 2,
                }}>
                  {prefix}
                </td>
                {/* Line text */}
                <td style={{
                  color: line.type === "same" ? "#c5d5e8" : line.type === "add" ? "#4ade80" : "#f87171",
                  whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.55,
                  paddingTop: 2, paddingBottom: 2, paddingRight: 10,
                }}>
                  {line.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
