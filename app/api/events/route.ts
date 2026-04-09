export const runtime = "nodejs";

import { eventBus, events } from "@/lib/event-store";
import type { ClaudeEvent } from "@/lib/types";

export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Replay buffered events immediately on connect
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      // Then stream live events
      const listener = (event: ClaudeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Controller closed — client disconnected
        }
      };

      eventBus.on("event", listener);

      // Keepalive ping every 15s — prevents browser from dropping the connection
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 15_000);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        eventBus.off("event", listener);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
