export const runtime = "nodejs";

import { readFileSync } from "fs";
import { pushEvent } from "@/lib/event-store";
import type { ClaudeEvent } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { filePath } = body as { filePath?: string };

  if (!filePath || typeof filePath !== "string") {
    return Response.json({ error: "filePath required" }, { status: 400 });
  }

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return Response.json({ error: "Could not read file" }, { status: 400 });
  }

  const lines = content.split("\n").filter((l) => l.trim() !== "");
  let pushed = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed.session_id === "string" && typeof parsed.hook_event_name === "string") {
        if (!parsed.timestamp) parsed.timestamp = Date.now();
        pushEvent(parsed as ClaudeEvent);
        pushed++;
      }
    } catch {
      // skip invalid JSON lines
    }
  }

  return Response.json({ ok: true, pushed });
}
