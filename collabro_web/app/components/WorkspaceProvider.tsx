'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface LogEntry {
  time: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface AgentStep {
  id: number;
  name: string;
  description: string;
  status: 'completed' | 'active' | 'pending' | 'queued';
  icon: string;
  task?: string;
  estTime?: string;
  selected?: boolean;
}

interface WorkspaceContextType {
  activeStep: number;
  progress: number;
  logs: LogEntry[];
  isBuilding: boolean;
  prompt: string;
  isDeployed: boolean;
  tokenUsage: number;
  latency: number;
  agents: AgentStep[];
  startBuild: (promptText: string) => void;
  triggerDeployment: () => void;
  resetWorkspace: () => void;
  toggleRoleSelection: (id: number) => void;
  confirmWorkforce: () => void;
}

const initialAgents: AgentStep[] = [
  { id: 1, name: 'User Prompt', description: '💡 Input parsing, prompt requirements gathering and baseline configuration setups.', status: 'completed', icon: 'chat', task: 'Ready', estTime: '0s' },
  { id: 2, name: 'Workforce Configurator', description: 'Select the required roles and agents for this workspace build.', status: 'completed', icon: 'settings_suggest', task: 'Workforce Confirmed', estTime: '0s' },
  { id: 3, name: 'Business Analyst', description: 'Technical scope documentation, user flows, and specification sheets.', status: 'completed', icon: 'description', task: 'Ready', estTime: '0s', selected: true },
  { id: 4, name: 'Project Manager', description: 'Task breakdown delegation, sprints planning, and milestone orchestrations.', status: 'completed', icon: 'assignment', task: 'Ready', estTime: '0s', selected: true },
  { id: 5, name: 'Solution Architect', description: 'System design, entity relationships diagrams, and infrastructure plans.', status: 'completed', icon: 'schema', task: 'Ready', estTime: '0s', selected: true },
  { id: 6, name: 'UI/UX Designer', description: 'Design system tokens, typography rules, and interactive page layouts.', status: 'completed', icon: 'palette', task: 'Ready', estTime: '0s', selected: true },
  { id: 7, name: 'Frontend Developer', description: 'Developing core layouts, page routing configurations, and responsive elements.', status: 'active', icon: 'code', task: 'Compiling Tailwind configurations & route parameters', estTime: '12s', selected: true },
  { id: 8, name: 'Backend Developer', description: 'Server architectures setup, controllers logic, and middleware integrations.', status: 'queued', icon: 'terminal', task: 'Queued', estTime: '15s', selected: true },
  { id: 9, name: 'Database Engineer', description: 'Tables structure definitions, optimization index setup, and connection pools.', status: 'queued', icon: 'storage', task: 'Queued', estTime: '20s', selected: true },
  { id: 10, name: 'API Engineer', description: 'RESTful controllers definitions, payload validations, and SDK configurations.', status: 'queued', icon: 'api', task: 'Queued', estTime: '10s', selected: true },
  { id: 11, name: 'AI Engineer', description: 'LLM agents orchestrations, vector embedding indexes, and model prompt tunings.', status: 'queued', icon: 'psychology', task: 'Queued', estTime: '22s', selected: true },
  { id: 12, name: 'Security Engineer', description: 'Access tokens signing, secure headers configuration, and vulnerability audits.', status: 'queued', icon: 'security', task: 'Queued', estTime: '15s', selected: true },
  { id: 13, name: 'QA Engineer', description: 'Automated integration tests definitions and accessibility benchmarks checks.', status: 'queued', icon: 'fact_check', task: 'Queued', estTime: '18s', selected: true },
  { id: 14, name: 'Code Reviewer', description: 'Staged changes diff audits, lint constraints checks, and code quality controls.', status: 'queued', icon: 'rate_review', task: 'Queued', estTime: '12s', selected: true },
  { id: 15, name: 'DevOps Engineer', description: 'Deployments script writing, container builds, and load balancer configurations.', status: 'queued', icon: 'cloud_sync', task: 'Queued', estTime: '25s', selected: true },
  { id: 16, name: 'Documentation Agent', description: 'API reference guides generating, setup logs parsing, and walkthrough docs compiling.', status: 'queued', icon: 'article', task: 'Queued', estTime: '8s', selected: true }
];

