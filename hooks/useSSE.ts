import { useEffect, useRef, useState } from "react";
import type { ClaudeEvent } from "@/lib/types";

export interface SessionInfo {
  id: string;
  label: string;
  lastSeen: number;
  subagentCount: number;
}

export function useSSE() {
  const sessionMap = useRef(new Map<string, SessionInfo>());
  const eventsBySession = useRef(new Map<string, ClaudeEvent[]>());
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionEvents, setSessionEvents] = useState<Map<string, ClaudeEvent[]>>(new Map());
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
        sessionMap.current.set(session_id, { id: session_id, label, lastSeen: timestamp, subagentCount: 0 });
      } else {
        sessionMap.current.get(session_id)!.lastSeen = timestamp;
      }

      if (!eventsBySession.current.has(session_id)) {
        eventsBySession.current.set(session_id, []);
      }
      eventsBySession.current.get(session_id)!.push(event);

      setSessions(Array.from(sessionMap.current.values()));
      setSessionEvents(new Map(eventsBySession.current));
    };

    return () => es.close();
  }, []);

  return { sessions, connected, sessionEvents };
}
