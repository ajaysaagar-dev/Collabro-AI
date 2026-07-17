// ─── Repair Orchestrator Types ────────────────────────────────────────────────
// Core types for the autonomous repair loop prevention system

import { AgentRole } from '@/types/Agent';
import { ValidationError } from '@/orchestrator/validation';

export type { ValidationError };

export type ValidationCache = Map<string, ValidationCacheEntry>;
export type ValidatorConfig = Record<string, { timeout: number; incremental: boolean }>;

// ─── Additional Types for Dependency Graph ──────────────────────────────────────

/**
 * Error node in the dependency graph
 */
export interface ErrorNode {
  id: string;
  error: ValidationError;
  fingerprint: string;
  dependents: string[];
  dependencies: string[];
  clusterId: string;
  rootCauseScore: number;
  isRootCause: boolean;
  validated: boolean;
}

/**
 * Error edge in the dependency graph
 */
export interface ErrorEdge {
  from: string;
  to: string;
  type: 'file-dependency' | 'validator' | 'cluster';
  strength: number;
}

/**
 * Cluster of related errors
 */
export interface ErrorCluster {
  id: string;
  type: ClusterType;
  validator: string;
  files: string[];
  nodeIds: string[];           // ErrorNode IDs in this cluster
  errors: ValidationError[];   // All errors in this cluster
  rootCauseCandidates: RootCauseCandidate[];
  severity: ClusterSeverity;
  fileCount: number;
  validatorCount: number;
}

/**
 * Cluster type classification
 */
export type ClusterType = 'validator' | 'file' | 'dependency' | 'mixed';

/**
 * Cluster severity
 */
export type ClusterSeverity = 'critical' | 'high' | 'medium' | 'low' | 'error' | 'warning' | 'mixed';

/**
 * Root cause candidate
 */
export interface RootCauseCandidate {
  nodeId: string;
  score: number;
  reasons: string[];
  error: ValidationError;
}

/**
 * Root cause analysis configuration
 */
export interface RootCauseConfig {
  minRootCauseScore: number;
  maxRootCauses: number;
  requireDependencyEvidence: boolean;
  preferEarlyValidators: boolean;
  preferConfigFiles: boolean;
  clusterWeight: number;
  dependencyWeight: number;
  frequencyWeight: number;
  severityWeight: number;
}

/**
 * File dependency graph
 */
export interface FileDependencyGraph {
  nodes: Map<string, FileNode>;
  edges: FileEdge[];
}

/**
 * File node in dependency graph
 */
export interface FileNode {
  path: string;
  content: string;
  imports: string[];
  exports: string[];
  dependents: Set<string>;
  dependencies: Set<string>;
  outgoing: FileEdge[];
  incoming: FileEdge[];
}

/**
 * File edge in dependency graph
 */
export interface FileEdge {
  from: string;
  to: string;
  type: 'import' | 'export' | 'runtime' | 'config';
}

/**
 * Dependency graph configuration
 */
export interface DependencyGraphConfig {
  maxDepth: number;
  includeTransitive: boolean;
  clusterByModule: boolean;
  minClusterSize: number;
}

// ─── Error Fingerprinting ──────────────────────────────────────────────────────

/**
 * Unique fingerprint for an error based on validator, file, location, and message
 */
export interface ErrorFingerprint {
  hash: string;                    // SHA-256 hash of fingerprint components
  validator: string;               // Validator name (e.g., 'TypeScript', 'ESLint', 'Build')
  file: string;                    // Relative file path
  line?: number;                   // Line number (if available)
  column?: number;                 // Column number (if available)
  message: string;                 // Error message
  normalizedMessage: string;
  code?: string;                   // Error code (e.g., 'TS2304', 'ESLINT_NO_UNUSED_VARS')
  severity: 'error' | 'warning';
  firstSeen: number;               // Timestamp when first seen
  lastSeen: number;                // Timestamp when last seen
  occurrenceCount: number;         // How many times this error has appeared
  resolved: boolean;               // Whether this error has been resolved
  resolvedAt?: number;             // Timestamp when resolved
  resolvedBy?: string;             // Patch ID that resolved it
  cycles: number[];
}

