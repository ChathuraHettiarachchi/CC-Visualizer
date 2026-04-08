interface TopbarProps {
  connected: boolean;
}

export default function Topbar({ connected }: TopbarProps) {
  return (
    <div className="glass" style={{
      gridColumn: "1 / 4",
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
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: connected ? "var(--accent-2)" : "var(--muted)",
          boxShadow: connected ? "0 0 10px var(--accent-2)" : "none",
        }} />
        <span style={{
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: 11,
          color: connected ? "var(--accent-2)" : "var(--muted)",
        }}>
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
