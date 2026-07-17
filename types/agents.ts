// ─── types/agents.ts ─────────────────────────────────────────────────────────
// Zod-validated contracts for all 6 agents (§3 of target.md)
// Every agent consumes/produces a strict JSON object validated at orchestrator
// boundaries — this eliminates most silent-failure classes.

import { z } from 'zod';

// ─── Shared primitives ────────────────────────────────────────────────────────

export const FileEditSchema = z.object({
  path: z.string(),
  action: z.enum(['create', 'modify', 'delete']),
  content: z.string().optional(),
});
export type FileEdit = z.infer<typeof FileEditSchema>;

export const FileContextSchema = z.object({
  path: z.string(),
  content: z.string(),
});
export type FileContext = z.infer<typeof FileContextSchema>;

export const LintIssueSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  severity: z.enum(['info', 'warn', 'error']),
  rule: z.string().optional(),
  message: z.string(),
});
export type LintIssue = z.infer<typeof LintIssueSchema>;

export const SemgrepFindingSchema = z.object({
  file: z.string(),
  line: z.number(),
  ruleId: z.string(),
  message: z.string(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR']),
});
export type SemgrepFinding = z.infer<typeof SemgrepFindingSchema>;

// ─── §3.1 Planner / Architect Agent ─────────────────────────────────────────

export const ProjectMetaSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  stack: z.string().optional(),
  existingFiles: z.array(z.string()).optional(),
});
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;

export const TaskGraphNodeSchema = z.object({
  id: z.string(),
  description: z.string(),
  dependsOn: z.array(z.string()),
  targetFiles: z.array(z.string()),
  agent: z.enum(['coder', 'reviewer']),
});
export type TaskGraphNode = z.infer<typeof TaskGraphNodeSchema>;

export const PlannerInputSchema = z.object({
  requestText: z.string(),
  existingProjectMeta: ProjectMetaSchema.optional(),
  constraints: z.object({
    stack: z.string(),
    maxFiles: z.number().optional(),
  }),
});
export type PlannerInput = z.infer<typeof PlannerInputSchema>;

export const PlannerOutputSchema = z.object({
  taskGraph: z.array(TaskGraphNodeSchema),
  templateChoice: z.string(), // key into template registry
});
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;

// ─── §3.2 Coder Agent ────────────────────────────────────────────────────────

export const MemoryHintSchema = z.object({
  pastErrorPattern: z.string(),
  fix: z.string(),
  successRate: z.number().min(0).max(1).optional(),
});
export type MemoryHint = z.infer<typeof MemoryHintSchema>;

export const CoderInputSchema = z.object({
  task: TaskGraphNodeSchema,
  fileContext: z.array(FileContextSchema),
  memoryHints: z.array(MemoryHintSchema).optional(),
});
export type CoderInput = z.infer<typeof CoderInputSchema>;

export const CoderOutputSchema = z.object({
  fileEdits: z.array(FileEditSchema),
  rationale: z.string(),
  confidence: z.number().min(0).max(1), // low → routes to Reviewer with extra scrutiny
});
export type CoderOutput = z.infer<typeof CoderOutputSchema>;

// ─── §3.3 Reviewer / Static-Analysis Agent ──────────────────────────────────

export const ReviewerInputSchema = z.object({
  fileEdits: z.array(FileEditSchema),
  lintResults: z.array(LintIssueSchema),
  semgrepResults: z.array(SemgrepFindingSchema),
});
export type ReviewerInput = z.infer<typeof ReviewerInputSchema>;

export const ReviewIssueSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  severity: z.enum(['info', 'warn', 'error']),
  message: z.string(),
});
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;

export const ReviewerOutputSchema = z.object({
  verdict: z.enum(['approve', 'request_changes', 'block']),
  // 'block' = detected secret/RCE/dangerous exec → halts pipeline before PROVISIONING
  issues: z.array(ReviewIssueSchema),
});
export type ReviewerOutput = z.infer<typeof ReviewerOutputSchema>;

// ─── §3.4 Testing Agent — FailureReport (canonical schema from selenium.md) ──

export const LogEntrySchema = z.object({
  timestamp: z.number(),
  level: z.enum(['log', 'info', 'warn', 'error']),
  message: z.string(),
  source: z.string().optional(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export const NetworkEntrySchema = z.object({
  url: z.string(),
  method: z.string(),
  status: z.number().optional(),
  duration: z.number().optional(),
  requestBody: z.string().optional(),
  responseBody: z.string().optional(),
  error: z.string().optional(),
});
export type NetworkEntry = z.infer<typeof NetworkEntrySchema>;

export const FailureReportSchema = z.object({
  id: z.string(),
  category: z.enum([
    'Dependency Failure',
    'Runtime Failure',
    'Browser Failure',
    'UI Failure',
    'API Failure',
    'Network Failure',
    'Configuration Failure',
    'Environment Failure',
    'Authentication Failure',
    'Framework Failure',
    'Database Failure',
    'Performance Failure',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  page: z.string(),
  url: z.string(),
  component: z.string().optional(),
  error: z.string(),
  stackTrace: z.string().optional(),
  consoleLogs: z.array(LogEntrySchema),
  networkLogs: z.array(NetworkEntrySchema),
  screenshot: z.string(),   // path/URL to captured artifact
  htmlSnapshot: z.string(), // path/URL
  recommendedRepairAgent: z.string(),
});
export type FailureReport = z.infer<typeof FailureReportSchema>;

export const TesterInputSchema = z.object({
  projectPath: z.string(),
  baseUrl: z.string(),
  templateManifest: z.object({
    routeMap: z.array(z.string()),
    criticalSelectors: z.array(z.string()),
    healthCheckPath: z.string(),
  }),
});
export type TesterInput = z.infer<typeof TesterInputSchema>;

export const TesterOutputSchema = z.object({
  failureReports: z.array(FailureReportSchema),
  passed: z.boolean(),
  totalTests: z.number(),
  duration: z.number(),
  screenshotDir: z.string().optional(),
});
export type TesterOutput = z.infer<typeof TesterOutputSchema>;

// ─── §3.5 Repair Agent ───────────────────────────────────────────────────────

export const RepairAttemptSchema = z.object({
  id: z.string(),
  failureReportIds: z.array(z.string()),
  fileEdits: z.array(FileEditSchema),
  explanation: z.string(),
  succeeded: z.boolean().optional(),
  createdAt: z.number(),
});
export type RepairAttempt = z.infer<typeof RepairAttemptSchema>;

export const RepairInputSchema = z.object({
  failureReports: z.array(FailureReportSchema),
  fileContext: z.array(FileContextSchema),
  priorAttempts: z.array(RepairAttemptSchema),
  memoryHints: z.array(MemoryHintSchema).optional(),
});
export type RepairInput = z.infer<typeof RepairInputSchema>;

export const RepairOutputSchema = z.object({
  fileEdits: z.array(FileEditSchema),
  targetedFailures: z.array(z.string()), // which report ids this patch addresses
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
});
export type RepairOutput = z.infer<typeof RepairOutputSchema>;

// ─── §3.6 Deployment Agent ──────────────────────────────────────────────────

export const DeployInputSchema = z.object({
  projectPath: z.string(),
  target: z.enum(['vercel', 'docker', 'static-export']),
  env: z.record(z.string(), z.string()).optional(),
});
export type DeployInput = z.infer<typeof DeployInputSchema>;

export const DeployOutputSchema = z.object({
  deployUrl: z.string().optional(),
  buildLogs: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});
export type DeployOutput = z.infer<typeof DeployOutputSchema>;
