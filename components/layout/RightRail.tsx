import type { ClaudeEvent } from "@/lib/types";
import type { SelectedNode } from "@/components/canvas/GraphCanvas";
import InspectorPanel from "@/components/panels/InspectorPanel";
import Timeline from "@/components/panels/Timeline";
import HeatmapPanel from "@/components/panels/HeatmapPanel";

interface RightRailProps {
  node: SelectedNode | null;
  events: ClaudeEvent[];
  onClose: () => void;
}

function RailPanel({ eyebrow, children, flex }: { eyebrow: string; children: React.ReactNode; flex?: number }) {
  return (
    <div className="glass" style={{
      padding: 16,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      flex: flex ?? "none",
      minHeight: 0,
    }}>
      <div className="eyebrow" style={{ marginBottom: 10, flexShrink: 0 }}>{eyebrow}</div>
      {children}
    </div>
  );
}

export default function RightRail({ node, events, onClose }: RightRailProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

      {/* Inspector */}
      <RailPanel eyebrow="Inspector" flex={node ? 2 : undefined}>
        {node ? (
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4, flexShrink: 0 }}>
              <button
                onClick={onClose}
                style={{
                  background: "none", border: "none",
                  color: "var(--muted)", cursor: "pointer",
                  fontSize: 16, lineHeight: 1, padding: "2px 4px",
                }}
                aria-label="Close inspector"
              >×</button>
            </div>
            <InspectorPanel node={node} events={events} />
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
            Select a node to inspect
          </div>
        )}
      </RailPanel>

      {/* Timeline */}
      <RailPanel eyebrow="Timeline" flex={1}>
        <Timeline events={events} selectedNode={node} />
      </RailPanel>

      {/* Files */}
      <RailPanel eyebrow="Files" flex={1}>
        <HeatmapPanel events={events} />
      </RailPanel>

    </div>
  );
}
