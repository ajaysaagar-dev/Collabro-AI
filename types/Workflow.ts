export type PipelinePhase =
  | 'prompt-analysis'
  | 'requirements-validation'
  | 'architecture-design'
  | 'content-planning'
  | 'task-scheduling'
  | 'implementation'
  | 'testing'
  | 'documentation'
  | 'deployment'
  | 'completed';

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PhaseProgress {
  phase: PipelinePhase;
  status: PhaseStatus;
  progress: number; // 0-100
  startedAt?: number;
  completedAt?: number;
  iterations?: number;
}
