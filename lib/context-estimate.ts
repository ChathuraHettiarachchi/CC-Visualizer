import type { ClaudeEvent } from "@/lib/types";

const CONTEXT_WINDOW = 200_000;

export interface ContextUsage {
  usedTokens: number;
  totalTokens: number;
  percentage: number; // 0–100
}

export function estimateContextUsage(events: ClaudeEvent[]): ContextUsage {
  let chars = 0;
  for (const e of events) {
    if (e.hook_event_name === "PreToolUse") {
      chars += JSON.stringify((e as { tool_input: unknown }).tool_input ?? {}).length;
    } else if (e.hook_event_name === "PostToolUse") {
      chars += String((e as { tool_response: unknown }).tool_response ?? "").length;
    }
  }
  const usedTokens = Math.round(chars / 4);
  const percentage = Math.min(100, Math.round((usedTokens / CONTEXT_WINDOW) * 100));
  return { usedTokens, totalTokens: CONTEXT_WINDOW, percentage };
}
