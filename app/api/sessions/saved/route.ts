export const runtime = "nodejs";

import { listSessions } from "@/lib/session-store";

export async function GET(): Promise<Response> {
  const sessions = listSessions();
  return Response.json({ sessions });
}
