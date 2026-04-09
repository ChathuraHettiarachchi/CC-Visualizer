import type { SessionInfo } from "@/hooks/useSSE";
import type { ClaudeEvent } from "@/lib/types";
import AgentSkillPanel from "@/components/panels/AgentSkillPanel";

interface LeftRailProps {
  sessions: SessionInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  events: ClaudeEvent[];
  sessionEvents: Map<string, ClaudeEvent[]>;
  childSessions: Map<string, string[]>;
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
}: LeftRailProps) {
  // Estimate token usage from raw event payload sizes (4 chars ≈ 1 token)
  const { estInputTokens, estOutputTokens, estCostUsd } = (() => {
    let inputChars = 0, outputChars = 0;
    for (const e of events) {
      if (e.hook_event_name === "PreToolUse") {
        inputChars += JSON.stringify((e as { tool_input: unknown }).tool_input ?? {}).length;
      } else if (e.hook_event_name === "PostToolUse") {
        outputChars += String((e as { tool_response: unknown }).tool_response ?? "").length;
      }
    }
    const inTok  = Math.round(inputChars  / 4);
    const outTok = Math.round(outputChars / 4);
    // Sonnet 4.x pricing: $3/M input, $15/M output
    const cost   = (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
    return { estInputTokens: inTok, estOutputTokens: outTok, estCostUsd: cost };
  })();

  function fmtTok(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  const globalStats = [
    { label: "Events",   value: events.length },
    { label: "Tools",    value: events.filter(e => e.hook_event_name === "PreToolUse").length },
    { label: "Sessions", value: sessions.length || "—" },
    {
      label: "Active",
      value: (() => {
        const pending = events.filter(e => e.hook_event_name === "PreToolUse");
        const done = new Set(
          events.filter(e => e.hook_event_name === "PostToolUse")
            .map(e => (e as { tool_use_id: string }).tool_use_id)
        );
        const active = pending.find(e => !done.has((e as { tool_use_id: string }).tool_use_id));
        return active ? (active as { tool_name: string }).tool_name : "—";
      })(),
    },
    { label: "~In tok",  value: fmtTok(estInputTokens) },
    { label: "~Out tok", value: fmtTok(estOutputTokens) },
    { label: "~Cost",    value: estCostUsd < 0.01 ? "<$0.01" : `$${estCostUsd.toFixed(2)}` },
  ];

  return (
    // Full-height scrollable column
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      overflowY: "auto", height: "100%",
      paddingRight: 2,
    }}>

      {/* ── Sessions ───────────────────────────────────────────── */}
      <div className="glass" style={{ padding: 14, flexShrink: 0 }}>
        <div style={EYEBROW}>Sessions ({sessions.length})</div>

        {sessions.length === 0 ? (
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
        )}
      </div>

      {/* ── Agents & Skills ────────────────────────────────────── */}
      <AgentSkillPanel events={events} />

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="glass" style={{ padding: 14, flexShrink: 0 }}>
        <div style={EYEBROW}>Stats</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {globalStats.map(({ label, value }) => (
            <div key={label} style={{
              padding: 10, borderRadius: 12,
              border: "1px solid var(--line)", background: "rgba(255,255,255,0.03)",
            }}>
              <div style={{
                ...MONO,
                fontSize: typeof value === "string" && value.length > 4 ? 13 : 20,
                fontWeight: 700, color: "var(--text)", lineHeight: 1.1,
                marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {value}
              </div>
              <div style={{
                ...MONO, fontSize: 9, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: "0.08em",
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
