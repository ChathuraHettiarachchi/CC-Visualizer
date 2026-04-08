export default function Header() {
  return (
    <header
      style={{ backgroundColor: "var(--header-bg)", borderBottom: "1px solid var(--border)" }}
      className="flex items-center justify-between px-4 shrink-0"
      aria-label="cc-visualizer header"
    >
      <span
        className="font-mono text-sm font-semibold tracking-tight"
        style={{ color: "var(--foreground)" }}
      >
        cc-visualizer
      </span>
      <div className="flex items-center gap-2 text-xs" style={{ color: "#8b949e" }}>
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: "#3d444d" }}
          aria-hidden="true"
        />
        No sessions
      </div>
    </header>
  );
}