/**
 * Cluster of related errors (same root cause)
 */
export interface ErrorFingerprintCluster {
  id: string;
  type: 'file' | 'validator' | 'dependency' | 'mixed';
  validator: string;
  files: string[];
  fingerprints: ErrorFingerprint[];
  totalOccurrences: number;
  firstSeen: number;
  lastSeen: number;
  rootCauseCandidate: ErrorFingerprint | null;
}

export interface ErrorFingerprintConfig {
  includeValidator: boolean;
  includeFile: boolean;
  includeLine: boolean;
  includeColumn: boolean;
  includeMessage: boolean;
  messageSimilarityThreshold: number;
  clusterBy: string[];
  maxClusterSize: number;
}

export interface ErrorFingerprintStats {
  totalFingerprints: number;
  totalOccurrences: number;
  uniqueFiles: number;
  uniqueValidators: number;
  cycles: number;
  byValidator: Record<string, number>;
  byFile: Record<string, number>;
  bySeverity: Record<string, number>;
  recurringErrors: string[];
  oscillatingErrors: string[];
  topErrors: string[];
}

export interface OscillationPattern {
  fingerprintHash: string;
  pattern: 'oscillation';
  cyclesAffected: number[];
  oscillationCount: number;
  severity: 'high' | 'medium';
  detectedAt: number;
}

/**
 * Dependency graph node representing a file/module
 */
export interface DependencyNode {
  file: string;                    // File path
  dependencies: string[];          // Files this file depends on
  dependents: string[];            // Files that depend on this file
  errors: ErrorFingerprint[];      // Errors in this file
  clusterIds: string[];            // Error clusters this file belongs to
  status: 'clean' | 'dirty' | 'locked' | 'frozen';
  lastModified: number;
  ownerAgent: AgentRole;           // Agent that owns this file
  lockOwner?: string;              // Patch ID that locked this file
  freezeReason?: string;           // Reason if frozen
}

/**
 * Complete error dependency graph
 */
export interface ErrorDependencyGraph {
  nodes: Map<string, ErrorNode>;
  edges: ErrorEdge[];
  clusters: ErrorCluster[];
  fileDependencyGraph: FileDependencyGraph;
  rootCauses: string[];
  analyzedAt?: number;
}

/**
 * Dependency edge between two files
 */
export interface DependencyEdge {
  from: string;                    // Source file
  to: string;                      // Target file
  type: 'import' | 'export' | 'runtime' | 'config';
  strength: number;                // 0-1 strength of dependency
}

/**
 * Root cause analysis result
 */
export interface RootCauseAnalysis {
  rootCauses: RootCauseCandidate[];
  allCandidates: RootCauseCandidate[];
  explanation: string;
  confidence: number;
  analyzedAt: number;
  errorClusters?: ErrorCluster[];
  graph?: ErrorDependencyGraph;
  summary?: string;
}

/**
 * Individual root cause
 */
export interface RootCause {
  id: string;
  file: string;                    // File containing the root cause
  fingerprint: ErrorFingerprint;   // Primary error fingerprint
  description: string;             // Human-readable description
  affectedFiles: string[];         // Files affected by this root cause
  affectedClusters: string[];      // Error clusters this root cause explains
  fixStrategy: FixStrategy;        // Recommended fix strategy
  confidence: number;              // 0-1 confidence
  evidence: string[];              // Evidence supporting this root cause
}

/**
 * Fix strategy for a root cause
 */
export interface FixStrategy {
  type: RepairStrategy;
  description: string;
  estimatedComplexity?: 'low' | 'medium' | 'high' | 'critical';
  estimatedFilesToChange?: number;
  recommendedAgent?: AgentRole;
  patchTemplate?: string;          // Template for patch generation
  prerequisites?: string[];         // Files that must be fixed first
  approach?: string;
  steps?: string[];
  estimatedFiles?: string[];
  confidence?: number;
}

// ─── Repair Planning ────────────────────────────────────────────────────────

