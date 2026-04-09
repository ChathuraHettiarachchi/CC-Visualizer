interface TopbarProps {
  connected: boolean;
}

export default function Topbar({ connected }: TopbarProps) {
  return (
    <div className="glass" style={{
      gridColumn: "1 / -1", /* spans all 3 grid columns */
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 20px",
      borderRadius: 16,
    }}>
      <span style={{
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        fontSize: 14,
        fontWeight: 700,
        color: "var(--text)",
        letterSpacing: "0.04em",
      }}>
        cc-visualizer
      </span>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${connected ? "rgba(124,243,200,0.22)" : "rgba(140,194,255,0.12)"}`,
        background: connected ? "rgba(124,243,200,0.06)" : "rgba(255,255,255,0.03)",
      }}>
        <div
          className={connected ? "live-dot" : undefined}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected ? "#f87171" : "var(--muted)",
            boxShadow: connected ? "0 0 8px #f87171" : "none",
          }}
        />
        <span style={{
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: 11,
          color: connected ? "#f87171" : "var(--muted)",
        }}>
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
