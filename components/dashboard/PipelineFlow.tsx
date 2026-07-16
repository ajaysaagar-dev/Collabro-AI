"use client";

import type { PhaseProgress, PipelinePhase } from "@/types";

interface PipelineFlowProps {
  phases: PhaseProgress[];
}

const PHASE_META: Record<PipelinePhase, { label: string; icon: string; short: string }> = {
  "prompt-analysis": { label: "Prompt Analysis", icon: "🔍", short: "Analyze" },
  "requirements-validation": { label: "Requirements", icon: "✅", short: "Validate" },
  "architecture-design": { label: "Architecture", icon: "🏗️", short: "Design" },
  "content-planning": { label: "Content Plan", icon: "📋", short: "Plan" },
  "task-scheduling": { label: "Scheduling", icon: "📅", short: "Schedule" },
  implementation: { label: "Implementation", icon: "⚙️", short: "Build" },
  testing: { label: "Testing", icon: "🧪", short: "Test" },
  documentation: { label: "Docs", icon: "📝", short: "Document" },
  deployment: { label: "Deploy", icon: "🚀", short: "Deploy" },
  completed: { label: "Done", icon: "🎉", short: "Done" },
};

export default function PipelineFlow({ phases }: PipelineFlowProps) {
  // Filter out 'completed' meta-phase for the flow visualization
  const displayPhases = phases.filter((p) => p.phase !== "completed");

  return (
    <div className="w-full overflow-x-auto py-4">
      {/* Horizontal flow on larger screens */}
      <div className="flex items-center justify-center gap-0 min-w-max px-4">
        {displayPhases.map((phase, i) => {
          const meta = PHASE_META[phase.phase];
          const isRunning = phase.status === "running";
          const isCompleted = phase.status === "completed";
          const isFailed = phase.status === "failed";
          const isLast = i === displayPhases.length - 1;

          return (
            <div key={phase.phase} className="flex items-center">
              {/* Phase node */}
              <div
                className={`
                  relative flex flex-col items-center gap-1.5 px-2 group
                  transition-all duration-300
                `}
              >
                {/* Circle node */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    text-sm transition-all duration-500 relative
                    ${
                      isRunning
                        ? "bg-neon-indigo/20 border-2 border-neon-indigo animate-pulse-glow"
                        : isCompleted
                        ? "bg-neon-emerald/15 border-2 border-neon-emerald/50"
                        : isFailed
                        ? "bg-neon-rose/15 border-2 border-neon-rose/50"
                        : "bg-surface-3 border border-border"
                    }
                  `}
                >
                  {isCompleted ? (
                    <span className="text-neon-emerald text-sm">✓</span>
                  ) : (
                    <span className={isRunning ? "animate-pulse-active" : ""}>
                      {meta?.icon || "•"}
                    </span>
                  )}

                  {/* Running ring */}
                  {isRunning && (
                    <span className="absolute inset-0 rounded-full border-2 border-neon-indigo/30 animate-ping" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] font-mono whitespace-nowrap transition-colors ${
                    isRunning
                      ? "text-neon-indigo font-semibold"
                      : isCompleted
                      ? "text-neon-emerald/70"
                      : isFailed
                      ? "text-neon-rose/70"
                      : "text-muted"
                  }`}
                >
                  {meta?.short || phase.phase}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex items-center mx-0.5">
                  <div
                    className={`w-6 h-px transition-colors duration-500 ${
                      isCompleted
                        ? "bg-neon-emerald/40"
                        : isRunning
                        ? "bg-gradient-to-r from-neon-indigo/50 to-dim/20"
                        : "bg-border/40"
                    }`}
                  />
                  <div
                    className={`w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] transition-colors duration-500 ${
                      isCompleted
                        ? "border-l-neon-emerald/40"
                        : "border-l-border/40"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
