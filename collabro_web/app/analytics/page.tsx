'use client';

import React from 'react';
import { useWorkspace } from '../components/WorkspaceProvider';

export default function Analytics() {
  const { tokenUsage, latency } = useWorkspace();

  const mockMetrics = [
    { label: 'Token Utilization', value: `${(tokenUsage / 1000).toFixed(1)}k`, icon: 'memory', trend: '+12% from average' },
    { label: 'Avg API Latency', value: `${latency.toFixed(1)}s`, icon: 'speed', trend: '-0.1s optimization' },
    { label: 'Workflow Cost', value: `$${(tokenUsage * 0.000015).toFixed(4)}`, icon: 'payments', trend: 'Under budget limit' },
    { label: 'Task Execution Rate', value: '98.6%', icon: 'task_alt', trend: '100% SLA uptime' },
  ];

  const graphBars = [40, 65, 55, 85, 95, 70, 74];

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 relative z-20 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8">
        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-md text-label-md uppercase tracking-wider mb-2 inline-block">
          Workspace Metrics
        </span>
        <h2 className="font-headline-xl text-3xl font-extrabold text-white">
          Performance Analytics
        </h2>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-8">
        {mockMetrics.map((metric) => (
          <div key={metric.label} className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-on-surface-variant font-label-md">
                {metric.label}
              </span>
              <span className="material-symbols-outlined text-primary text-[20px]">
                {metric.icon}
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-black font-mono text-white mb-1">
                {metric.value}
              </h3>
              <p className="text-[11px] text-secondary font-semibold font-mono tracking-wider">
                {metric.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Details charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Token consumption chart */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 lg:col-span-2">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Token Usage Frequency</h3>
            <span className="text-xs text-on-surface-variant font-mono">Last 7 Prompts</span>
          </div>

          {/* Graphical Representation */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-white/10 pb-2 px-4">
            {graphBars.map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group h-full justify-end">
                <span className="text-[11px] font-mono text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                  {i === 6 ? `${(tokenUsage / 1000).toFixed(1)}k` : `${(height * 80).toLocaleString()}`}
                </span>
                <div
                  className="w-full rounded-t-md primary-gradient shadow-[0_0_15px_rgba(0,198,255,0.2)] group-hover:brightness-110 transition-all duration-300"
                  style={{ height: `${i === 6 ? (tokenUsage / 80) : height}%` }}
                ></div>
                <span className="text-[10px] text-on-surface-variant font-mono mt-3">
                  P0{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Model distribution chart */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-6">LLM Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-body-sm mb-1.5 font-mono text-[12px]">
                  <span className="text-white/80">Minimax</span>
                  <span className="text-primary font-bold">100%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-body-sm">
            <span className="text-xs text-on-surface-variant leading-relaxed">
              Provider routing optimizations are auto-adjusted.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
