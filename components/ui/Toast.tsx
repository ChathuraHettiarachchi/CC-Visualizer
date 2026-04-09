"use client";

import { useEffect } from "react";

const MONO = "'IBM Plex Mono', monospace";

interface ToastProps {
  id: string;
  message: string;
  type: "warn" | "error";
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  const color = type === "error" ? "#f87171" : "#ffbf69";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      background: "rgba(7,17,31,0.95)", backdropFilter: "blur(16px)",
      border: `1px solid ${color}44`,
      borderRadius: 12, marginBottom: 8,
      fontFamily: MONO, fontSize: 11, color,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      minWidth: 240,
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: 14, padding: 0 }}
      >×</button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: "warn" | "error" }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 300 }}>
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
