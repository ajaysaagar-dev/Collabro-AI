// ─── Repair Planner ────────────────────────────────────────────────────────────
// Creates repair plans with prioritized, ordered patches based on root cause analysis

import { ValidationError } from '@/orchestrator/validation';
import { AgentRole } from '@/types/Agent';
import {
  RepairPlan,
  AtomicPatch,
  RootCauseAnalysis,
  RootCauseCandidate,
  FixStrategy,
  RepairStrategy,
  ErrorDependencyGraph,
  ErrorCluster,
  PatchDiff,
  PatchHunk,
  PatchLine,
  FileLock,
  FileLifecycle,
  FileLockState,
  FileLifecycleState,
  CooldownConfig,
  RepairOrchestratorConfig,
  StrategyAttempt,
  StrategySelection,
} from './types';
import { determineRepairStrategy, generateFixStrategy } from './root-cause-analyzer';
import { selectNextStrategy } from './strategy-selector';

const DEFAULT_REPAIR_CONFIG: RepairOrchestratorConfig = {
  maxCycles: 10,
  maxRetriesPerStrategy: 3,
  errorBudgetImprovementThreshold: 0.15, // 15% improvement required
  stagnationCyclesThreshold: 3,
  defaultCooldownMs: 30000, // 30 seconds
  maxCooldownMs: 300000,    // 5 minutes
  cooldownEscalationMultiplier: 2,
  patchConfidenceThresholds: {
    autoApply: 0.85,
    reviewRequired: 0.60,
    reject: 0.40,
  },
  validationCacheTtlMs: 300000, // 5 minutes
  fileLockTimeoutMs: 60000,     // 1 minute
  supervisorCheckInterval: 1,
  strategyRotationOrder: [
    'minimal-patch',
    'ast-transform',
    'function-rewrite',
    'module-rewrite',
    'architecture-review',
  ],
};

/**
 * Creates a repair plan from root cause analysis
 */
export function createRepairPlan(
  rootCauseAnalysis: RootCauseAnalysis,
  graph: ErrorDependencyGraph,
  config: RepairOrchestratorConfig = DEFAULT_REPAIR_CONFIG,
  previousAttempts: StrategyAttempt[] = []
): RepairPlan {
  const patches: AtomicPatch[] = [];
  let patchCounter = 0;

  // Generate patches for each root cause
  for (const rootCause of rootCauseAnalysis.rootCauses) {
    let strategy = determineRepairStrategy(rootCause, graph);
    let fixStrategy = generateFixStrategy(rootCause, strategy, graph);

    if (previousAttempts.length > 0) {
      const selection = selectNextStrategy(rootCause, previousAttempts, config, graph);
      strategy = selection.strategy;
      fixStrategy = generateFixStrategy(rootCause, strategy, graph);
      fixStrategy.confidence = selection.confidence;
    }

    const patch = createAtomicPatch(
      rootCause,
      fixStrategy,
      graph,
      patchCounter++
    );
    patches.push(patch);
  }

  // Sort patches by priority and dependencies
  const orderedPatches = orderPatches(patches, graph);

  // Determine required validators
  const affectedValidators = determineAffectedValidators(orderedPatches, graph);

  // Calculate priority
  const priority = calculatePlanPriority(rootCauseAnalysis, graph);

  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    rootCauseAnalysis,
    patches: orderedPatches,
    priority,
    estimatedDuration: estimateDuration(orderedPatches),
    affectedValidators,
    strategy: determineOverallStrategy(rootCauseAnalysis),
    createdAt: Date.now(),
    status: 'planned',
  };
}

/**
 * Creates an atomic patch for a root cause
 */
