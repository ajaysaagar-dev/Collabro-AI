"use client";

import { useRef, useEffect } from "react";
import type { PipelineEvent } from "@/types";
import TerminalLine from "./TerminalLine";

interface TerminalProps {
  events: PipelineEvent[];
}

export default function Terminal({ events }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScroll = useRef(true);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && isAutoScroll.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Detect manual scroll to pause auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAutoScroll.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-border bg-[#0a0a0a]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface/80 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          {/* macOS dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition-all cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition-all cursor-pointer" />
          </div>
          <span className="text-[11px] text-muted font-mono tracking-wide">
            collabro — pipeline output
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-dim font-mono">
            {events.length} events
          </span>
          {events.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto terminal-scroll py-2 min-h-0"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
            <div className="text-2xl animate-float">⚡</div>
            <p className="text-sm font-mono">Waiting for pipeline events...</p>
            <span className="cursor-blink text-sm font-mono text-dim" />
          </div>
        ) : (
          <div className="space-y-0">
            {events.map((event, i) => (
              <TerminalLine key={event.id} event={event} index={i} />
            ))}
            {/* Blinking cursor at bottom */}
            <div className="px-4 py-1">
              <span className="cursor-blink text-sm font-mono text-dim" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
