"use client";

import { useState, useEffect, useCallback } from "react";
import type { SessionMeta } from "@/lib/session-store";

export function useSavedSessions() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/saved");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions: SessionMeta[] };
      setSessions(data.sessions ?? []);
    } catch {
      // network error — ignore silently
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/sessions/saved/${id}`, { method: "DELETE" });
    refresh();
  }, [refresh]);

  return { sessions, refresh, remove };
}
