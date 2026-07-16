"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGENT_REGISTRY } from "@/types";
import type { PhaseProgress, PipelinePhase, ModelChoice } from "@/types";
import PromptInput from "@/components/ui/PromptInput";
import PipelineFlow from "@/components/dashboard/PipelineFlow";

const PIPELINE_PHASES: PipelinePhase[] = [
  "prompt-analysis",
  "requirements-validation",
  "architecture-design",
  "content-planning",
  "task-scheduling",
  "implementation",
  "testing",
  "documentation",
  "deployment",
];

const defaultPhases: PhaseProgress[] = PIPELINE_PHASES.map((phase) => ({
  phase,
  status: "pending",
  progress: 0,
}));

const agents = Object.values(AGENT_REGISTRY);

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelChoice>("llama-3.3-70b");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (prompt: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create project (${res.status})`);
      }

      const data = await res.json();
      router.push(`/project/${data.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      {/* Radial gradient overlays */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.06)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.04)_0%,transparent_70%)]" />
      </div>

      {/* Floating particles */}
      <div className="particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center pt-20 pb-12 px-4 sm:px-6">
          {/* Logo / Brand */}
          <div className="flex flex-col items-center gap-6 mb-12 animate-fade-in">
            {/* Logo mark */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-indigo via-neon-violet to-neon-cyan flex items-center justify-center text-2xl font-black text-white shadow-[0_0_40px_rgba(129,140,248,0.3)]">
                C
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-neon-indigo via-neon-violet to-neon-cyan opacity-20 blur-xl" />
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
                <span className="gradient-text">COLLABRO</span>
              </h1>
              <p className="mt-3 text-lg sm:text-xl text-muted font-light tracking-wide">
                Your Autonomous AI Software Engineering Team
              </p>
            </div>

            {/* Description */}
            <p className="max-w-2xl text-center text-sm sm:text-base text-dim leading-relaxed text-balance">
              Describe your project in plain English. Watch 12 specialized AI agents
              analyze requirements, design architecture, write code, run tests,
              generate documentation, and prepare deployment — all in real time.
            </p>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-2.5 mb-5 bg-surface/50 backdrop-blur-md border border-border/40 rounded-full px-4 py-2 text-xs text-foreground font-mono animate-fade-in">
            <span className="text-muted">Primary LLM Engine:</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelChoice)}
              className="bg-transparent text-neon-indigo font-bold outline-none cursor-pointer border-none p-0 focus:ring-0 select-none"
            >
              <option value="llama-3.3-70b" className="bg-[#0a0a0a] text-foreground">Llama 3.3 (70B)</option>
              <option value="poolside-laguna" className="bg-[#0a0a0a] text-foreground">Poolside Laguna XS 2.1</option>
              <option value="z-ai-glm" className="bg-[#0a0a0a] text-foreground">Z-AI GLM 5.2</option>
              <option value="minimax-m3" className="bg-[#0a0a0a] text-foreground">Minimax M3</option>
              <option value="nemotron-3" className="bg-[#0a0a0a] text-foreground">Nemotron 3 Ultra</option>
              <option value="mixtral-8x7b" className="bg-[#0a0a0a] text-foreground">Mixtral 8x7B</option>
              <option value="llama-3.1-8b" className="bg-[#0a0a0a] text-foreground">Llama 3.1 (8B)</option>
              <option value="llama-3.1-70b" className="bg-[#0a0a0a] text-foreground">Llama 3.1 (70B)</option>
              <option value="gemma-2-2b" className="bg-[#0a0a0a] text-foreground">Gemma 2 (2B)</option>
              <option value="llama-3.2-1b" className="bg-[#0a0a0a] text-foreground">Llama 3.2 (1B)</option>
              <option value="llama-3.2-3b" className="bg-[#0a0a0a] text-foreground">Llama 3.2 (3B)</option>
              <option value="phi-4-mini" className="bg-[#0a0a0a] text-foreground">Phi-4 Mini</option>
            </select>
          </div>

          {/* Prompt Input */}
          <div className="w-full max-w-3xl mb-8 animate-slide-in" style={{ animationDelay: "0.2s" }}>
            <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />
            {error && (
              <div className="mt-3 text-center text-sm text-neon-rose font-mono animate-slide-in">
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Pipeline Flow Preview */}
          <div className="w-full max-w-4xl mb-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="text-center mb-4">
              <span className="text-[11px] text-muted font-mono uppercase tracking-[0.2em]">
                9-Phase Autonomous Pipeline
              </span>
            </div>
            <PipelineFlow phases={defaultPhases} />
          </div>
        </section>

        {/* Agent Grid Section */}
        <section className="px-4 sm:px-6 pb-20 max-w-6xl mx-auto animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Meet Your AI Team
            </h2>
            <p className="text-sm text-muted">
              12 specialized agents working in concert
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {agents.map((agent, i) => (
              <div
                key={agent.role}
                className="glass rounded-xl p-4 flex flex-col items-center gap-2.5 text-center
                         border border-border/30 hover:border-neon-indigo/30
                         hover:bg-neon-indigo/[0.03] transition-all duration-300
                         group cursor-default"
                style={{ animationDelay: `${0.6 + i * 0.05}s` }}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                  {agent.icon}
                </span>
                <span className="text-[11px] font-semibold text-foreground/80 leading-tight">
                  {agent.name.replace(" Agent", "")}
                </span>
                <span className="text-[9px] text-dim leading-tight hidden sm:block">
                  {agent.description.slice(0, 40)}...
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/30 py-8 text-center">
          <div className="flex items-center justify-center gap-2 text-muted">
            <span className="text-sm font-mono">COLLABRO</span>
            <span className="text-dim">·</span>
            <span className="text-[11px] text-dim">
              Autonomous AI Software Engineering
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