/**
 * Atomic patch representing a minimal change
 */
export interface AtomicPatch {
  id: string;                      // Unique patch ID
  rootCauseId: string;             // Root cause this patch addresses
  file: string;                    // File to patch
  strategy: RepairStrategy;        // Patch strategy type
  description: string;             // Human-readable description
  diff: PatchDiff;                 // The actual diff
  confidence: number;              // 0-1 confidence this patch will fix the issue
  risk: 'low' | 'medium' | 'high' | 'critical'; // Risk of introducing regressions
  affectedFiles: string[];         // Files that might be affected by this patch
  requiredValidators: string[];    // Validators that must pass after this patch
  prerequisites: string[];         // Patch IDs that must be applied first
  createdAt: number;
  createdBy: AgentRole;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'rolled-back';
  appliedAt?: number;
  rolledBackAt?: number;
}

/**
 * Unified diff format for patches
 */
export interface PatchDiff {
  oldContent: string;              // Original file content
  newContent: string;              // New file content
  hunks: PatchHunk[];              // Individual hunks
  linesAdded: number;
  linesRemoved: number;
  linesChanged: number;
}

/**
 * Individual hunk in a patch
 */
export interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: PatchLine[];
}

/**
 * Single line in a patch hunk
 */
export interface PatchLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  lineNumber?: number;
}

/**
 * Repair plan containing ordered patches
 */
export interface RepairPlan {
  id: string;
  rootCauseAnalysis: RootCauseAnalysis;
  patches: AtomicPatch[];          // Ordered patches to apply
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: number;       // Estimated milliseconds
  affectedValidators: string[];    // Validators that need to run
  strategy: RepairStrategy;        // Overall repair strategy
  createdAt: number;
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'rolled-back';
}

/**
 * Repair strategy enum
 */
export type RepairStrategy =
  | 'minimal-patch'     // Single atomic patch per root cause
  | 'ast-transform'     // AST-based transformation
  | 'function-rewrite'  // Rewrite specific functions
  | 'module-rewrite'    // Rewrite entire module
  | 'architecture-review' // Architectural review
  | 'architecture-fix'  // Architectural refactoring
  | 'config-fix'
  | 'import-fix'
  | 'type-fix'
  | 'lint-fix'
  | 'build-fix'
  | 'dependency-fix';

// ─── File Locking ────────────────────────────────────────────────────────────

/**
 * File lock state
 */
export interface FileLock {
  file: string;
  state: FileLockState;
  ownerPatchId?: string;           // Patch ID that owns this lock
  ownerAgent?: AgentRole;          // Agent that owns this lock
  lockedAt: number;
  expiresAt?: number;              // Auto-expiry timestamp
  reason: string;                  // Reason for lock
  unlockCondition?: UnlockCondition;
}

/**
 * File lock states
 */
export type FileLockState =
  | 'unlocked'
  | 'generating'
  | 'validating'
  | 'locked'
  | 'frozen'
  | 'cooldown';

/**
 * Condition for auto-unlocking
 */
export interface UnlockCondition {
  type: 'validation-pass' | 'validation-fail' | 'timeout' | 'root-cause-resolved' | 'manual';
  validator?: string;
  timeout?: number;
}

/**
 * File lifecycle state
 */
export interface FileLifecycle {
  file: string;
  state: FileLifecycleState;
  generatedAt?: number;
  validatedAt?: number;
  lockedAt?: number;
  frozenAt?: number;
  ownerAgent: AgentRole;
  patchHistory: PatchHistoryEntry[];
  cooldownUntil?: number;
}

/**
 * File lifecycle states
 */
export type FileLifecycleState =
  | 'new'
  | 'generated'
  | 'validating'
  | 'passed'
  | 'locked'
  | 'frozen'
  | 'cooldown'
  | 'error';

/**
 * Patch history entry for a file
 */
export interface PatchHistoryEntry {
  patchId: string;
  appliedAt: number;
  revertedAt?: number;
  success: boolean;
  validatorResults: Record<string, boolean>;
}

