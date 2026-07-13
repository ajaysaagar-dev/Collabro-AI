'use client';

import React from 'react';
import { useWorkspace } from '../components/WorkspaceProvider';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'draft';
  techStack: string[];
  agentsCount: number;
  tokensCount: string;
  date: string;
}

const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Collabro AI OS',
    description: 'Next-generation workspace UI with dynamic shader canvas backgrounds and reactive logs stream pipelines.',
    status: 'active',
    techStack: ['Next.js', 'React', 'WebGL', 'Tailwind v4'],
    agentsCount: 12,
    tokensCount: '4.2M',
    date: 'Jun 25, 2026',
  },
  {
    id: 'p2',
    name: 'E-Commerce Agentic Engine',
    description: 'Multi-agent checkout system that coordinates inventories, processes orders, and handles refunds.',
    status: 'completed',
    techStack: ['FastAPI', 'PostgreSQL', 'LangChain', 'Redis'],
    agentsCount: 8,
    tokensCount: '12.8M',
    date: 'Jun 18, 2026',
  },
  {
    id: 'p3',
    name: 'Autonomous Security Auditor',
    description: 'Autonomous pen-testing agent designed to crawl staging environments and generate daily PDF vulnerability indexes.',
    status: 'completed',
    techStack: ['Python', 'Docker', 'OpenAI API', 'ReportLab'],
    agentsCount: 6,
    tokensCount: '8.4M',
    date: 'May 30, 2026',
  },
  {
    id: 'p4',
    name: 'Holographic UI Editor',
    description: 'Drafting design tool matching three-dimensional mesh models with automatic React code generators.',
    status: 'draft',
    techStack: ['Three.js', 'React', 'TypeScript', 'WebXR'],
    agentsCount: 4,
    tokensCount: '1.2M',
    date: 'May 12, 2026',
  },
];

export default function Projects() {
  const { prompt } = useWorkspace();

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 relative z-20 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-md text-label-md uppercase tracking-wider mb-2 inline-block">
            Workspace Directory
          </span>
          <h2 className="font-headline-xl text-3xl font-extrabold text-white">
            Created Projects
          </h2>
        </div>
        <button className="primary-gradient text-white font-body-md text-body-sm px-6 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/10">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {mockProjects.map((project) => {
          const isActive = project.status === 'active';
          return (
            <div
              key={project.id}
              className={`glass-card rounded-2xl p-6 flex flex-col justify-between border hover:border-primary/20 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group ${
                isActive ? 'border-primary/30 shadow-[0_0_30px_rgba(0,198,255,0.05)]' : 'border-white/5'
              }`}
            >
              {/* Highlight background flash */}
              {isActive && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-300"></div>
              )}

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? 'bg-primary animate-pulse' : project.status === 'completed' ? 'bg-green-400' : 'bg-orange-400'
                      }`}
                    />
                    <span className="text-[11px] font-bold tracking-wider uppercase font-label-md opacity-80">
                      {project.status}
                    </span>
                  </div>
                  <span className="text-body-sm text-on-surface-variant font-mono text-[12px]">{project.date}</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                
                <p className="text-body-sm text-on-surface-variant/90 leading-relaxed mb-6">
                  {project.id === 'p1' && prompt ? prompt : project.description}
                </p>
              </div>

              <div>
                {/* Tech Stack tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded bg-white/5 border border-white/5 text-[11px] font-mono text-on-surface-variant font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">diversity_3</span>
                    <span className="text-body-sm font-mono text-[13px] text-white">
                      {project.agentsCount} Agents
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary">memory</span>
                    <span className="text-body-sm font-mono text-[13px] text-white">
                      {project.tokensCount} Tokens
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
