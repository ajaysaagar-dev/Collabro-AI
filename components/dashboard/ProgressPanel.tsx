"use client";

import type { PhaseProgress, PipelinePhase, PhaseStatus } from "@/types";

interface ProgressPanelProps {
  phases: PhaseProgress[];
  currentPhase: PipelinePhase;
}

const PHASE_META: Record<
  PipelinePhase,
  { label: string; icon: string }
> = {
  "prompt-analysis": { label: "Prompt Analysis", icon: "🔍" },
  "requirements-validation": { label: "Requirements", icon: "✅" },
  "architecture-design": { label: "Architecture", icon: "🏗️" },
  "content-planning": { label: "Content Plan", icon: "📋" },
  "task-scheduling": { label: "Scheduling", icon: "📅" },
  implementation: { label: "Implementation", icon: "⚙️" },
  testing: { label: "Testing", icon: "🧪" },
  documentation: { label: "Documentation", icon: "📝" },
  deployment: { label: "Deployment", icon: "🚀" },
  completed: { label: "Completed", icon: "🎉" },
};

const STATUS_STYLES: Record<
  PhaseStatus,
  { badge: string; text: string; bg: string }
> = {
  pending: {
    badge: "bg-dim/20 text-dim",
    text: "Pending",
    bg: "bg-dim/10",
  },
  running: {
    badge: "bg-neon-indigo/20 text-neon-indigo",
    text: "Running",
    bg: "bg-neon-indigo",
  },
  completed: {
    badge: "bg-neon-emerald/20 text-neon-emerald",
    text: "Done",
    bg: "bg-neon-emerald",
  },
  failed: {
    badge: "bg-neon-rose/20 text-neon-rose",
    text: "Failed",
    bg: "bg-neon-rose",
  },
};

export default function ProgressPanel({
  phases,
  currentPhase,
}: ProgressPanelProps) {
  const completedCount = phases.filter((p) => p.status === "completed").length;
  const totalPhases = phases.length || 1;
  const overallProgress = Math.round((completedCount / totalPhases) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Overall Progress */}
      <div className="glass rounded-xl p-4 neon-border-indigo">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Pipeline Progress
          </span>
          <span className="text-lg font-bold gradient-text font-mono">
            {overallProgress}%
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-indigo via-neon-cyan to-neon-emerald rounded-full progress-bar-fill transition-all duration-700 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        <p className="text-[11px] text-muted mt-2 font-mono">
          {completedCount}/{totalPhases} phases completed
        </p>
      </div>

      {/* Phase List */}
      <div className="glass rounded-xl overflow-hidden neon-border-indigo">
        <div className="px-4 py-2.5 border-b border-border/40">
          <span className="text-[11px] text-muted font-mono uppercase tracking-wider">
            Phase Breakdown
          </span>
        </div>

        <div className="divide-y divide-border/20">
          {phases.map((phase) => {
            const meta = PHASE_META[phase.phase];
            const statusStyle = STATUS_STYLES[phase.status];
            const isCurrent = phase.phase === currentPhase;
            const isRunning = phase.status === "running";

            return (
              <div
                key={phase.phase}
                className={`
                  flex items-center gap-3 px-4 py-3 transition-all duration-300
                  ${isCurrent ? "bg-neon-indigo/[0.04]" : ""}
                  ${isRunning ? "animate-shimmer" : ""}
                `}
              >
                {/* Phase icon */}
                <span
                  className={`text-sm shrink-0 ${
                    isRunning ? "animate-pulse-active" : ""
                  }`}
                >
                  {meta?.icon || "•"}
                </span>

                {/* Phase info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-medium truncate ${
                        phase.status === "completed"
                          ? "text-neon-emerald"
                          : phase.status === "running"
                          ? "text-foreground"
                          : phase.status === "failed"
                          ? "text-neon-rose"
                          : "text-muted"
                      }`}
                    >
                      {meta?.label || phase.phase}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ${statusStyle.badge}`}
                    >
                      {statusStyle.text}
                    </span>
                  </div>

                  {/* Phase progress bar */}
                  {(phase.status === "running" || phase.status === "completed") && (
                    <div className="mt-1.5 h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          phase.status === "completed"
                            ? "bg-neon-emerald"
                            : "bg-neon-indigo animate-progress-glow"
                        }`}
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Running indicator */}
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-neon-indigo animate-pulse shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
