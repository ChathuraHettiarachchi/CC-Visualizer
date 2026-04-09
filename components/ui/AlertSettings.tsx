"use client";

import { useState, useEffect } from "react";
import { loadAlertConfig, saveAlertConfig } from "@/lib/alerts";

const MONO = "'IBM Plex Mono', monospace";

interface AlertSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function AlertSettings({ open, onClose }: AlertSettingsProps) {
  const [cost, setCost] = useState(0.5);
  const [errors, setErrors] = useState(5);

  useEffect(() => {
    if (open) {
      const cfg = loadAlertConfig();
      setCost(cfg.costThresholdUsd);
      setErrors(cfg.errorCountThreshold);
    }
  }, [open]);

  if (!open) return null;

  function save() {
    saveAlertConfig({ costThresholdUsd: cost, errorCountThreshold: errors });
    onClose();
  }

  return (
    <div
      style={{
        position: "absolute", top: "100%", right: 0, marginTop: 8, zIndex: 100,
        background: "rgba(7,17,31,0.97)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(140,194,255,0.18)", borderRadius: 14,
        padding: "14px 16px", minWidth: 220,
        fontFamily: MONO, fontSize: 11,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ color: "var(--muted)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
        Alert thresholds
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ color: "#edf5ff", marginBottom: 4 }}>Cost alert ($)</div>
        <input
          type="number" min={0} step={0.1} value={cost}
          onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(140,194,255,0.18)", borderRadius: 8,
            color: "#edf5ff", fontFamily: MONO, fontSize: 11,
            padding: "5px 8px", boxSizing: "border-box",
          }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 14 }}>
        <div style={{ color: "#edf5ff", marginBottom: 4 }}>Error alert (count)</div>
        <input
          type="number" min={1} step={1} value={errors}
          onChange={(e) => setErrors(parseInt(e.target.value) || 1)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(140,194,255,0.18)", borderRadius: 8,
            color: "#edf5ff", fontFamily: MONO, fontSize: 11,
            padding: "5px 8px", boxSizing: "border-box",
          }}
        />
      </label>

      <button
        onClick={save}
        style={{
          width: "100%", padding: "6px 0",
          background: "rgba(97,208,255,0.12)", border: "1px solid rgba(97,208,255,0.3)",
          borderRadius: 8, color: "#61d0ff", fontFamily: MONO, fontSize: 11, cursor: "pointer",
        }}
      >
        Save
      </button>
    </div>
  );
}
