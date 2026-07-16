"use client";

import type { AgentMeta } from "@/types";

interface AgentStatusCardProps {
  agent: AgentMeta;
  status: "idle" | "active" | "completed";
  taskCount?: number;
}

export default function AgentStatusCard({
  agent,
  status,
  taskCount,
}: AgentStatusCardProps) {
  return (
    <div
      className={`
        relative rounded-lg px-3 py-2.5 border transition-all duration-500
        ${
          status === "active"
            ? "border-neon-indigo/40 bg-neon-indigo/[0.06] glow-indigo animate-pulse-glow"
            : status === "completed"
            ? "border-neon-emerald/20 bg-neon-emerald/[0.03]"
            : "border-border/40 bg-surface/40"
        }
      `}
    >
      <div className="flex items-center gap-2.5">
        {/* Agent icon */}
        <span
          className={`text-lg shrink-0 ${
            status === "active" ? "animate-pulse-active" : ""
          }`}
        >
          {agent.icon}
        </span>

        {/* Agent info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                status === "active"
                  ? "text-foreground"
                  : status === "completed"
                  ? "text-neon-emerald/80"
                  : "text-muted"
              }`}
            >
              {agent.name}
            </span>
          </div>
          <p className="text-[10px] text-dim truncate mt-0.5">
            {agent.description}
          </p>
        </div>

        {/* Status indicator */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${
              status === "active"
                ? "bg-neon-indigo animate-pulse"
                : status === "completed"
                ? "bg-neon-emerald"
                : "bg-dim/40"
            }`}
          />
          {taskCount !== undefined && taskCount > 0 && (
            <span className="text-[9px] text-muted font-mono">{taskCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}
