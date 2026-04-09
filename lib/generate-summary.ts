import type { ClaudeEvent, PreToolUseEvent, PostToolUseEvent } from "@/lib/types";

export function generateSummary(sessionId: string, events: ClaudeEvent[]): string {
  if (events.length === 0) return `# Session Summary\n\nNo events recorded.\n`;

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const startTs = sorted[0].timestamp;
  const endTs   = sorted[sorted.length - 1].timestamp;
  const durationMs = endTs - startTs;
  const durationStr = durationMs >= 60_000
    ? `${Math.floor(durationMs / 60_000)}m ${Math.round((durationMs % 60_000) / 1000)}s`
    : `${Math.round(durationMs / 1000)}s`;

  const preEvents = sorted.filter((e): e is PreToolUseEvent => e.hook_event_name === "PreToolUse");
  const postMap = new Map<string, PostToolUseEvent>();
  for (const e of sorted) {
    if (e.hook_event_name === "PostToolUse") postMap.set(e.tool_use_id, e);
  }

  // Tool breakdown
  const toolStats = new Map<string, { calls: number; errors: number; totalMs: number }>();
  for (const e of preEvents) {
    const post = postMap.get(e.tool_use_id);
    const isError = post
      ? typeof post.tool_response === "string" && /error|exception|failed|traceback/i.test(post.tool_response.slice(0, 500))
      : false;
    const dur = post ? post.timestamp - e.timestamp : 0;
    const s = toolStats.get(e.tool_name) ?? { calls: 0, errors: 0, totalMs: 0 };
    s.calls++;
    if (isError) s.errors++;
    s.totalMs += dur;
    toolStats.set(e.tool_name, s);
  }

  // Files touched
  const FILE_TOOL_KEYS: Record<string, string> = {
    Read: "file_path", Write: "file_path", Edit: "file_path",
    MultiEdit: "file_path", NotebookEdit: "notebook_path",
  };
  const fileCounts = new Map<string, number>();
  for (const e of preEvents) {
    const key = FILE_TOOL_KEYS[e.tool_name];
    if (!key) continue;
    const path = e.tool_input[key] as string | undefined;
    if (path) fileCounts.set(path, (fileCounts.get(path) ?? 0) + 1);
  }

  // Errors
  const errorList: Array<{ toolName: string; ts: number; message: string }> = [];
  for (const e of preEvents) {
    const post = postMap.get(e.tool_use_id);
    if (!post) continue;
    if (typeof post.tool_response === "string" && /error|exception|failed|traceback/i.test(post.tool_response.slice(0, 500))) {
      errorList.push({
        toolName: e.tool_name,
        ts: e.timestamp,
        message: post.tool_response.split("\n")[0].slice(0, 120),
      });
    }
  }

  // Cost estimate
  let inputChars = 0, outputChars = 0;
  for (const e of sorted) {
    if (e.hook_event_name === "PreToolUse") inputChars += JSON.stringify(e.tool_input ?? {}).length;
    else if (e.hook_event_name === "PostToolUse") outputChars += String(e.tool_response ?? "").length;
  }
  const inTok  = Math.round(inputChars / 4);
  const outTok = Math.round(outputChars / 4);
  const cost   = (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
  const costStr = cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;

  const fmtTok = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtDur = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

  const toolRows = [...toolStats.entries()]
    .sort((a, b) => b[1].calls - a[1].calls)
    .map(([name, s]) => `| ${name} | ${s.calls} | ${s.errors} | ${s.calls > 0 ? fmtDur(Math.round(s.totalMs / s.calls)) : "—"} |`)
    .join("\n");

  const fileRows = [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p, c]) => `- \`${p}\` — ${c} operation${c > 1 ? "s" : ""}`)
    .join("\n");

  const errorRows = errorList.length === 0
    ? "_No errors_"
    : errorList.map((e, i) => `${i + 1}. **${e.toolName}** at ${new Date(e.ts).toLocaleTimeString()} — ${e.message}`).join("\n");

  return `# Claude Code Session Summary

**Session:** \`${sessionId}\`
**Date:** ${new Date(startTs).toLocaleString()}
**Duration:** ${durationStr}

## Overview

- ${preEvents.length} tool call${preEvents.length !== 1 ? "s" : ""} across ${toolStats.size} unique tool${toolStats.size !== 1 ? "s" : ""}
- ${fileCounts.size} file${fileCounts.size !== 1 ? "s" : ""} touched
- ${errorList.length} error${errorList.length !== 1 ? "s" : ""}
- Estimated cost: ${costStr}

## Tool Breakdown

| Tool | Calls | Errors | Avg Duration |
|------|-------|--------|--------------|
${toolRows}

## Files Touched

${fileRows || "_No file operations_"}

## Errors

${errorRows}

## Cost Estimate

~${fmtTok(inTok)} input tokens + ~${fmtTok(outTok)} output tokens ≈ ${costStr}
`;
}
