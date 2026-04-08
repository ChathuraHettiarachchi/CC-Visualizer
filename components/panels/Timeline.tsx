import type { ClaudeEvent } from "@/lib/types";
import type { SelectedNode } from "@/components/canvas/GraphCanvas";

interface TimelineProps {
  events: ClaudeEvent[];
  selectedNode: SelectedNode | null;
}

function isSelected(event: ClaudeEvent, selectedNode: SelectedNode | null): boolean {
  if (!selectedNode) return false;
  if (selectedNode.type === "toolcall") {
    const toolUseId = selectedNode.id.slice(5); // strip 'tool-' prefix
    return "tool_use_id" in event && event.tool_use_id === toolUseId;
  }
  return event.timestamp === (selectedNode.data.timestamp as number);
}

function eventLabel(event: ClaudeEvent): string {
  if (event.hook_event_name === "PreToolUse") return `↑ ${event.tool_name}`;
  if (event.hook_event_name === "PostToolUse") return `↓ ${event.tool_name}`;
  if (event.hook_event_name === "Notification") return "notification";
  return "stop";
}

function eventColor(event: ClaudeEvent): string {
  if (event.hook_event_name === "PreToolUse") return "var(--accent)";
  if (event.hook_event_name === "PostToolUse") return "var(--accent-2)";
  if (event.hook_event_name === "Notification") return "var(--warn)";
  return "var(--muted)";
}

export default function Timeline({ events, selectedNode }: TimelineProps) {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div style={{ flex: 1, overflowY: "auto", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
      {sorted.map((event) => {
        const selected = isSelected(event, selectedNode);
        return (
          <div
            key={event.timestamp + event.hook_event_name}
            style={{
              padding: "5px 16px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: selected ? "rgba(31,111,235,0.1)" : "transparent",
              borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
            }}
          >
            <span style={{ color: "var(--muted)", flexShrink: 0, fontSize: 10 }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span style={{ color: eventColor(event), fontSize: 11, wordBreak: "break-word" }}>
              {eventLabel(event)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
