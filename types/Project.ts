import { ModelChoice } from './Model';
import { PipelinePhase, PhaseProgress } from './Workflow';
import { PipelineEvent } from './Event';
import { FileSpec, ScheduledTasks } from './Task';
import { AgentRole } from './Agent';

export interface PromptAnalysis {
  projectType: string;
  frontend: string;
  backend: string;
  database: string;
  authentication: string;
  features: string[];
  userRoles: string[];
  additionalServices: string[];
  summary: string;
}

export interface RequirementsValidation {
  missingRequirements: string[];
  suggestedAdditions: string[];
  confirmedRequirements: string[];
  riskAreas: string[];
  isComplete: boolean;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
}

export interface ArchitectureDesign {
  folderStructure: string;
  fileList: FileSpec[];
  apiEndpoints: ApiEndpoint[];
  databaseSchema: string;
  envVariables: string[];
  dependencies: Record<string, string>;
  buildConfig: string;
}

export interface ContentPlan {
  fileSpecs: FileSpec[];
  dependencyGraph: Record<string, string[]>;
  totalFiles: number;
  estimatedTotalTokens: number;
}

export interface GeneratedFile {
  path: string;
  content: string;
  agent: AgentRole;
  generatedAt: number;
}

export interface ProjectState {
  id: string;
  prompt: string;
  model: ModelChoice;
  createdAt: number;
  status: 'initializing' | 'running' | 'completed' | 'failed' | 'partial_success' | 'stalled';
  currentPhase: PipelinePhase;
  phases: PhaseProgress[];
  promptAnalysis?: PromptAnalysis;
  requirementsValidation?: RequirementsValidation;
  architectureDesign?: ArchitectureDesign;
  contentPlan?: ContentPlan;
  scheduledTasks?: ScheduledTasks;
  generatedFiles: GeneratedFile[];
  events: PipelineEvent[];
  error?: string;
  repairReport?: {
    status: string;
    initialErrors: number;
    fixedErrors: number;
    remainingErrors: number;
    progress: string;
    repairCycles: number;
    reason: string;
    currentStrategy: string;
    nextStrategy: string;
    nextAgent: string;
    rollbackAvailable: boolean;
    escalationLevel: number;
  };
}