function createAtomicPatch(
  rootCause: RootCauseCandidate,
  fixStrategy: FixStrategy,
  graph: ErrorDependencyGraph,
  index: number
): AtomicPatch {
  const patchId = `patch-${rootCause.nodeId}-${index}`;

  // Generate the actual diff
  const diff = generatePatchDiff(rootCause, fixStrategy, graph);

  // Determine prerequisites (patches that must be applied first)
  const prerequisites = findPrerequisites(rootCause, graph);

  return {
    id: patchId,
    rootCauseId: rootCause.nodeId,
    file: rootCause.error.file,
    strategy: fixStrategy.type,
    description: fixStrategy.description,
    diff,
    confidence: fixStrategy.confidence ?? 0.5,
    risk: assessRisk(rootCause, fixStrategy, graph),
    affectedFiles: fixStrategy.estimatedFiles ?? [],
    requiredValidators: getValidatorsForStrategy(fixStrategy.type),
    prerequisites,
    createdAt: Date.now(),
    createdBy: fixStrategy.type === 'config-fix' ? 'architect' : 'debugger',
    status: 'pending',
  };
}

/**
 * Generates a patch diff for a root cause
 */
function generatePatchDiff(
  rootCause: RootCauseCandidate,
  fixStrategy: FixStrategy,
  graph: ErrorDependencyGraph
): PatchDiff {
  // In a real implementation, this would generate actual diffs
  // For now, return a template structure
  const oldContent = `// Original content with error: ${rootCause.error.message}`;
  const newContent = `// Fixed content - ${fixStrategy.description}`;

  return {
    oldContent,
    newContent,
    hunks: [{
      oldStart: 1,
      oldLines: 1,
      newStart: 1,
      newLines: 1,
      lines: [
        { type: 'remove', content: oldContent, lineNumber: 1 },
        { type: 'add', content: newContent, lineNumber: 1 },
      ],
    }],
    linesAdded: 1,
    linesRemoved: 1,
    linesChanged: 1,
  };
}

/**
 * Finds prerequisite patches (dependencies)
 */
function findPrerequisites(
  rootCause: RootCauseCandidate,
  graph: ErrorDependencyGraph
): string[] {
  const prerequisites: string[] = [];
  const node = graph.nodes.get(rootCause.nodeId);
  if (!node) return prerequisites;

  // Prerequisites are root causes that this one depends on
  for (const depId of node.dependencies) {
    const depNode = graph.nodes.get(depId);
    if (depNode && depNode.isRootCause) {
      prerequisites.push(depNode.error.file); // Use file as identifier
    }
  }

  return prerequisites;
}

/**
 * Orders patches by priority and dependencies
 */