const initialLogs: LogEntry[] = [
  { time: '09:44:12', message: 'Creating Login Page...', type: 'info' },
  { time: '09:44:14', message: 'Injecting Tailwind themes', type: 'success' },
  { time: '09:44:15', message: 'Resolving responsive breakpoints', type: 'info' },
  { time: '09:44:17', message: 'Compiling framer-motion assets', type: 'warning' },
  { time: '09:44:19', message: 'Linking OAuth providers', type: 'info' },
  { time: '09:44:21', message: 'Generating input validation', type: 'success' }
];

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const poolLogs = [
  'Optimizing bundle size',
  'Testing client-side hydration',
  'Applying glassmorphism effects',
  'Synchronizing state managers',
  'Setting up page routing structures',
  'Integrating context providers',
  'Resolving hydration warnings',
  'Minifying code splits',
  'Bundling chunks for distribution',
  'Prefetching lazy-loaded routes',
  'Configuring service workers',
  'Testing WebGL viewport responsiveness'
];

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeStep, setActiveStep] = useState<number>(7); // Frontend Developer is default active (now step 7 because Workforce Configurator is step 2)
  const [progress, setProgress] = useState<number>(74);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('Build a next-generation workflow designer with WebGL background shaders and glassmorphism cards.');
  const [isDeployed, setIsDeployed] = useState<boolean>(false);
  const [tokenUsage, setTokenUsage] = useState<number>(4200);
  const [latency, setLatency] = useState<number>(0.8);
  const [agents, setAgents] = useState<AgentStep[]>(initialAgents);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scrolling simulated log additions
  useEffect(() => {
    if (isBuilding || (!isBuilding && activeStep === 7)) {
      const interval = setInterval(() => {
        const time = new Date().toLocaleTimeString([], { hour12: false });
        const logMsg = poolLogs[Math.floor(Math.random() * poolLogs.length)];
        
        const types: ('info' | 'success' | 'warning')[] = ['info', 'success', 'warning'];
        const type = types[Math.floor(Math.random() * types.length)];

        setLogs((prev) => {
          const updated = [...prev, { time, message: logMsg, type }];
          if (updated.length > 12) {
            updated.shift();
          }
          return updated;
        });

        setProgress((prev) => {
          if (isBuilding) {
            const nextProgress = prev + 5;
            if (nextProgress >= 100) {
              return 100;
            }
            return nextProgress;
          } else {
            return 74 + (Math.floor(Date.now() / 2000) % 5);
          }
        });

        setTokenUsage((prev) => prev + Math.floor(Math.random() * 50) - 20);
        setLatency(() => parseFloat((0.6 + Math.random() * 0.4).toFixed(2)));

      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isBuilding, activeStep]);

  // Handle step increments when building
  useEffect(() => {
    if (isBuilding) {
      const stepDuration = 5000;
      const interval = setInterval(() => {
        setProgress(0);
        
        setActiveStep((prevStep) => {
          let nextStep = prevStep + 1;

          // Skip deselected roles in the agents list
          while (nextStep <= 16 && agents[nextStep - 1] && agents[nextStep - 1].selected === false) {
            nextStep++;
          }
          
          if (nextStep > 16) {
            clearInterval(interval);
            setIsBuilding(false);
            setProgress(100);
            
            setAgents((prevAgents) =>
              prevAgents.map((agent) => ({ 
                ...agent, 
                status: agent.selected === false ? 'queued' : 'completed', 
                icon: agent.selected === false ? agent.icon : 'check_circle', 
                task: agent.selected === false ? 'Skipped' : 'Completed', 
                estTime: '0s' 
              }))
            );
            return 17; // Step 17 is Final Output
          }

          // Update agent statuses
          setAgents((prevAgents) =>
            prevAgents.map((agent) => {
              if (agent.id < nextStep) {
                return { 
                  ...agent, 
                  status: agent.selected === false ? 'queued' : 'completed', 
                  icon: agent.selected === false ? agent.icon : 'check_circle', 
                  task: agent.selected === false ? 'Skipped' : 'Completed', 
                  estTime: '0s' 
                };
              } else if (agent.id === nextStep) {
                return { 
                  ...agent, 
                  status: 'active', 
                  icon: initialAgents[nextStep - 1]?.icon || 'autorenew',
                  task: `Processing step: ${agent.name}`,
                  estTime: '8s'
                };
              } else {
                return { 
                  ...agent, 
                  status: 'queued', 
                  icon: initialAgents[agent.id - 1]?.icon || 'pending',
                  task: 'Queued',
                  estTime: '15s'
                };
              }
            })
          );

          const time = new Date().toLocaleTimeString([], { hour12: false });
          setLogs((prev) => {
            const transitionMsg = `[SYSTEM] Handing over workspace to Agent ${nextStep}: ${agents[nextStep - 1]?.name || 'Next'}`;
            const updated = [...prev, { time, message: transitionMsg, type: 'info' as const }];
            if (updated.length > 12) updated.shift();
            return updated;
          });

          return nextStep;
        });
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [isBuilding, agents]);

  const startBuild = (promptText: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setPrompt(promptText);
    setIsBuilding(false); // Do not start build progress automatically, wait at Step 2 (Workforce Configurator)
    setIsDeployed(false);
    setActiveStep(2); // Start at Step 2 (Workforce Configurator) so the user selects roles first!
    setProgress(0);
    setLogs([
      { time: new Date().toLocaleTimeString([], { hour12: false }), message: 'Workspace initialized. Ready for role selection.', type: 'info' }
    ]);
    
    setAgents(
      initialAgents.map((agent) => {
        if (agent.id === 1) {
          return { ...agent, status: 'completed', icon: 'check_circle', task: 'Ready', estTime: '0s' };
        } else if (agent.id === 2) {
          return { ...agent, status: 'active', icon: 'settings_suggest', task: 'Awaiting role verification...', estTime: 'Est: Config' };
        } else {
          return { 
            ...agent, 
            status: 'queued', 
            icon: initialAgents[agent.id - 1]?.icon || 'pending', 
            task: 'Queued', 
            estTime: 'Pending' 
          };
        }
      })
    );
  };

  const confirmWorkforce = () => {
    setIsBuilding(true);
    setProgress(5);
    setActiveStep(3); // Start with Business Analyst (Step 3)
    
    setAgents((prevAgents) =>
      prevAgents.map((agent) => {
        if (agent.id === 2) {
          return { ...agent, status: 'completed', icon: 'check_circle', task: 'Workforce Confirmed', estTime: '0s' };
        } else if (agent.id === 3) {
          return { ...agent, status: 'active', task: 'Analyzing requirements...', estTime: '10s' };
        } else {
          return agent;
        }
      })
    );

    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => {
      const updated = [...prev, { time, message: '🚀 Workforce confirmed. Starting pipeline execution...', type: 'success' as const }];
      if (updated.length > 12) updated.shift();
      return updated;
    });
  };

  const toggleRoleSelection = (id: number) => {
    setAgents((prevAgents) =>
      prevAgents.map((agent) => {
        if (agent.id === id && agent.selected !== undefined) {
          return { ...agent, selected: !agent.selected };
        }
        return agent;
      })
    );
  };

  const triggerDeployment = () => {
    setIsDeployed(true);
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => {
      const updated = [...prev, { time, message: '🎉 Global Deployment Initiated Successfully!', type: 'success' as const }];
      if (updated.length > 12) updated.shift();
      return updated;
    });
  };

  const resetWorkspace = () => {
    setActiveStep(7); // default active (Frontend Developer, now step 7)
    setProgress(74);
    setLogs(initialLogs);
    setIsBuilding(false);
    setPrompt('Build a next-generation workflow designer with WebGL background shaders and glassmorphism cards.');
    setIsDeployed(false);
    setAgents(initialAgents);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeStep,
        progress,
        logs,
        isBuilding,
        prompt,
        isDeployed,
        tokenUsage,
        latency,
        agents,
        startBuild,
        triggerDeployment,
        resetWorkspace,
        toggleRoleSelection,
        confirmWorkforce
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
