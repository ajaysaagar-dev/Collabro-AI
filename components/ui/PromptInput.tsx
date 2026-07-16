"use client";

import { useState, useEffect } from "react";
import GlowButton from "./GlowButton";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const PLACEHOLDER_PROMPTS = [
  "Build a full-stack e-commerce platform with Next.js, Stripe payments, admin dashboard, and real-time inventory tracking...",
  "Create a project management tool like Linear with kanban boards, sprint planning, and GitHub integration...",
  "Build a social media platform with real-time messaging, stories, feed algorithm, and content moderation...",
];

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    setPlaceholderIndex(Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length));
  }, []);

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass rounded-2xl p-1 neon-border-indigo transition-all duration-500 hover:shadow-[0_0_40px_rgba(129,140,248,0.12)]">
        {/* Terminal header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neon-rose/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-neon-amber/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-neon-emerald/80" />
          </div>
          <span className="text-[11px] text-muted font-mono ml-2">
            collabro://new-project
          </span>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
            rows={5}
            className="w-full bg-transparent text-foreground placeholder:text-muted/50
                       font-mono text-sm leading-relaxed resize-none
                       px-5 py-4 outline-none
                       focus:placeholder:text-muted/30 transition-colors"
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted font-mono">
                {prompt.length}
                <span className="text-dim"> chars</span>
              </span>
              <span className="text-[11px] text-dim font-mono hidden sm:inline">
                ⌘+Enter to submit
              </span>
            </div>

            <GlowButton
              onClick={handleSubmit}
              loading={isLoading}
              disabled={!prompt.trim()}
              className="!px-6 !py-2.5 !text-xs"
            >
              <span className="mr-1">🚀</span>
              Build Project
            </GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
}
