"use client";

import type { PipelineEvent, PipelineEventType, AgentRole } from "@/types";

interface TerminalLineProps {
  event: PipelineEvent;
  index: number;
}

const AGENT_COLORS: Record<AgentRole, string> = {
  manager: "text-neon-violet",
  "prompt-analyzer": "text-neon-cyan",
  "requirements-validator": "text-neon-emerald",
  architect: "text-neon-blue",
  "content-planner": "text-neon-amber",
  scheduler: "text-orange-400",
  "frontend-dev": "text-neon-rose",
  "backend-dev": "text-neon-indigo",
  "database-dev": "text-teal-400",
  tester: "text-yellow-300",
  documenter: "text-pink-400",
  deployer: "text-green-400",
};

const AGENT_ICONS: Record<AgentRole, string> = {
  manager: "🎯",
  "prompt-analyzer": "🔍",
  "requirements-validator": "✅",
  architect: "🏗️",
  "content-planner": "📋",
  scheduler: "📅",
  "frontend-dev": "🎨",
  "backend-dev": "⚙️",
  "database-dev": "🗄️",
  tester: "🧪",
  documenter: "📝",
  deployer: "🚀",
};

const EVENT_PREFIXES: Partial<Record<PipelineEventType, { icon: string; color: string }>> = {
  "phase-start": { icon: "▶", color: "text-neon-cyan" },
  "phase-complete": { icon: "✔", color: "text-neon-emerald" },
  "phase-error": { icon: "✖", color: "text-neon-rose" },
  "agent-start": { icon: "→", color: "text-neon-indigo" },
  "agent-output": { icon: "│", color: "text-dim" },
  "agent-complete": { icon: "✔", color: "text-neon-emerald" },
  "agent-error": { icon: "✖", color: "text-neon-rose" },
  "task-assigned": { icon: "◆", color: "text-neon-amber" },
  "task-complete": { icon: "◇", color: "text-neon-emerald" },
  "progress-update": { icon: "◌", color: "text-muted" },
  "file-generated": { icon: "📄", color: "text-neon-amber" },
  log: { icon: "·", color: "text-dim" },
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TerminalLine({ event, index }: TerminalLineProps) {
  const agentColor = AGENT_COLORS[event.agent] ?? "text-muted";
  const agentIcon = AGENT_ICONS[event.agent] ?? "•";
  const eventMeta = EVENT_PREFIXES[event.type];
  const evIcon = eventMeta?.icon ?? "·";
  const evColor = eventMeta?.color ?? "text-dim";

  const isPhaseEvent = event.type === "phase-start" || event.type === "phase-complete";
  const isError = event.type === "phase-error" || event.type === "agent-error";
  const isFileGen = event.type === "file-generated";
  const isLog = event.type === "log" || event.type === "progress-update";

  const filePath = isFileGen && event.data ? String(event.data["path"] ?? "") : "";

  return (
    <div
      className={`terminal-line flex items-start gap-2 px-4 py-1 font-mono text-[13px] leading-relaxed
        hover:bg-white/[0.02] transition-colors group
        ${isPhaseEvent ? "border-l-2 border-neon-cyan/30 pl-3 py-2 my-1" : ""}
        ${isError ? "border-l-2 border-neon-rose/40 pl-3 bg-neon-rose/[0.03]" : ""}
      `}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      {/* Timestamp */}
      <span className="text-dim/60 text-[11px] shrink-0 mt-0.5 select-none font-mono tabular-nums">
        {formatTimestamp(event.timestamp)}
      </span>

      {/* Event type icon */}
      <span className={`${evColor} shrink-0 text-[11px] mt-0.5 select-none w-4 text-center`}>
        {evIcon}
      </span>

      {/* Agent icon + name */}
      <span className="shrink-0 select-none text-sm" title={event.agent as string}>
        {agentIcon as string}
      </span>
      <span className={`${agentColor as string} shrink-0 font-semibold text-[11px] uppercase tracking-wider mt-0.5 min-w-[80px]`}>
        {event.agent.replace(/-/g, " ").replace("dev", "").trim().slice(0, 10)}
      </span>

      {/* Message */}
      <span
        className={`
          flex-1 break-words
          ${isPhaseEvent ? "text-foreground font-semibold" : ""}
          ${isError ? "text-neon-rose" : ""}
          ${isFileGen ? "text-neon-amber" : ""}
          ${isLog ? "text-muted" : "text-foreground/80"}
        `}
      >
        {event.message}
      </span>

      {/* File path if file-generated */}
      {filePath && (
        <span className="text-[11px] text-neon-amber/60 font-mono shrink-0 mt-0.5">
          {filePath}
        </span>
      )}
    </div>
  );
}

