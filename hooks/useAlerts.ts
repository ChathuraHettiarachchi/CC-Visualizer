"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ClaudeEvent } from "@/lib/types";
import { loadAlertConfig, checkThresholds } from "@/lib/alerts";

interface ToastItem {
  id: string;
  message: string;
  type: "warn" | "error";
}

export function useAlerts(events: ClaudeEvent[]) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prevRef = useRef({ cost: 0, errors: 0 });
  const firedRef = useRef(new Set<string>());

  useEffect(() => {
    let inputChars = 0, outputChars = 0, errors = 0;
    for (const e of events) {
      if (e.hook_event_name === "PreToolUse") inputChars += JSON.stringify(e.tool_input ?? {}).length;
      if (e.hook_event_name === "PostToolUse") {
        outputChars += String(e.tool_response ?? "").length;
        const resp = String(e.tool_response ?? "");
        if (/error|exception|failed|traceback/i.test(resp.slice(0, 500))) errors++;
      }
    }
    const cost = (Math.round(inputChars / 4) / 1e6) * 3 + (Math.round(outputChars / 4) / 1e6) * 15;
    const curr = { cost, errors };
    const config = loadAlertConfig();
    const crossed = checkThresholds(prevRef.current, curr, config);

    for (const type of crossed) {
      const key = `${type}-${events[0]?.session_id ?? ""}`;
      if (firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      const message = type === "cost"
        ? `Cost threshold reached: ~$${cost.toFixed(2)}`
        : `Error threshold reached: ${errors} errors in this session`;
      setToasts((prev) => [...prev, { id: `${Date.now()}-${type}`, message, type: type === "errors" ? "error" : "warn" }]);
    }

    prevRef.current = curr;
  }, [events]);

  // Reset fired set when session changes
  const sessionId = events[0]?.session_id;
  useEffect(() => {
    firedRef.current = new Set();
    prevRef.current = { cost: 0, errors: 0 };
  }, [sessionId]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismiss };
}
