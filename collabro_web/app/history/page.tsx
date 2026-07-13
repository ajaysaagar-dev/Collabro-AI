'use client';

import React from 'react';
import { useWorkspace } from '../components/WorkspaceProvider';

interface HistoryRecord {
  id: string;
  timestamp: string;
  promptText: string;
  agentsRan: number;
  duration: string;
  tokensSpent: string;
  status: 'success' | 'failure';
}

const mockHistory: HistoryRecord[] = [
  {
    id: 'h1',
    timestamp: '2026-06-25 18:14:02',
    promptText: 'Build a next-generation workflow designer with WebGL background shaders and glassmorphism cards.',
    agentsRan: 12,
    duration: '14m 22s',
    tokensSpent: '4.2k',
    status: 'success',
  },
  {
    id: 'h2',
    timestamp: '2026-06-18 10:24:51',
    promptText: 'Create a microservice system containing authentication and e-commerce shopping cart flows.',
    agentsRan: 8,
    duration: '9m 45s',
    tokensSpent: '12.8M',
    status: 'success',
  },
  {
    id: 'h3',
    timestamp: '2026-05-30 14:12:10',
    promptText: 'Perform autonomous security analysis against web app endpoints and return PDF reports.',
    agentsRan: 6,
    duration: '7m 18s',
    tokensSpent: '8.4M',
    status: 'success',
  },
  {
    id: 'h4',
    timestamp: '2026-05-12 09:10:05',
    promptText: 'Initialize basic Docker layouts for standard Nest.js application structures.',
    agentsRan: 2,
    duration: '1m 30s',
    tokensSpent: '1.2M',
    status: 'success',
  },
];

export default function History() {
  const { prompt } = useWorkspace();

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 relative z-20 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8">
        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-md text-label-md uppercase tracking-wider mb-2 inline-block">
          Workspace Logbook
        </span>
        <h2 className="font-headline-xl text-3xl font-extrabold text-white">
          Prompt Execution History
        </h2>
      </div>

      {/* History List */}
      <div className="space-y-4 w-full">
        {mockHistory.map((item, index) => {
          const isLatest = index === 0;
          return (
            <div
              key={item.id}
              className={`glass-card rounded-xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/20 transition-all duration-300 ${
                isLatest ? 'border-primary/20 bg-primary/5' : 'border-white/5'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-mono text-on-surface-variant/75 font-semibold">
                    {item.timestamp}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[10px] text-green-300 font-bold uppercase font-mono tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-green-400"></span>
                    {item.status}
                  </div>
                  {isLatest && (
                    <span className="px-2 py-0.5 rounded bg-primary/20 border border-primary/30 text-[10px] text-primary font-bold uppercase font-mono tracking-wider">
                      Latest Run
                    </span>
                  )}
                </div>
                
                <p className="text-white font-mono text-[13px] md:text-sm font-semibold truncate leading-relaxed">
                  {isLatest && prompt ? prompt : item.promptText}
                </p>
              </div>

              <div className="flex items-center gap-6 shrink-0 text-body-sm font-mono text-[12px] border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                <div>
                  <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest block font-bold">
                    Agents
                  </span>
                  <span className="font-bold text-white">
                    {item.agentsRan} Step{item.agentsRan > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest block font-bold">
                    Duration
                  </span>
                  <span className="font-bold text-white">
                    {item.duration}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest block font-bold">
                    Volume
                  </span>
                  <span className="font-bold text-secondary">
                    {item.tokensSpent} Tokens
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
