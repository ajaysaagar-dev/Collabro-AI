'use client';

import React from 'react';
import Link from 'next/link';
import { useWorkspace } from './WorkspaceProvider';

export const Header: React.FC = () => {
  const { tokenUsage, latency, prompt, isBuilding } = useWorkspace();

  // Format token count (e.g., 4200 -> 4.2k)
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex justify-between items-center px-6 h-16 ml-24 bg-surface/40 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-6">
        <Link href="/">
          <h1 className="font-headline-md text-headline-md font-black tracking-tight text-on-surface hover:text-primary transition-colors cursor-pointer">
            Collabro
          </h1>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/workspace" className="font-label-md text-label-md text-primary font-bold border-b-2 border-primary pb-1 cursor-pointer transition-colors">
            Main Workspace
          </Link>
          <span className="font-label-md text-label-md text-on-surface-variant">
            Minimax
          </span>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <span className="material-symbols-outlined text-[14px] text-primary">memory</span>
            <span className="font-label-md text-label-md text-on-surface-variant font-mono">
              {formatTokens(tokenUsage)} Tokens
            </span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <span className="material-symbols-outlined text-[14px] text-secondary">speed</span>
            <span className="font-label-md text-label-md text-on-surface-variant font-mono">
              {latency.toFixed(1)}s
            </span>
          </div>

          {isBuilding && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span className="font-label-md text-label-md text-primary font-bold">
                Building...
              </span>
            </div>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick info display for current prompt in top-bar on desktop */}
        {prompt && (
          <span className="hidden lg:inline-block max-w-[200px] xl:max-w-[350px] truncate text-body-sm text-on-surface-variant font-mono italic opacity-60">
            &quot;{prompt}&quot;
          </span>
        )}

        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-on-surface-variant hover:text-white" title="Open terminal">
          <span className="material-symbols-outlined text-[20px]">terminal</span>
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-on-surface-variant hover:text-white relative" title="Notifications">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-surface-container-high cursor-pointer hover:border-primary transition-all">
          <img
            className="w-full h-full object-cover"
            alt="User profile"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKfff7bxIp30ni-o7XYOBA4EA4AxRTjMTBT7L-ogWOPsOri8_nwOxVRRTdaY7SBSiUlIpU2Hs_7UEjVPlp8zEVAzcCBHYFn0dJ2c-B_Q3SY5YK0A4XR1BS-usVWDFcdIuE6vj-35PSMa27WaCo9FFiaVQ0-x3FQLPeKnNqa6SerJw3rNFksiwEk2PQ39x3KoHFTAyTv91yeMYnIQAXOWOwRD9LUhg_eAiHPqFgDuBa7cimR7amk8E3nV80_XDEKjS-QDgug5BI_R0"
          />
        </div>
      </div>
    </header>
  );
};
