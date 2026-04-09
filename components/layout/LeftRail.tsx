"use client";

import { useState } from "react";
import type { SessionInfo } from "@/hooks/useSSE";
import type { ClaudeEvent } from "@/lib/types";
import type { SessionMeta } from "@/lib/session-store";
import AgentSkillPanel from "@/components/panels/AgentSkillPanel";
import WaterfallPanel from "@/components/panels/WaterfallPanel";
import PatternPanel from "@/components/panels/PatternPanel";

interface LeftRailProps {
  sessions: SessionInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  events: ClaudeEvent[];
  sessionEvents: Map<string, ClaudeEvent[]>;
  childSessions: Map<string, string[]>;
  savedSessions: SessionMeta[];
  onLoadSaved: (meta: SessionMeta) => void;
  onDeleteSaved: (id: string) => void;
  activeSavedId: string | null;
  onNodeClick: (nodeId: string) => void;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-ibm-plex-mono), monospace" };

const EYEBROW: React.CSSProperties = {
  ...MONO,
  fontSize: 9,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: 8,
};

function sessionStats(evts: ClaudeEvent[]) {
  const tools = evts.filter(e => e.hook_event_name === "PreToolUse").length;
  const notifications = evts.filter(e => e.hook_event_name === "Notification").length;
  return { total: evts.length, tools, notifications };
}

export default function LeftRail({
  sessions, activeId, onSelect, events, sessionEvents, childSessions,
  savedSessions, onLoadSaved, onDeleteSaved, activeSavedId, onNodeClick,
}: LeftRailProps) {
  const [tab, setTab] = useState<"live" | "history">("live");

  return (
    // Full-height scrollable column
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      overflowY: "auto", height: "100%",
      paddingRight: 2,
    }}>

      {/* ── Sessions ───────────────────────────────────────────── */}
      <div className="glass" style={{ padding: 14, flexShrink: 0 }}>
        <div style={EYEBROW}>Sessions</div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {(["live", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...MONO,
                fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em",
                padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                background: tab === t ? "rgba(97,208,255,0.12)" : "transparent",
                border: `1px solid ${tab === t ? "rgba(97,208,255,0.34)" : "rgba(140,194,255,0.14)"}`,
                color: tab === t ? "var(--accent)" : "var(--muted)",
              }}
            >
              {t === "live" ? `Live (${sessions.length})` : `History (${savedSessions.length})`}
            </button>
          ))}
        </div>

        {/* Live tab */}
        {tab === "live" && (
          sessions.length === 0 ? (
            <div style={{ ...MONO, color: "var(--muted)", fontSize: 12 }}>No sessions yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 260 }}>
              {sessions.map((s) => {
                const isActive = s.id === activeId;
                const evts = sessionEvents.get(s.id) ?? [];
                const { total, tools } = sessionStats(evts);
                const children = childSessions.get(s.id) ?? [];

                return (
                  <div key={s.id}>
                    <button
                      onClick={() => onSelect(s.id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "9px 12px", borderRadius: 12,
                        border: `1px solid ${isActive ? "rgba(97,208,255,0.34)" : "rgba(123,178,255,0.14)"}`,
                        background: isActive ? "rgba(97,208,255,0.08)" : "rgba(255,255,255,0.025)",
                        boxShadow: isActive ? "0 0 0 1px rgba(97,208,255,0.15)" : "none",
                        cursor: "pointer", color: "var(--text)", transition: "all 0.15s",
                      }}
                    >
                      {/* Label row */}
                      <div style={{ ...MONO, fontSize: 12, marginBottom: total > 0 ? 5 : 0 }}>
                        {s.label}
                      </div>
                      {/* Stats row */}
                      {total > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Chip value={total} label="events" color="rgba(140,194,255,0.5)" />
                          {tools > 0 && <Chip value={tools} label="tools" color="rgba(124,243,200,0.5)" />}
                          {s.subagentCount > 0 && (
                            <Chip value={s.subagentCount} label="agents" color="rgba(167,139,250,0.5)" />
                          )}
                        </div>
                      )}
                    </button>

                    {/* Child subagent buttons */}
                    {children.map((childId, idx) => {
                      const isChildActive = childId === activeId;
                      return (
                        <button
                          key={childId}
                          onClick={() => onSelect(childId)}
                          style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "6px 12px 6px 20px", borderRadius: 10, marginTop: 3,
                            border: `1px solid ${isChildActive ? "rgba(167,139,250,0.34)" : "rgba(123,178,255,0.10)"}`,
                            background: isChildActive ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.015)",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                        >
                          <div style={{ ...MONO, fontSize: 11, color: "var(--muted)" }}>
                            ↳ Subagent {idx + 1}
                          </div>
                          <div style={{ ...MONO, fontSize: 9, color: "rgba(140,194,255,0.35)", marginTop: 2 }}>
                            {childId.slice(0, 12)}…
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* History tab */}
        {tab === "history" && (
          savedSessions.length === 0 ? (
            <div style={{ ...MONO, color: "var(--muted)", fontSize: 12 }}>No saved sessions yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", maxHeight: 260 }}>
              {savedSessions.map((s) => {
                const isActive = s.id === activeSavedId;
                const date = new Date(s.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <div
                    key={s.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 10px", borderRadius: 12,
                      border: `1px solid ${isActive ? "rgba(167,139,250,0.34)" : "rgba(123,178,255,0.14)"}`,
                      background: isActive ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.025)",
                      cursor: "pointer",
                    }}
                    onClick={() => onLoadSaved(s)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...MONO, fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.id.slice(0, 16)}…
                      </div>
                      <div style={{ ...MONO, fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                        {date} · {s.eventCount} events
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSaved(s.id); }}
                      title="Delete session"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--muted)", fontSize: 13, padding: "2px 4px", flexShrink: 0,
                      }}
                    >×</button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Agents & Skills ────────────────────────────────────── */}
      <AgentSkillPanel events={events} />

      {/* ── Waterfall ──────────────────────────────────────────── */}
      {events.some(e => e.hook_event_name === "PreToolUse") && (
        <div className="glass" style={{ padding: 14, flexShrink: 0 }}>
          <div style={EYEBROW}>Waterfall</div>
          <div style={{ marginTop: 8 }}>
            <WaterfallPanel events={events} />
          </div>
        </div>
      )}

      {/* ── Patterns ───────────────────────────────────────────── */}
      {events.some(e => e.hook_event_name === "PreToolUse") && (
        <div className="glass" style={{ padding: 14, flexShrink: 0 }}>
          <div style={EYEBROW}>Patterns</div>
          <div style={{ marginTop: 8 }}>
            <PatternPanel events={events} onNodeClick={onNodeClick} />
          </div>
        </div>
      )}

    </div>
  );
}

function Chip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <span style={{
      fontFamily: "var(--font-ibm-plex-mono), monospace",
      fontSize: 9, color: color,
      background: `${color.replace("0.5)", "0.08)")}`,
      border: `1px solid ${color.replace("0.5)", "0.18)")}`,
      borderRadius: 5, padding: "1px 5px", whiteSpace: "nowrap",
    }}>
      {value} {label}
    </span>
  );
}
