export const runtime = "nodejs";

import { pushEvent } from "@/lib/event-store";
import type { ClaudeEvent } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.session_id !== "string" || typeof body.hook_event_name !== "string") {
    return Response.json(
      { error: "Missing required fields: session_id, hook_event_name" },
      { status: 400 }
    );
  }

  const event = {
    ...body,
    timestamp: Date.now(),
  } as ClaudeEvent;

  pushEvent(event);

  return Response.json({ ok: true });
}
