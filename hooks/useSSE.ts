import { useEffect, useRef, useState } from "react";
import type { ClaudeEvent } from "@/lib/types";

export interface SessionInfo {
  id: string;
  label: string;
  lastSeen: number;
}

export function useSSE() {
  const sessionMap = useRef(new Map<string, SessionInfo>());
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      const event: ClaudeEvent = JSON.parse(e.data as string);
      const { session_id, timestamp } = event;

      if (!sessionMap.current.has(session_id)) {
        const label = `Session ${sessionMap.current.size + 1}`;
        sessionMap.current.set(session_id, { id: session_id, label, lastSeen: timestamp });
      } else {
        sessionMap.current.get(session_id)!.lastSeen = timestamp;
      }

      setSessions(Array.from(sessionMap.current.values()));
    };

    return () => es.close();
  }, []);

  return { sessions, connected };
}
