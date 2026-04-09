"use client";

import { useMemo, useState } from "react";
import type { ClaudeEvent } from "@/lib/types";

interface AgentSkillPanelProps {
  events: ClaudeEvent[];
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-ibm-plex-mono), monospace" };

const SECTION_LABEL: React.CSSProperties = {
  ...MONO, fontSize: 9, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.1em",
};

const AGENT_TYPE_COLOR: Record<string, string> = {
  "general-purpose":           "#61d0ff",
  "Explore":                   "#7cf3c8",
  "Plan":                      "#ffbf69",
  "code-reviewer":             "#a78bfa",
  "superpowers:code-reviewer": "#a78bfa",
};

function agentColor(type: string) {
  return AGENT_TYPE_COLOR[type] ?? "#91a8c7";
}

function shortType(type: string) {
  // "superpowers:code-reviewer" → "code-reviewer"
  const parts = type.split(":");
  return parts[parts.length - 1] ?? type;
}

function shortSkill(skill: string) {
  // "superpowers:brainstorming" → "brainstorming", "paul:apply" → "paul:apply"
  const parts = skill.split(":");
  return parts.length > 2 ? parts.slice(1).join(":") : skill;
}

function SectionHeader({
  title, count, open, onToggle,
}: { title: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", background: "none", border: "none", cursor: "pointer",
        padding: "4px 0", marginBottom: open ? 6 : 0,
      }}
    >
      <span style={SECTION_LABEL}>{title} ({count})</span>
      <span style={{ ...MONO, color: "var(--muted)", fontSize: 10 }}>{open ? "▾" : "▸"}</span>
    </button>
  );
}

