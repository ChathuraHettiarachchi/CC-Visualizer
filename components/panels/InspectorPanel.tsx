import type { ClaudeEvent } from "@/lib/types";
import type { SelectedNode } from "@/components/canvas/GraphCanvas";
import NodeDetail from "./NodeDetail";

interface InspectorPanelProps {
  node: SelectedNode;
  events: ClaudeEvent[];
}

export default function InspectorPanel({ node, events: _events }: InspectorPanelProps) {
  return (
    <div>
      <NodeDetail node={node} />
    </div>
  );
}
