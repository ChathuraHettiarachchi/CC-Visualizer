import type { Node, Edge } from "@xyflow/react";
import type {
  ClaudeEvent,
  PreToolUseEvent,
  PostToolUseEvent,
} from "@/lib/types";

const COLS = 5;
const SPACING_X = 170;
const SPACING_Y = 200;

interface ToolCallEntry {
  pre: PreToolUseEvent;
  post?: PostToolUseEvent;
}

interface GraphItem {
  id: string;
  type: "toolcall" | "notification" | "stop";
  data: Record<string, unknown>;
  isStart?: boolean;
}

export function eventsToGraph(events: ClaudeEvent[]): {
  nodes: Node[];
  edges: Edge[];
} {
  if (events.length === 0) return { nodes: [], edges: [] };

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Pass 1: build tool call map keyed by tool_use_id
  const toolCallMap = new Map<string, ToolCallEntry>();
  for (const event of sorted) {
    if (event.hook_event_name === "PreToolUse") {
      toolCallMap.set(event.tool_use_id, { pre: event });
    } else if (event.hook_event_name === "PostToolUse") {
      const entry = toolCallMap.get(event.tool_use_id);
      if (entry) {
        entry.post = event;
      } else {
        // Orphan PostToolUse — treat pre as same event
        toolCallMap.set(event.tool_use_id, {
          pre: event as unknown as PreToolUseEvent,
          post: event,
        });
      }
    }
  }

  // Pass 2: build ordered graph items (skip PostToolUse — merged into PreToolUse)
  const seenToolUseIds = new Set<string>();
  const graphItems: GraphItem[] = [];

  sorted.forEach((event, i) => {
    if (event.hook_event_name === "PreToolUse") {
      if (!seenToolUseIds.has(event.tool_use_id)) {
        seenToolUseIds.add(event.tool_use_id);
        const entry = toolCallMap.get(event.tool_use_id)!;
        const duration = entry.post
          ? entry.post.timestamp - entry.pre.timestamp
          : null;
        const isError = entry.post
          ? (typeof entry.post.tool_response === "string" &&
             /error|exception|failed|traceback/i.test(entry.post.tool_response.slice(0, 500)))
          : false;

        graphItems.push({
          id: `tool-${event.tool_use_id}`,
          type: "toolcall",
          isStart: graphItems.length === 0,
          data: {
            toolName: event.tool_name,
            toolInput: event.tool_input,
            toolResponse: entry.post?.tool_response ?? undefined,
            status: isError ? "error" : entry.post ? "complete" : "pending",
            timestamp: event.timestamp,
            duration,
          },
        });
      }
    } else if (event.hook_event_name === "PostToolUse") {
      // Skip — already merged above
    } else if (event.hook_event_name === "Notification") {
      graphItems.push({
        id: `notif-${event.timestamp}-${i}`,
        type: "notification",
        isStart: graphItems.length === 0,
        data: { message: event.message, timestamp: event.timestamp },
      });
    } else if (
      event.hook_event_name === "Stop" ||
      event.hook_event_name === "SubagentStop"
    ) {
      graphItems.push({
        id: `stop-${event.timestamp}-${i}`,
        type: "stop",
        isStart: graphItems.length === 0,
        data: { eventType: event.hook_event_name, timestamp: event.timestamp },
      });
    }
  });

  const nodes: Node[] = graphItems.map((item, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    // Snake: even rows left-to-right, odd rows right-to-left
    const x = (row % 2 === 0) ? col * SPACING_X : (COLS - 1 - col) * SPACING_X;
    const y = row * SPACING_Y;
    return { id: item.id, type: item.type, position: { x, y }, data: { ...item.data, isStart: item.isStart ?? false } };
  });

  const edges: Edge[] = graphItems.slice(0, -1).map((item, index) => {
    return {
      id: `e-${item.id}__${graphItems[index + 1].id}`,
      source: item.id,
      target: graphItems[index + 1].id,
      type: "animated",
      data: { kind: "dispatch", isActive: true },
    };
  });

  return { nodes, edges };
}
