"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

const TYPE_COLOR: Record<string, string> = {
  toolcall:     "#61d0ff",
  notification: "#ffbf69",
  stop:         "#7cf3c8",
};

function OrbNode({ data, type, selected }: NodeProps) {
  const color = TYPE_COLOR[type ?? "toolcall"] ?? "#61d0ff";
  const isActive = data.status === "pending";
  const label = type === "toolcall"
    ? (data.toolName as string)
    : type === "notification"
    ? "notification"
    : (data.eventType as string) ?? "stop";

  return (
    <div style={{ width: 120, height: 120, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

      {/* Outer pulse ring */}
      <div style={{
        position: "absolute",
        width: 96,
        height: 96,
        borderRadius: "50%",
        border: `1px solid ${color}`,
        opacity: isActive ? undefined : 0.2,
        animation: isActive ? "orbPulse 2.8s ease-in-out infinite" : undefined,
        transition: "opacity 0.3s",
      }} />

      {/* Middle ring */}
      <div style={{
        position: "absolute",
        width: 74,
        height: 74,
        borderRadius: "50%",
        border: `1px solid ${selected ? `${color}88` : "rgba(128,184,255,0.28)"}`,
        boxShadow: selected ? `0 0 22px ${color}30` : "none",
        transition: "all 0.2s",
      }} />

      {/* Core sphere */}
      <div style={{
        position: "absolute",
        width: 54,
        height: 54,
        borderRadius: "50%",
        background: `radial-gradient(circle at 32% 28%, ${color}cc, ${color}44 70%)`,
        boxShadow: `0 0 18px ${color}66, inset 0 1px 0 rgba(255,255,255,0.15)`,
      }} />

      {/* Label below */}
      <div style={{
        position: "absolute",
        top: "100%",
        marginTop: 6,
        left: "50%",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        fontSize: 10,
        color: "var(--muted)",
        maxWidth: 140,
        overflow: "hidden",
        textOverflow: "ellipsis",
        textAlign: "center",
      }}>
        {label}
      </div>
    </div>
  );
}

export default memo(OrbNode);
