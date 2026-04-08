"use client";

import { memo } from "react";
import { getBezierPath, type EdgeProps } from "@xyflow/react";

const EDGE_COLOR: Record<string, string> = {
  dispatch: "#61d0ff",
  return:   "#7cf3c8",
  subagent: "#ffbf69",
};

export default memo(function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const edgeKind = (data?.kind as string) ?? "dispatch";
  const isActive = !!(data?.isActive);
  const color = EDGE_COLOR[edgeKind] ?? EDGE_COLOR.dispatch;
  const isDashed = edgeKind === "subagent";

  const [d] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const pathId = `edge-path-${id}`;

  return (
    <g>
      {/* Breathing path */}
      <path
        id={pathId}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={isDashed ? "8 7" : undefined}
        style={{ animation: "edgeBreath 2.4s ease-in-out infinite" }}
        opacity={0.7}
      />
      {/* Particle — only when active */}
      {isActive && (
        <circle r={4} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore — animateMotion is valid SVG but not in React's JSX types */}
          <animateMotion dur="1.7s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}
    </g>
  );
});
