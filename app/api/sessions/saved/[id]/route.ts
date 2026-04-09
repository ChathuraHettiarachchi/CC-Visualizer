export const runtime = "nodejs";

import { loadSession, deleteSession } from "@/lib/session-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  try {
    const events = loadSession(id);
    return Response.json({ events });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  try {
    deleteSession(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
