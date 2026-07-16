// ─── In-Memory Project Store ────────────────────────────────────────────────
// Holds project state and provides SSE event broadcasting

import { ProjectState, PipelineEvent, PipelinePhase, PhaseProgress, ModelChoice } from '@/types';

const ALL_PHASES: PipelinePhase[] = [
  'prompt-analysis',
  'requirements-validation',
  'architecture-design',
  'content-planning',
  'task-scheduling',
  'implementation',
  'testing',
  'documentation',
  'deployment',
  'completed',
];

function createInitialPhases(): PhaseProgress[] {
  return ALL_PHASES.filter(p => p !== 'completed').map(phase => ({
    phase,
    status: 'pending' as const,
    progress: 0,
  }));
}

// ─── Project Store ──────────────────────────────────────────────────────────

const projects = new Map<string, ProjectState>();
const eventListeners = new Map<string, Set<(event: PipelineEvent) => void>>();

export function createProject(id: string, prompt: string, model: ModelChoice = 'Llama'): ProjectState {
  const project: ProjectState = {
    id,
    prompt,
    model,
    createdAt: Date.now(),
    status: 'initializing',
    currentPhase: 'prompt-analysis',
    phases: createInitialPhases(),
    generatedFiles: [],
    events: [],
  };
  projects.set(id, project);
  eventListeners.set(id, new Set());
  return project;
}

export function getProject(id: string): ProjectState | undefined {
  return projects.get(id);
}

export function updateProject(id: string, updates: Partial<ProjectState>): ProjectState | undefined {
  const project = projects.get(id);
  if (!project) return undefined;
  Object.assign(project, updates);
  return project;
}

export function updatePhase(projectId: string, phase: PipelinePhase, updates: Partial<PhaseProgress>): void {
  const project = projects.get(projectId);
  if (!project) return;
  const phaseEntry = project.phases.find(p => p.phase === phase);
  if (phaseEntry) {
    Object.assign(phaseEntry, updates);
  }
}

export function pushEvent(projectId: string, event: PipelineEvent): void {
  const project = projects.get(projectId);
  if (project) {
    project.events.push(event);
  }
  // Broadcast to SSE listeners
  const listeners = eventListeners.get(projectId);
  if (listeners) {
    for (const listener of listeners) {
      listener(event);
    }
  }
}

export function addEventListener(projectId: string, listener: (event: PipelineEvent) => void): () => void {
  let listeners = eventListeners.get(projectId);
  if (!listeners) {
    listeners = new Set();
    eventListeners.set(projectId, listeners);
  }
  listeners.add(listener);
  // Return unsubscribe function
  return () => {
    listeners!.delete(listener);
  };
}

export function deleteProject(id: string): void {
  projects.delete(id);
  eventListeners.delete(id);
}
