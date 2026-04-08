import type { Node, Edge } from "@xyflow/react";
import type {
  ClaudeEvent,
  PreToolUseEvent,
  PostToolUseEvent,
} from "@/lib/types";

const NODE_SPACING = 140;

interface ToolCallEntry {
  pre: PreToolUseEvent;
  post?: PostToolUseEvent;
}

interface GraphItem {
  id: string;
  type: "toolcall" | "notification" | "stop";
  data: Record<string, unknown>;
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
        graphItems.push({
          id: `tool-${event.tool_use_id}`,
          type: "toolcall",
          data: {
            toolName: event.tool_name,
            toolInput: event.tool_input,
            toolResponse: entry.post?.tool_response ?? undefined,
            status: entry.post ? "complete" : "pending",
            timestamp: event.timestamp,
          },
        });
      }
    } else if (event.hook_event_name === "PostToolUse") {
      // Skip — already merged above
    } else if (event.hook_event_name === "Notification") {
      graphItems.push({
        id: `notif-${event.timestamp}-${i}`,
        type: "notification",
        data: { message: event.message, timestamp: event.timestamp },
      });
    } else if (
      event.hook_event_name === "Stop" ||
      event.hook_event_name === "SubagentStop"
    ) {
      graphItems.push({
        id: `stop-${event.timestamp}-${i}`,
        type: "stop",
        data: { eventType: event.hook_event_name, timestamp: event.timestamp },
      });
    }
  });

  const nodes: Node[] = graphItems.map((item, index) => ({
    id: item.id,
    type: item.type,
    position: { x: 0, y: index * NODE_SPACING },
    data: item.data,
  }));

  // Compute which tool_use_ids have a matching PostToolUse (completed)
  const completedIds = new Set(
    events
      .filter(e => e.hook_event_name === "PostToolUse")
      .map(e => (e as PostToolUseEvent).tool_use_id)
  );

  const edges: Edge[] = graphItems.slice(0, -1).map((item, index) => {
    // Extract tool_use_id from nodes whose id starts with "tool-"
    const toolUseId = item.id.startsWith("tool-") ? item.id.slice(5) : null;
    const isActive = toolUseId ? !completedIds.has(toolUseId) : false;

    return {
      id: `e-${item.id}__${graphItems[index + 1].id}`,
      source: item.id,
      target: graphItems[index + 1].id,
      type: "animated",
      data: { kind: "dispatch", isActive },
    };
  });

  return { nodes, edges };
}
