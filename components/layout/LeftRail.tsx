import type { SessionInfo } from "@/hooks/useSSE";
import type { ClaudeEvent } from "@/lib/types";
import AgentSkillPanel from "@/components/panels/AgentSkillPanel";

interface LeftRailProps {
  sessions: SessionInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  events: ClaudeEvent[];
  childSessions: Map<string, string[]>;
}

function statValue(events: ClaudeEvent[], key: string): number | string {
  if (key === "events") return events.length;
  if (key === "toolCalls") return events.filter(e => e.hook_event_name === "PreToolUse").length;
  if (key === "activeTool") {
    const pending = events.filter(e => e.hook_event_name === "PreToolUse");
    const completed = new Set(
      events.filter(e => e.hook_event_name === "PostToolUse").map(e => (e as { tool_use_id: string }).tool_use_id)
    );
    const active = pending.find(e => !completed.has((e as { tool_use_id: string }).tool_use_id));
    return active ? (active as { tool_name: string }).tool_name : "—";
  }
  return 0;
}

export default function LeftRail({ sessions, activeId, onSelect, events, childSessions }: LeftRailProps) {
  const metrics = [
    { label: "Events",     value: statValue(events, "events") },
    { label: "Tool Calls", value: statValue(events, "toolCalls") },
    { label: "Active",     value: statValue(events, "activeTool") },
    { label: "Sessions",   value: sessions.length || "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

      {/* Sessions panel */}
      <div className="glass" style={{ padding: 16, overflow: "hidden" }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Sessions</div>
        {sessions.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
            No sessions yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.map((s) => {
              const isActive = s.id === activeId;
              const children = childSessions.get(s.id) ?? [];
              return (
                <div key={s.id}>
                  <button
                    onClick={() => onSelect(s.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: `1px solid ${isActive ? "rgba(97,208,255,0.34)" : "rgba(123,178,255,0.14)"}`,
                      background: isActive ? "rgba(97,208,255,0.08)" : "rgba(255,255,255,0.025)",
                      boxShadow: isActive ? "0 0 0 1px rgba(97,208,255,0.15)" : "none",
                      cursor: "pointer",
                      color: "var(--text)",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      fontSize: 12,
                      transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                  {children.map(childId => {
                    const isChildActive = childId === activeId;
                    return (
                      <button
                        key={childId}
                        onClick={() => onSelect(childId)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "7px 12px 7px 24px", borderRadius: 14, marginTop: 4,
                          border: `1px solid ${isChildActive ? "rgba(167,139,250,0.34)" : "rgba(123,178,255,0.10)"}`,
                          background: isChildActive ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.015)",
                          cursor: "pointer", color: "var(--muted)",
                          fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11,
                          transition: "all 0.15s",
                        }}
                      >
                        ↳ subagent
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agents & Skills panel */}
      <AgentSkillPanel events={events} />

      {/* Stats panel */}
      <div className="glass" style={{ padding: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Stats</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {metrics.map(({ label, value }) => (
            <div key={label} style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.03)",
            }}>
              <div style={{
                fontSize: typeof value === "string" && value.length > 4 ? 14 : 22,
                fontWeight: 700,
                color: "var(--text)",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                lineHeight: 1.1,
                marginBottom: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {value}
              </div>
              <div style={{
                fontSize: 10,
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