/**
 * Cooldown configuration
 */
export interface CooldownConfig {
  defaultCooldownMs: number;       // Default cooldown period
  maxCooldownMs: number;           // Maximum cooldown
  escalationMultiplier: number;    // Multiplier for repeated failures
  rootCauseOverride: boolean;      // Allow override if new root cause found
}

// ─── Patch Review ────────────────────────────────────────────────────────────

/**
 * Patch review result
 */
export interface PatchReview {
  patchId: string;
  reviewer: string;
  approved: boolean;
  confidence: number;              // 0-1 confidence in approval
  concerns: string[];              // Concerns if any
  suggestedChanges?: PatchChange[]; // Suggested modifications
  riskAssessment: RiskAssessment;
  reviewedAt: number;
}

/**
 * Suggested change to a patch
 */
export interface PatchChange {
  type: 'modify' | 'split' | 'reject' | 'defer' | 'review';
  description: string;
  newDiff?: PatchDiff;
}

/**
 * Risk assessment for a patch
 */
export interface RiskAssessment {
  regressionRisk: number;          // 0-1 probability of regression
  complexityRisk: number;          // 0-1 complexity risk
  dependencyRisk: number;          // 0-1 dependency risk
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string[];            // Mitigation strategies
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Incremental validation result
 */
export interface IncrementalValidationResult {
  validator: string;
  status: 'pass' | 'fail' | 'skipped';
  errors: ValidationError[];
  duration: number;
  filesValidated: string[];
  cacheHit: boolean;
  timestamp: number;
}

/**
 * Validation cache entry
 */
export interface ValidationCacheEntry {
  validator: string;
  fileHashes: Map<string, string>; // file -> content hash
  result: IncrementalValidationResult;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Validation hierarchy stage
 */
export interface ValidationStage {
  name: string;
  order: number;
  validators: string[];
  dependsOn: string[];             // Stage names this depends on
  runCondition: 'always' | 'on-change' | 'on-failure';
}

// ─── Strategy Selection ──────────────────────────────────────────────────────

/**
 * Repair strategy attempt
 */
export interface StrategyAttempt {
  strategy: RepairStrategy;
  attemptNumber: number;
  patchIds: string[];
  result: 'success' | 'failure' | 'partial';
  errorsFixed: number;
  errorsIntroduced: number;
  regressions: number;
  duration: number;
  timestamp: number;
}

/**
 * Strategy selection result
 */
export interface StrategySelection {
  strategy: RepairStrategy;
  reason: string;
  confidence: number;
  previousAttempts: StrategyAttempt[];
  maxAttempts: number;
}

// ─── Supervisor ──────────────────────────────────────────────────────────────

/**
 * Supervisor detection result
 */
export interface SupervisorDetection {
  type: SupervisorDetectionType;
  detected: boolean;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  evidence: string[];
  recommendedAction: SupervisorAction;
  timestamp: number;
}

/**
 * Types of issues the supervisor detects
 */
export type SupervisorDetectionType =
  | 'repair-loop'              // Same errors recurring
  | 'oscillation'              // Errors bouncing between states
  | 'regression'               // New errors introduced
  | 'deadlock'                 // Circular dependencies blocking
  | 'starvation'               // Some errors never addressed
  | 'repeated-patches'         // Same patch applied multiple times
  | 'repeated-validators'      // Same validators running repeatedly
  | 'repeated-rewrites'        // Files being rewritten repeatedly
  | 'stagnation'               // No progress over cycles
  | 'error-budget-exceeded';   // Error budget exhausted

/**
 * Supervisor actions
 */
export type SupervisorAction =
  | 'continue'
  | 'pause'
  | 'rollback'
  | 'escalate'
  | 'change-strategy'
  | 'architecture-review'
  | 'human-intervention';

/**
 * Supervisor state
 */
export interface SupervisorState {
  cycleCount: number;
  maxCycles: number;
  errorBudget: ErrorBudget;
  progressScores: ProgressScore[];
  detections: SupervisorDetection[];
  lastAction: SupervisorAction;
  paused: boolean;
  escalated: boolean;
  lastProgressTime?: number;
}

/**
 * Error budget tracking
 */
export interface ErrorBudget {
  cycle: number;
  initialErrors: number;
  currentErrors: number;
  bestErrors: number;
  stagnationCycles: number;
  maxStagnationCycles: number;
  improvementThreshold: number;  // Minimum improvement required
}

/**
 * Progress score for a cycle
 */
export interface ProgressScore {
  cycle: number;
  timestamp: number;
  errorsFixed: number;
  regressions: number;
  newErrors: number;
  validatorsPassed: number;
  validatorsTotal: number;
  patchesApplied: number;
  patchesRolledBack: number;
  overallScore: number;          // 0-100
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Stagnation detection result
 */
export interface StagnationDetection {
  detected: boolean;
  cyclesWithoutImprovement: number;
  errorCount: number;
  previousErrorCount: number;
  recommendation: SupervisorAction;
}

// ─── Error Memory ────────────────────────────────────────────────────────────

/**
 * Stored successful repair pattern
 */
export interface RepairPattern {
  id: string;
  errorFingerprint: ErrorFingerprint; // The error pattern
  rootCauseDescription: string;
  fixStrategy: FixStrategy;
  patchTemplate: PatchDiff;        // Template patch
  successRate: number;             // 0-1
  timesApplied: number;
  lastApplied: number;
  applicableValidators: string[];
  applicableFilePatterns: string[];
  confidence: number;
}

/**
 * Error memory store
 */
export interface ErrorMemory {
  patterns: Map<string, RepairPattern>;
  totalPatterns: number;
  lastUpdated: number;
}

// ─── Repair State Machine ────────────────────────────────────────────────────

/**
 * Repair workflow state
 */
export type RepairState =
  | 'idle'
  | 'collecting-errors'
  | 'fingerprinting'
  | 'clustering'
  | 'building-graph'
  | 'root-cause-analysis'
  | 'planning'
  | 'impact-analysis'
  | 'acquiring-locks'
  | 'generating-patches'
  | 'reviewing-patches'
  | 'applying-patches'
  | 'incremental-validation'
  | 'checkpoint'
  | 'rollback'
  | 'strategy-selection'
  | 'escalation'
  | 'completed'
  | 'failed';

/**
 * Repair workflow context
 */
export interface RepairContext {
  projectId: string;
  projectDir: string;
  state: RepairState;
  cycleCount: number;
  maxCycles: number;
  errorBudget: ErrorBudget;
  supervisorState: SupervisorState;
  validationCache: ValidationCache;
  errorMemory: ErrorMemory;
  fileLocks: Map<string, FileLock>;
  fileLifecycles: Map<string, FileLifecycle>;
  currentPlan?: RepairPlan;
  appliedPatches: AtomicPatch[];
  rolledBackPatches: AtomicPatch[];
  validationResults: IncrementalValidationResult[];
  startTime: number;
  lastProgressTime: number;
  config?: RepairOrchestratorConfig;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Repair orchestrator configuration
 */
export interface RepairOrchestratorConfig {
  maxCycles: number;
  maxRetriesPerStrategy: number;
  errorBudgetImprovementThreshold: number; // Minimum % improvement
  stagnationCyclesThreshold: number;
  defaultCooldownMs: number;
  maxCooldownMs: number;
  cooldownEscalationMultiplier: number;
  patchConfidenceThresholds: {
    autoApply: number;      // >= this: auto-apply
    reviewRequired: number; // >= this: review required
    reject: number;         // < this: reject
  };
  validationCacheTtlMs: number;
  fileLockTimeoutMs: number;
  supervisorCheckInterval: number;
  strategyRotationOrder: RepairStrategy[];
}

export interface PatchExecutorResult {
  success: boolean;
  patchId: string;
  file: string;
  error?: string;
  duration: number;
  rolledBack: boolean;
  validationErrors?: ValidationError[];
  newContent?: string;
}

export interface PatchConfidenceThresholds {
  autoApply: number;
  reviewRequired: number;
  reject: number;
}