import { AgentRole } from './Agent';

export interface FileSpec {
  path: string;
  purpose: string;
  requirements: string[];
  dependencies: string[];
  estimatedTokens: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignedAgent: AgentRole;
}

export interface TaskItem {
  id: string;
  fileSpec: FileSpec;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  dependsOn: string[];
  output?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ScheduledTasks {
  tasks: TaskItem[];
  executionOrder: string[];
  parallelGroups: string[][];
}