function orderPatches(
  patches: AtomicPatch[],
  graph: ErrorDependencyGraph
): AtomicPatch[] {
  // Topological sort based on prerequisites
  const patchMap = new Map(patches.map(p => [p.id, p]));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  // Initialize
  for (const patch of patches) {
    inDegree.set(patch.id, 0);
    adj.set(patch.id, []);
  }

  // Build dependency graph
  for (const patch of patches) {
    for (const prereq of patch.prerequisites) {
      // Find patch for prerequisite file
      const prereqPatch = patches.find(p => p.file === prereq);
      if (prereqPatch) {
        adj.get(prereqPatch.id)!.push(patch.id);
        inDegree.set(patch.id, (inDegree.get(patch.id) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const ordered: AtomicPatch[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const patch = patchMap.get(current)!;
    ordered.push(patch);

    for (const neighbor of adj.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  // Add any remaining (cycles)
  for (const patch of patches) {
    if (!ordered.includes(patch)) {
      ordered.push(patch);
    }
  }

  return ordered;
}

/**
 * Determines affected validators for a set of patches
 */
function determineAffectedValidators(
  patches: AtomicPatch[],
  graph: ErrorDependencyGraph
): string[] {
  const validators = new Set<string>();

  for (const patch of patches) {
    for (const validator of patch.requiredValidators) {
      validators.add(validator);
    }

    // Add validators for affected files
    for (const file of patch.affectedFiles) {
      const node = Array.from(graph.nodes.values()).find(n => n.error.file === file);
      if (node) {
        validators.add(node.error.stage);
      }
    }
  }

  return Array.from(validators);
}

/**
 * Gets validators required for a strategy type
 */
function getValidatorsForStrategy(strategy: RepairStrategy): string[] {
  const validatorMap: Record<RepairStrategy, string[]> = {
    'config-fix': ['Project Structure', 'Dependencies', 'Type Check', 'Build'],
    'import-fix': ['Type Check', 'Static Analysis', 'Build'],
    'type-fix': ['Type Check', 'Build'],
    'lint-fix': ['Lint', 'Formatting'],
    'build-fix': ['Build', 'Type Check'],
    'dependency-fix': ['Dependencies', 'Build'],
    'minimal-patch': ['Type Check', 'Lint', 'Build'],
    'ast-transform': ['Type Check', 'Build'],
    'function-rewrite': ['Type Check', 'Lint', 'Build'],
    'module-rewrite': ['Type Check', 'Lint', 'Build', 'Static Analysis'],
    'architecture-review': ['Project Structure', 'Dependencies', 'Type Check', 'Build'],
    'architecture-fix': ['Project Structure', 'Dependencies', 'Type Check', 'Build'],
  };

  return validatorMap[strategy] || ['Type Check', 'Build'];
}

/**
 * Calculates plan priority
 */
function calculatePlanPriority(
  analysis: RootCauseAnalysis,
  graph: ErrorDependencyGraph
): RepairPlan['priority'] {
  const criticalErrors = analysis.rootCauses.filter(
    rc => rc.error.severity === 'error' && getValidatorOrder(rc.error.stage) <= 4
  ).length;

  const totalErrors = graph.nodes.size;

  if (criticalErrors >= 3 || totalErrors > 50) return 'critical';
  if (criticalErrors >= 1 || totalErrors > 20) return 'high';
  if (totalErrors > 5) return 'medium';
  return 'low';
}

/**
 * Estimates plan duration
 */
function estimateDuration(patches: AtomicPatch[]): number {
  // Base time per patch type (ms)
  const baseTime: Record<string, number> = {
    'config-fix': 5000,
    'import-fix': 10000,
    'type-fix': 15000,
    'lint-fix': 5000,
    'build-fix': 30000,
    'dependency-fix': 20000,
    'minimal-patch': 10000,
    'ast-transform': 15000,
    'function-rewrite': 30000,
    'module-rewrite': 60000,
    'architecture-review': 120000,
    'architecture-fix': 60000,
  };

  return patches.reduce((sum, patch) => sum + (baseTime[patch.strategy] || 10000), 0);
}

/**
 * Determines overall repair strategy
 */
function determineOverallStrategy(
  analysis: RootCauseAnalysis
): RepairStrategy {
  const rootCauses = analysis.rootCauses;

  // If many root causes, might need architecture review
  if (rootCauses.length > 5) return 'architecture-review';

  // If config files are root causes
  if (rootCauses.some(rc => isConfigFile(rc.error.file))) return 'config-fix';

  // If import/module errors
  if (rootCauses.some(rc => rc.error.message.includes('import') || rc.error.message.includes('module'))) {
    return 'import-fix';
  }

  // If type errors dominate
  if (rootCauses.filter(rc => rc.error.stage === 'Type Check').length >= 2) {
    return 'type-fix';
  }

  // Default to minimal patches
  return 'minimal-patch';
}

/**
 * Assesses risk of a patch
 */
function assessRisk(
  rootCause: RootCauseCandidate,
  fixStrategy: FixStrategy,
  graph: ErrorDependencyGraph
): AtomicPatch['risk'] {
  let riskScore = 0;

  // High confidence = lower risk
  riskScore += (1 - (fixStrategy.confidence ?? 0.5)) * 0.5;

  // Many affected files = higher risk
  riskScore += Math.min((fixStrategy.estimatedFiles ?? []).length * 0.1, 0.3);

  // Early validator = higher risk (affects more)
  const validatorOrder = getValidatorOrder(rootCause.error.stage);
  if (validatorOrder <= 3) riskScore += 0.2;

  // Many dependents = higher risk
  const node = graph.nodes.get(rootCause.nodeId);
  if (node && node.dependents.length > 5) riskScore += 0.2;

  if (riskScore >= 0.6) return 'high';
  if (riskScore >= 0.3) return 'medium';
  return 'low';
}

/**
 * Checks if a file is a config file
 */
function isConfigFile(file: string): boolean {
  const configPatterns = [
    'package.json', 'tsconfig.json', 'next.config.js', 'tailwind.config.js',
    '.eslintrc', 'prettier.config', 'jest.config', 'webpack.config',
    '.env', 'dockerfile', 'docker-compose', '.github/', '.gitlab/',
  ];
  return configPatterns.some(p => file.toLowerCase().includes(p.toLowerCase()));
}

/**
 * Gets validator order
 */
function getValidatorOrder(validator: string): number {
  const order: Record<string, number> = {
    'Project Structure': 1,
    'Dependencies': 2,
    'Environment': 3,
    'Type Check': 4,
    'Lint': 5,
    'Formatting': 6,
    'Static Analysis': 7,
    'Build': 8,
    'Dev Server': 9,
    'Runtime Validation': 10,
  };
  return order[validator] || 99;
}

/**
 * Validates a repair plan before execution
 */
export function validateRepairPlan(
  plan: RepairPlan,
  graph: ErrorDependencyGraph,
  fileLocks: Map<string, FileLock>
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for locked files
  for (const patch of plan.patches) {
    const lock = fileLocks.get(patch.file);
    if (lock && lock.state === 'locked' && lock.ownerPatchId !== patch.id) {
      issues.push(`File ${patch.file} is locked by another patch (${lock.ownerPatchId})`);
    }
  }

  // Check for circular prerequisites
  if (hasCircularPrerequisites(plan.patches)) {
    issues.push('Circular prerequisite dependencies detected in plan');
  }

  // Check confidence thresholds
  const lowConfidencePatches = plan.patches.filter(p => p.confidence < 0.4);
  if (lowConfidencePatches.length > 0) {
    issues.push(`${lowConfidencePatches.length} patches have confidence below 40%`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Checks for circular prerequisites
 */
function hasCircularPrerequisites(patches: AtomicPatch[]): boolean {
  const patchMap = new Map(patches.map(p => [p.id, p]));
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(patchId: string): boolean {
    if (recStack.has(patchId)) return true;
    if (visited.has(patchId)) return false;

    visited.add(patchId);
    recStack.add(patchId);

    const patch = patchMap.get(patchId);
    if (patch) {
      for (const prereq of patch.prerequisites) {
        const prereqPatch = patches.find(p => p.file === prereq);
        if (prereqPatch && hasCycle(prereqPatch.id)) return true;
      }
    }

    recStack.delete(patchId);
    return false;
  }

  for (const patch of patches) {
    if (hasCycle(patch.id)) return true;
  }

  return false;
}

/**
 * Creates a rollback plan for a repair plan
 */
export function createRollbackPlan(plan: RepairPlan): RepairPlan {
  return {
    ...plan,
    id: `rollback-${plan.id}`,
    patches: plan.patches
      .filter(p => p.status === 'applied')
      .reverse()
      .map(p => ({
        ...p,
        id: `rollback-${p.id}`,
        description: `Rollback: ${p.description}`,
        status: 'pending' as const,
        prerequisites: [],
      })),
    status: 'planned',
    priority: 'critical',
    strategy: 'minimal-patch',
    createdAt: Date.now(),
  };
}

/**
 * Updates patch status
 */
export function updatePatchStatus(
  plan: RepairPlan,
  patchId: string,
  status: AtomicPatch['status']
): RepairPlan {
  return {
    ...plan,
    patches: plan.patches.map(p =>
      p.id === patchId ? { ...p, status, appliedAt: status === 'applied' ? Date.now() : p.appliedAt } : p
    ),
    status: plan.patches.every(p => p.status === 'applied') ? 'completed' : 'executing',
  };
}

export { DEFAULT_REPAIR_CONFIG };