"use client";

import { useEffect, useRef, useState } from "react";
import type { ClaudeEvent, PreToolUseEvent } from "@/lib/types";

export interface SessionInfo {
  id: string;
  label: string;
  lastSeen: number;
  subagentCount: number;
}

interface PendingSubagent {
  parentSessionId: string;
  toolUseId: string;
  timestamp: number;
}

export function useSSE() {
  const sessionMap      = useRef(new Map<string, SessionInfo>());
  const eventsBySession = useRef(new Map<string, ClaudeEvent[]>());
  const parentMap       = useRef(new Map<string, string>()); // subId → parentId
  const pending         = useRef<PendingSubagent | null>(null);

  const [sessions, setSessions]           = useState<SessionInfo[]>([]);
  const [sessionEvents, setSessionEvents] = useState<Map<string, ClaudeEvent[]>>(new Map());
  const [connected, setConnected]         = useState(false);
  const [childSessions, setChildSessions] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onopen  = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      const event: ClaudeEvent = JSON.parse(e.data as string);
      const { session_id, timestamp } = event;

      // ── 1. Track Agent tool dispatch (may spawn subagent) ─────────────
      if (
        event.hook_event_name === "PreToolUse" &&
        (event as PreToolUseEvent).tool_name === "Agent"
      ) {
        pending.current = {
          parentSessionId: session_id,
          toolUseId: (event as PreToolUseEvent).tool_use_id,
          timestamp,
        };
      }

      // ── 2. New session — check if it's a subagent ────────────────────
      // Note: pending is only consumed when a genuinely new session_id appears
      // within 5s. Already-known sessions skip this block entirely, keeping
      // pending alive for the actual subagent session that follows.
      const isKnownSession =
        sessionMap.current.has(session_id) ||
        parentMap.current.has(session_id);

      if (!isKnownSession && pending.current) {
        const delta = timestamp - pending.current.timestamp;
        if (delta >= 0 && delta < 5000) {
          const parentId = pending.current.parentSessionId;
          parentMap.current.set(session_id, parentId);
          // Replace entry to make the mutation visible to consumers using object identity
          const parentInfo = sessionMap.current.get(parentId);
          if (parentInfo) {
            sessionMap.current.set(parentId, { ...parentInfo, subagentCount: parentInfo.subagentCount + 1 });
          }
          pending.current = null;
        }
      }

      // ── 3. Clear stale pending (> 5s) ────────────────────────────────
      if (pending.current && timestamp - pending.current.timestamp > 5000) {
        pending.current = null;
      }

      // ── 4. Route event to the correct session ────────────────────────
      const targetId = parentMap.current.get(session_id) ?? session_id;

      // Register top-level session (subagents get routed to parent — no own entry)
      if (!sessionMap.current.has(targetId) && targetId === session_id) {
        const label = `Session ${sessionMap.current.size + 1}`;
        sessionMap.current.set(targetId, {
          id: targetId,
          label,
          lastSeen: timestamp,
          subagentCount: 0,
        });
      } else if (sessionMap.current.has(targetId)) {
        sessionMap.current.get(targetId)!.lastSeen = timestamp;
      }

      // Append to target session's event list (new array reference so downstream useMemos recompute)
      const existing = eventsBySession.current.get(targetId) ?? [];
      eventsBySession.current.set(targetId, [...existing, event]);

      // Rebuild child session map
      const childMap = new Map<string, string[]>();
      parentMap.current.forEach((parentId, childId) => {
        if (!childMap.has(parentId)) childMap.set(parentId, []);
        childMap.get(parentId)!.push(childId);
      });

      // Trigger re-render
      setSessions(Array.from(sessionMap.current.values()));
      setSessionEvents(new Map(eventsBySession.current));
      setChildSessions(new Map(childMap));
    };

    return () => es.close();
  }, []);

  return { sessions, connected, sessionEvents, childSessions };
}
