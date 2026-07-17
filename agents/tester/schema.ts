// ─── agents/tester/schema.ts ─────────────────────────────────────────────────
// Canonical FailureReport schema for the Testing Agent (§3.4 of target.md).
// This is the exact schema consumed by every downstream agent — it must never
// drift between prose (selenium.md) and code.

export {
  FailureReportSchema,
  TesterInputSchema,
  TesterOutputSchema,
  LogEntrySchema,
  NetworkEntrySchema,
  type FailureReport,
  type TesterInput,
  type TesterOutput,
  type LogEntry,
  type NetworkEntry,
} from '@/types/agents';

export const FAILURE_CATEGORIES = [
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
] as const;

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

/** Map failure category to the recommended repair agent */
export const CATEGORY_TO_AGENT: Record<string, string> = {
  'Dependency Failure':   'coder',
  'Runtime Failure':      'repair',
  'Browser Failure':      'tester',
  'UI Failure':           'coder',
  'API Failure':          'backend',
  'Network Failure':      'repair',
  'Configuration Failure':'coder',
  'Environment Failure':  'deployer',
  'Authentication Failure':'coder',
  'Framework Failure':    'repair',
  'Database Failure':     'database',
  'Performance Failure':  'coder',
};
