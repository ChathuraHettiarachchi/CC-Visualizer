import type { ClaudeEvent, PreToolUseEvent, PostToolUseEvent } from "@/lib/types";

export interface DetectedPattern {
  id: string;
  label: string;
  description: string;
  nodeIds: string[];
}

export function detectPatterns(events: ClaudeEvent[]): DetectedPattern[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const patterns: DetectedPattern[] = [];

  const preEvents = sorted.filter((e): e is PreToolUseEvent => e.hook_event_name === "PreToolUse");
  const postMap = new Map<string, PostToolUseEvent>();
  for (const e of sorted) {
    if (e.hook_event_name === "PostToolUse") postMap.set(e.tool_use_id, e);
  }

  function isError(e: PreToolUseEvent): boolean {
    const post = postMap.get(e.tool_use_id);
    return post
      ? typeof post.tool_response === "string" &&
        /error|exception|failed|traceback/i.test(post.tool_response.slice(0, 500))
      : false;
  }

  // ── Read-edit loop: same file read + edited 3+ times ─────────────
  const fileOps = new Map<string, string[]>();
  const FILE_TOOL_KEYS: Record<string, string> = {
    Read: "file_path", Write: "file_path", Edit: "file_path",
    MultiEdit: "file_path", NotebookEdit: "notebook_path",
  };
  for (const e of preEvents) {
    const key = FILE_TOOL_KEYS[e.tool_name];
    if (!key) continue;
    const filePath = e.tool_input[key] as string | undefined;
    if (!filePath) continue;
    const existing = fileOps.get(filePath) ?? [];
    existing.push(`tool-${e.tool_use_id}`);
    fileOps.set(filePath, existing);
  }
  for (const [filePath, nodeIds] of fileOps.entries()) {
    if (nodeIds.length >= 3) {
      const base = filePath.replace(/\\/g, "/");
      const name = base.slice(base.lastIndexOf("/") + 1);
      patterns.push({
        id: "read-edit-loop",
        label: "Read-edit loop",
        description: `${name} accessed ${nodeIds.length} times`,
        nodeIds,
      });
    }
  }

  // ── Error-retry: tool errors then same tool_name called within 3 events ──
  for (let i = 0; i < preEvents.length; i++) {
    if (!isError(preEvents[i])) continue;
    for (let j = i + 1; j < Math.min(i + 4, preEvents.length); j++) {
      if (preEvents[j].tool_name === preEvents[i].tool_name) {
        patterns.push({
          id: "error-retry",
          label: "Error-retry",
          description: `${preEvents[i].tool_name} errored then retried`,
          nodeIds: [`tool-${preEvents[i].tool_use_id}`, `tool-${preEvents[j].tool_use_id}`],
        });
        break;
      }
    }
  }

  // ── Long chain: 20+ tool calls without Stop ───────────────────────
  const stopTimestamps = sorted
    .filter((e) => e.hook_event_name === "Stop" || e.hook_event_name === "SubagentStop")
    .map((e) => e.timestamp);
  if (preEvents.length >= 20) {
    let chainStart = 0;
    for (let i = 0; i < preEvents.length; i++) {
      const stopsBetween = stopTimestamps.filter(
        (t) => t > preEvents[chainStart].timestamp && t < preEvents[i].timestamp
      );
      if (stopsBetween.length > 0) {
        chainStart = i;
        continue;
      }
      if (i - chainStart + 1 >= 20) {
        patterns.push({
          id: "long-chain",
          label: "Long tool chain",
          description: `${i - chainStart + 1} tool calls without a stop`,
          nodeIds: preEvents.slice(chainStart, i + 1).map((e) => `tool-${e.tool_use_id}`),
        });
        chainStart = i + 1;
        i = chainStart - 1;
      }
    }
  }

  // ── Repeated failures: 3+ consecutive errors ──────────────────────
  let streak = 0;
  let streakStart = 0;
  for (let i = 0; i < preEvents.length; i++) {
    if (isError(preEvents[i])) {
      if (streak === 0) streakStart = i;
      streak++;
    } else {
      if (streak >= 3) {
        patterns.push({
          id: "repeated-failures",
          label: "Repeated failures",
          description: `${streak} consecutive errors`,
          nodeIds: preEvents.slice(streakStart, streakStart + streak).map((e) => `tool-${e.tool_use_id}`),
        });
      }
      streak = 0;
    }
  }
  if (streak >= 3) {
    patterns.push({
      id: "repeated-failures",
      label: "Repeated failures",
      description: `${streak} consecutive errors`,
      nodeIds: preEvents.slice(streakStart, streakStart + streak).map((e) => `tool-${e.tool_use_id}`),
    });
  }

  return patterns;
}
