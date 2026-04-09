"use client";

import { useMemo, useState } from "react";
import type { ClaudeEvent } from "@/lib/types";

interface AgentSkillPanelProps {
  events: ClaudeEvent[];
}

const AGENT_TYPE_COLOR: Record<string, string> = {
  "general-purpose": "#61d0ff",
  "Explore":          "#7cf3c8",
  "Plan":             "#ffbf69",
  "code-reviewer":    "#a78bfa",
  "android-code-reviewer": "#a78bfa",
  "superpowers:code-reviewer": "#a78bfa",
};

function agentTypeColor(t: string): string {
  return AGENT_TYPE_COLOR[t] ?? "#91a8c7";
}

function shortSkill(skill: string): string {
  // "superpowers:brainstorming" → "brainstorming"
  // "paul:apply" → "paul:apply"
  const parts = skill.split(":");
  return parts.length > 2 ? parts.slice(1).join(":") : skill;
}

export default function AgentSkillPanel({ events }: AgentSkillPanelProps) {
  const [open, setOpen] = useState(true);

  const { agents, skills, topTools } = useMemo(() => {
    const pre = events.filter(e => e.hook_event_name === "PreToolUse") as Array<{
      tool_name: string;
      tool_input: Record<string, unknown>;
      tool_use_id: string;
    }>;
    const postIds = new Set(
      events
        .filter(e => e.hook_event_name === "PostToolUse")
        .map(e => (e as { tool_use_id: string }).tool_use_id)
    );

    const agents: Array<{ description: string; type: string; status: "complete" | "pending" }> = [];
    const skills: string[] = [];
    const toolCount: Record<string, number> = {};

    for (const e of pre) {
      toolCount[e.tool_name] = (toolCount[e.tool_name] ?? 0) + 1;

      if (e.tool_name === "Agent") {
        agents.push({
          description: (e.tool_input.description as string) ?? (e.tool_input.subagent_type as string) ?? "agent",
          type: (e.tool_input.subagent_type as string) ?? "general-purpose",
          status: postIds.has(e.tool_use_id) ? "complete" : "pending",
        });
      } else if (e.tool_name === "Skill") {
        const name = (e.tool_input.skill as string) ?? "";
        if (name && !skills.includes(name)) skills.push(name);
      }
    }

    const topTools = Object.entries(toolCount)
      .filter(([name]) => name !== "Agent" && name !== "Skill")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return { agents, skills, topTools };
  }, [events]);

  const hasContent = agents.length > 0 || skills.length > 0 || topTools.length > 0;
  if (!hasContent) return null;

  const maxCount = topTools[0]?.[1] ?? 1;

  return (
    <div className="glass" style={{ padding: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <span className="eyebrow">Agents & Skills</span>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Subagents */}
          {agents.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: 6,
              }}>
                Subagents ({agents.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {agents.map((a, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 7,
                    padding: "6px 8px", borderRadius: 10,
                    border: "1px solid rgba(140,194,255,0.1)",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    <span style={{
                      marginTop: 1, fontSize: 9, fontWeight: 700, padding: "2px 6px",
                      borderRadius: 6, background: `${agentTypeColor(a.type)}18`,
                      color: agentTypeColor(a.type), whiteSpace: "nowrap",
                      fontFamily: "var(--font-ibm-plex-mono), monospace", flexShrink: 0,
                    }}>
                      {a.type.split(":").pop()?.split("-")[0] ?? a.type}
                    </span>
                    <span style={{
                      fontSize: 11, color: a.status === "pending" ? "#ffbf69" : "var(--text)",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      lineHeight: 1.4, minWidth: 0, wordBreak: "break-word",
                    }}>
                      {a.description.slice(0, 40)}{a.description.length > 40 ? "…" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: 6,
              }}>
                Skills ({skills.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {skills.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 8,
                    background: "rgba(167,139,250,0.12)",
                    border: "1px solid rgba(167,139,250,0.25)",
                    color: "#a78bfa",
                    fontFamily: "var(--font-ibm-plex-mono), monospace",
                  }}>
                    {shortSkill(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top tools */}
          {topTools.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: 6,
              }}>
                Top Tools
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {topTools.map(([name, count]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{
                      fontSize: 10, color: "var(--text)",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      width: 68, flexShrink: 0, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {name}
                    </span>
                    <div style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: "rgba(255,255,255,0.06)",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${Math.round((count / maxCount) * 100)}%`,
                        background: "#61d0ff",
                      }} />
                    </div>
                    <span style={{
                      fontSize: 10, color: "var(--muted)",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      width: 22, textAlign: "right",
                    }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
