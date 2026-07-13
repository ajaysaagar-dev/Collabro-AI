'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from './components/WorkspaceProvider';

export default function Home() {
  const router = useRouter();
  const { startBuild, prompt: currentPrompt } = useWorkspace();
  const [promptText, setPromptText] = useState(currentPrompt);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-expand textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [promptText]);

  const handleBuild = () => {
    if (!promptText.trim()) return;
    startBuild(promptText);
    router.push('/workspace');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBuild();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-[calc(100vh-64px)] z-20">
      
      {/* Hero Section */}
      <div className="w-full max-w-4xl flex flex-col items-center text-center -mt-8">
        <div className="mb-10 animate-fade-in duration-700">
          <span className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-md text-label-md uppercase tracking-widest mb-6 inline-block">
            Next-Gen AI Workforce
          </span>
          <h2 className="font-headline-xl text-4xl md:text-5xl lg:text-6xl text-white font-extrabold mb-4 tracking-tight leading-tight">
            Architect the Future.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Orchestrate high-performance AI agents to build, deploy, and scale complex software ecosystems in seconds.
          </p>
        </div>

        {/* Glassmorphic Prompt Box */}
        <div className="w-full max-w-2xl glass-panel rounded-2xl p-2 glow-border transition-all duration-300 shadow-2xl relative group">
          <div className="absolute -inset-1 primary-gradient opacity-20 blur-2xl -z-10 group-focus-within:opacity-40 transition-opacity duration-300"></div>
          
          <div className="relative flex items-end gap-3 p-4">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white font-body-md text-body-md placeholder-on-surface-variant/50 resize-none py-2"
                placeholder="What would you like your AI workforce to build today?"
                rows={1}
              />
            </div>
            
            <div className="flex items-center gap-2 pb-1">
              <button 
                className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Attach Files"
              >
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <button 
                className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Use Microphone"
              >
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={handleBuild}
            disabled={!promptText.trim()}
            className="primary-gradient text-white font-body-md text-body-md px-10 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-3 cursor-pointer"
          >
            Build Project
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </button>

          {/* Active Agents Avatars */}
          <div className="flex items-center gap-6 mt-8">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Software Architect avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJOjnOqqwR9-SnirYha6m8c2ll-l4BSLPKfQ9gfng7YEV6B-6q4C3PggpeOkegfAKY-lbu9b555IYvI5KD9rioHtUYm2HbBY4bh2-ptGfnnuVMkOPM0t48jPSLp28MPO6z37M3MJqkKMrBIQn2c1aF79U4SGh4mahwfTirkrblIll4i-GYYtOOnCwEZpjUZ3lAQlywlZGpqgsSex7KaTtJ3pMjYYLBWznwaI80AuGGvshSx3VOW6BtRfGOw_BGJqi6NM1q94A4g2U"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Data Scientist avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDidpb_uiIetREimhX1UXPwS7ou7aBiAU7KMVK6JoR32ca26hRjfoUeBvQ7qI4xZjSQFiCLJQV_ihfgN406hYrYsV-AJO5y5isbh8HVm_KGKK6w8-7tilaqpMLICszoHNdyaud3KkQlLIQdiq-qeo4hQF70annIcHQHsbY7xSD0nc9pNG6FSNADbKprd66lks4jaFVJxHoTe9Jemlx4kgtr1LfkG0K0IYwbcawXQjN3jBkiqhpU647iBEitxxwQF6KSUlSesGKxkZI"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="DevOps Engineer avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAELHSFlDa4JmUXThsJICMxGkEJG1JCSZ0LSCaOWbmsHyrpaYWTiFFHY3Gls_0_-myFE3JpFMc5c7s2nJUAhMHyGJWOcb-FXrL438gsSkXORLLg9gHTnASyXU5LlKy8F31USqH9IcA28hA7w4jIgAXUqu3J32dWpSQrNvCQahzYeSlyxcQTt3sMZiXClIsMzSo-MjKfCYZTBZ7Xmcw9HEfcrkvxyRTzTeNYKdkU91HhRmy9VdCtsNXKuwDYOShGhLUIhQquNOw3FU8"
                />
              </div>
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">
              12 Agents Active in Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Floating Status Indicators */}
      <div className="absolute bottom-10 left-10 flex gap-4">
        <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="font-label-md text-label-md text-white/80">System: Operational</span>
        </div>
        <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3 border border-white/5">
          <span className="material-symbols-outlined text-[16px] text-primary">cloud_done</span>
          <span className="font-label-md text-label-md text-white/80">Synced to Cloud</span>
        </div>
      </div>

      <div className="absolute bottom-10 right-10">
        <button className="w-12 h-12 rounded-full glass-panel flex items-center justify-center hover:bg-primary/20 transition-all group border border-white/10 cursor-pointer">
          <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">help</span>
        </button>
      </div>
    </div>
  );
}
