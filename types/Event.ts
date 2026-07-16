import { PipelinePhase } from './Workflow';
import { AgentRole } from './Agent';

export type PipelineEventType =
  | 'phase-start'
  | 'phase-complete'
  | 'phase-error'
  | 'agent-start'
  | 'agent-output'
  | 'agent-complete'
  | 'agent-error'
  | 'task-assigned'
  | 'task-complete'
  | 'progress-update'
  | 'file-generated'
  | 'log';

export interface PipelineEvent {
  id: string;
  type: PipelineEventType;
  timestamp: number;
  phase: PipelinePhase;
  agent: AgentRole;
  message: string;
  data?: Record<string, unknown>;
}
