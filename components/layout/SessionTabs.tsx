"use client";

export interface Session {
  id: string;
  label: string;
}

interface SessionTabsProps {
  sessions: Session[];
  activeId: string;
  onSelect?: (id: string) => void;
}

export default function SessionTabs({ sessions, activeId, onSelect }: SessionTabsProps) {
  return (
    <div
      className="flex items-end overflow-x-auto shrink-0"
      style={{
        backgroundColor: "var(--background)",
        borderBottom: "1px solid var(--border)",
        height: "41px",
      }}
      role="tablist"
      aria-label="Agent sessions"
    >
      {sessions.map((session) => {
        const isActive = session.id === activeId;
        return (
          <button
            key={session.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect?.(session.id)}
            className="px-4 h-full text-xs font-mono whitespace-nowrap transition-colors"
            style={{
              color: isActive ? "var(--accent)" : "#8b949e",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            {session.label}
          </button>
        );
      })}
    </div>
  );
}
