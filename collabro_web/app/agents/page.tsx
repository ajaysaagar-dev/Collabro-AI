'use client';

import React from 'react';
import { useWorkspace } from '../components/WorkspaceProvider';

interface AgentDetails {
  id: number;
  name: string;
  role: string;
  model: string;
  skills: string[];
  performance: string;
  avatar: string;
  status: 'idle' | 'working' | 'queued';
}

const mockAgents: AgentDetails[] = [
  {
    id: 1,
    name: 'Analyst Bot',
    role: 'Business Analyst',
    model: 'Minimax (Default)',
    skills: ['Requirement Mapping', 'User Stories', 'Risk Analysis'],
    performance: '98%',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJOjnOqqwR9-SnirYha6m8c2ll-l4BSLPKfQ9gfng7YEV6B-6q4C3PggpeOkegfAKY-lbu9b555IYvI5KD9rioHtUYm2HbBY4bh2-ptGfnnuVMkOPM0t48jPSLp28MPO6z37M3MJqkKMrBIQn2c1aF79U4SGh4mahwfTirkrblIll4i-GYYtOOnCwEZpjUZ3lAQlywlZGpqgsSex7KaTtJ3pMjYYLBWznwaI80AuGGvshSx3VOW6BtRfGOw_BGJqi6NM1q94A4g2U',
    status: 'idle',
  },
  {
    id: 2,
    name: 'Orchestration Core',
    role: 'Project Manager',
    model: 'Minimax',
    skills: ['Milestone Allocation', 'Sprint Planning', 'Task Delegation'],
    performance: '95%',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDidpb_uiIetREimhX1UXPwS7ou7aBiAU7KMVK6JoR32ca26hRjfoUeBvQ7qI4xZjSQFiCLJQV_ihfgN406hYrYsV-AJO5y5isbh8HVm_KGKK6w8-7tilaqpMLICszoHNdyaud3KkQlLIQdiq-qeo4hQF70annIcHQHsbY7xSD0nc9pNG6FSNADbKprd66lks4jaFVJxHoTe9Jemlx4kgtr1LfkG0K0IYwbcawXQjN3jBkiqhpU647iBEitxxwQF6KSUlSesGKxkZI',
    status: 'idle',
  },
  {
    id: 3,
    name: 'Architect Prime',
    role: 'System Architect',
    model: 'Minimax',
    skills: ['Database Schemes', 'API Design', 'Microservices'],
    performance: '99%',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAELHSFlDa4JmUXThsJICMxGkEJG1JCSZ0LSCaOWbmsHyrpaYWTiFFHY3Gls_0_-myFE3JpFMc5c7s2nJUAhMHyGJWOcb-FXrL438gsSkXORLLg9gHTnASyXU5LlKy8F31USqH9IcA28hA7w4jIgAXUqu3J32dWpSQrNvCQahzYeSlyxcQTt3sMZiXClIsMzSo-MjKfCYZTBZ7Xmcw9HEfcrkvxyRTzTeNYKdkU91HhRmy9VdCtsNXKuwDYOShGhLUIhQquNOw3FU8',
    status: 'idle',
  },
  {
    id: 4,
    name: 'Styling Sync',
    role: 'UI/UX Designer',
    model: 'Minimax',
    skills: ['Design Tokens', 'Tailwind v4 Config', 'Component Layouts'],
    performance: '92%',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsukIDcSWw-zlwe75tDskb96jxXfjMGPe34Io3jYpfhp77UDbWWNqNs03euWLvR0Pa22pUW53BYW8zQVVZYYkPGtkCG7GKaFbkL2dZjt-HfLAMnNUpssBprlD-5Hd0dvVBJi6mrjD3mP39BIXN3tdc7MS4a4njflHAMMknW0Y795YJPgrblmdVGy1B2KZXSpfuOyKkqheXAdx8tr4y52_xmrCe1XECGmd65kwobmNUnNHsPL_WhgoT04f9p24u67GY38uowG1_0VY',
    status: 'idle',
  },
  {
    id: 5,
    name: 'React Builder',
    role: 'Frontend Developer',
    model: 'Minimax',
    skills: ['Component Engineering', 'Routing setups', 'Interactive elements'],
    performance: '97%',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKfff7bxIp30ni-o7XYOBA4EA4AxRTjMTBT7L-ogWOPsOri8_nwOxVRRTdaY7SBSiUlIpU2Hs_7UEjVPlp8zEVAzcCBHYFn0dJ2c-B_Q3SY5YK0A4XR1BS-usVWDFcdIuE6vj-35PSMa27WaCo9FFiaVQ0-x3FQLPeKnNqa6SerJw3rNFksiwEk2PQ39x3KoHFTAyTv91yeMYnIQAXOWOwRD9LUhg_eAiHPqFgDuBa7cimR7amk8E3nV80_XDEKjS-QDgug5BI_R0',
    status: 'working',
  },
  {
    id: 6,
    name: 'DevOps Node',
    role: 'DevOps Engineer',
    model: 'Minimax',
    skills: ['Kubernetes setup', 'CI/CD Pipelines', 'Docker Compose'],
    performance: '96%',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAELHSFlDa4JmUXThsJICMxGkEJG1JCSZ0LSCaOWbmsHyrpaYWTiFFHY3Gls_0_-myFE3JpFMc5c7s2nJUAhMHyGJWOcb-FXrL438gsSkXORLLg9gHTnASyXU5LlKy8F31USqH9IcA28hA7w4jIgAXUqu3J32dWpSQrNvCQahzYeSlyxcQTt3sMZiXClIsMzSo-MjKfCYZTBZ7Xmcw9HEfcrkvxyRTzTeNYKdkU91HhRmy9VdCtsNXKuwDYOShGhLUIhQquNOw3FU8',
    status: 'queued',
  },
];

export default function Agents() {
  const { activeStep, isBuilding } = useWorkspace();

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 relative z-20 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8">
        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-md text-label-md uppercase tracking-wider mb-2 inline-block">
          AI Workforce Grid
        </span>
        <h2 className="font-headline-xl text-3xl font-extrabold text-white">
          Active Workspace Agents
        </h2>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {mockAgents.map((agent) => {
          // Adjust state based on active build step
          const isActuallyWorking = isBuilding && activeStep === agent.id;
          const statusText = isActuallyWorking ? 'working' : agent.status;

          return (
            <div
              key={agent.id}
              className={`glass-card rounded-2xl p-6 border flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative group overflow-hidden ${
                isActuallyWorking ? 'border-primary/40 shadow-[0_0_25px_rgba(0,198,255,0.08)] scale-[1.01]' : 'border-white/5'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      statusText === 'working' ? 'bg-secondary animate-pulse' : statusText === 'queued' ? 'bg-amber-400' : 'bg-primary'
                    }`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                      {statusText}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-primary transition-colors">
                  {agent.name}
                </h3>
                <span className="text-body-sm font-semibold text-primary font-label-md text-[12px] block mb-4">
                  {agent.role}
                </span>

                <div className="mb-4">
                  <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                    Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.skills.map((skill) => (
                      <span key={skill} className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-on-surface-variant font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-4 flex justify-between items-center text-body-sm">
                <div>
                  <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest block font-bold">
                    LLM Engine
                  </span>
                  <span className="font-mono text-[12px] font-semibold text-white/95">
                    {agent.model}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest block font-bold">
                    Score
                  </span>
                  <span className="font-mono text-[12px] font-bold text-secondary">
                    {agent.performance}
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