export default function AgentSkillPanel({ events }: AgentSkillPanelProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);

  const { agents, skills, topTools } = useMemo(() => {
    const pre = events.filter(e => e.hook_event_name === "PreToolUse") as Array<{
      tool_name: string;
      tool_input: Record<string, unknown>;
      tool_use_id: string;
      timestamp: number;
    }>;
    const postMap = new Map(
      events
        .filter(e => e.hook_event_name === "PostToolUse")
        .map(e => [(e as { tool_use_id: string }).tool_use_id, e as { timestamp: number }])
    );

    const agents: Array<{
      description: string;
      type: string;
      model?: string;
      status: "complete" | "pending";
      durationMs: number | null;
    }> = [];

    const skillMap = new Map<string, { count: number; args?: string }>();
    const toolCount: Record<string, number> = {};

    for (const e of pre) {
      toolCount[e.tool_name] = (toolCount[e.tool_name] ?? 0) + 1;

      if (e.tool_name === "Agent") {
        const post = postMap.get(e.tool_use_id);
        agents.push({
          description: (e.tool_input.description as string) ?? "agent",
          type: (e.tool_input.subagent_type as string) ?? "general-purpose",
          model: e.tool_input.model as string | undefined,
          status: post ? "complete" : "pending",
          durationMs: post ? post.timestamp - e.timestamp : null,
        });
      } else if (e.tool_name === "Skill") {
        const name = (e.tool_input.skill as string) ?? "";
        if (!name) continue;
        const existing = skillMap.get(name);
        const args = e.tool_input.args as string | undefined;
        skillMap.set(name, {
          count: (existing?.count ?? 0) + 1,
          args: existing?.args ?? (args ? String(args).slice(0, 30) : undefined),
        });
      }
    }

    const topTools = Object.entries(toolCount)
      .filter(([name]) => name !== "Agent" && name !== "Skill")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return { agents, skills: Array.from(skillMap.entries()), topTools };
  }, [events]);

  const hasContent = agents.length > 0 || skills.length > 0 || topTools.length > 0;
  if (!hasContent) return null;

  const maxCount = topTools[0]?.[1] ?? 1;

  return (
    <div className="glass" style={{ padding: 14, flexShrink: 0 }}>
      {/* Panel header */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <span style={{
          ...MONO, fontSize: 9, fontWeight: 700, color: "var(--muted)",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          Agents &amp; Skills
        </span>
        <span style={{ ...MONO, color: "var(--muted)", fontSize: 12 }}>
          {panelOpen ? "▾" : "▸"}
        </span>
      </button>

      {panelOpen && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── Subagents ─────────────────────────────────────── */}
          {agents.length > 0 && (
            <div>
              <SectionHeader
                title="Subagents" count={agents.length}
                open={agentsOpen} onToggle={() => setAgentsOpen(o => !o)}
              />
              {agentsOpen && (
                <div style={{
                  display: "flex", flexDirection: "column", gap: 5,
                  maxHeight: 240, overflowY: "auto",
                }}>
                  {agents.map((a, i) => {
                    const color = agentColor(a.type);
                    return (
                      <div key={i} style={{
                        padding: "7px 9px", borderRadius: 10,
                        border: `1px solid ${a.status === "pending" ? "rgba(255,191,105,0.2)" : "rgba(140,194,255,0.1)"}`,
                        background: "rgba(255,255,255,0.02)",
                      }}>
                        {/* Type + status row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{
                            ...MONO, fontSize: 9, fontWeight: 700,
                            padding: "2px 6px", borderRadius: 5,
                            background: `${color}18`, color,
                            border: `1px solid ${color}30`,
                            flexShrink: 0,
                          }}>
                            {shortType(a.type)}
                          </span>
                          <span style={{
                            ...MONO, fontSize: 9,
                            color: a.status === "pending" ? "#ffbf69" : "#7cf3c8",
                          }}>
                            {a.status === "pending" ? "● running" : "✓ done"}
                          </span>
                          {a.durationMs !== null && (
                            <span style={{ ...MONO, fontSize: 9, color: "var(--muted)", marginLeft: "auto" }}>
                              {a.durationMs >= 1000
                                ? `${(a.durationMs / 1000).toFixed(1)}s`
                                : `${a.durationMs}ms`}
                            </span>
                          )}
                        </div>
                        {/* Description */}
                        <div style={{
                          ...MONO, fontSize: 11, color: "var(--text)",
                          lineHeight: 1.4, wordBreak: "break-word",
                        }}>
                          {a.description.slice(0, 60)}{a.description.length > 60 ? "…" : ""}
                        </div>
                        {/* Model badge */}
                        {a.model && (
                          <div style={{ ...MONO, fontSize: 9, color: "rgba(140,194,255,0.4)", marginTop: 3 }}>
                            {a.model}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Skills ────────────────────────────────────────── */}
          {skills.length > 0 && (
            <div>
              <SectionHeader
                title="Skills" count={skills.length}
                open={skillsOpen} onToggle={() => setSkillsOpen(o => !o)}
              />
              {skillsOpen && (
                <div style={{
                  display: "flex", flexDirection: "column", gap: 4,
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {skills.map(([name, { count, args }], i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 7,
                      padding: "5px 8px", borderRadius: 8,
                      border: "1px solid rgba(167,139,250,0.15)",
                      background: "rgba(167,139,250,0.04)",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            ...MONO, fontSize: 11, color: "#a78bfa",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {shortSkill(name)}
                          </span>
                          {count > 1 && (
                            <span style={{
                              ...MONO, fontSize: 9,
                              background: "rgba(167,139,250,0.15)",
                              color: "#a78bfa", borderRadius: 4, padding: "1px 5px",
                              flexShrink: 0,
                            }}>
                              ×{count}
                            </span>
                          )}
                        </div>
                        {args && (
                          <div style={{ ...MONO, fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                            {args}{args.length >= 30 ? "…" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Top Tools ─────────────────────────────────────── */}
          {topTools.length > 0 && (
            <div>
              <SectionHeader
                title="Top Tools" count={topTools.length}
                open={toolsOpen} onToggle={() => setToolsOpen(o => !o)}
              />
              {toolsOpen && (
                <div style={{
                  display: "flex", flexDirection: "column", gap: 5,
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {topTools.map(([name, count]) => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{
                        ...MONO, fontSize: 10, color: "var(--text)",
                        width: 64, flexShrink: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {name}
                      </span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                        <div style={{
                          height: "100%", borderRadius: 2,
                          width: `${Math.round((count / maxCount) * 100)}%`,
                          background: "#61d0ff",
                        }} />
                      </div>
                      <span style={{ ...MONO, fontSize: 10, color: "var(--muted)", width: 24, textAlign: "right" }}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
