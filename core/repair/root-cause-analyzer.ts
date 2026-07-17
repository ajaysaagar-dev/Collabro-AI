// ─── Root Cause Analyzer ───────────────────────────────────────────────────────
// Analyzes error dependency graphs to identify true root causes

import { ValidationError } from '@/orchestrator/validation';
import {
  RootCauseAnalysis,
  RootCauseCandidate,
  RootCauseConfig,
  RepairStrategy,
  FixStrategy,
  ErrorDependencyGraph,
  ErrorNode,
  RepairPlan,
  AtomicPatch,
  RepairContext
} from './types';

const DEFAULT_CONFIG: RootCauseConfig = {
  minRootCauseScore: 0.3,
  maxRootCauses: 5,
  requireDependencyEvidence: true,
  preferEarlyValidators: true,
  preferConfigFiles: true,
  clusterWeight: 0.4,
  dependencyWeight: 0.3,
  frequencyWeight: 0.2,
  severityWeight: 0.1,
};

/**
 * Analyzes the error dependency graph to identify root causes
 */
export function analyzeRootCauses(
  graph: ErrorDependencyGraph,
  config: RootCauseConfig = DEFAULT_CONFIG
): RootCauseAnalysis {
  const candidates = findRootCauseCandidates(graph, config);
  const rankedCandidates = rankCandidates(candidates, graph, config);
  const rootCauses = selectRootCauses(rankedCandidates, config);
  const explanation = buildExplanation(rootCauses, graph);
  const confidence = calculateConfidence(rootCauses, graph);

  return {
    rootCauses,
    allCandidates: rankedCandidates,
    explanation,
    confidence,
    analyzedAt: Date.now(),
  };
}

/**
 * Finds all potential root cause candidates
 */
function findRootCauseCandidates(
  graph: ErrorDependencyGraph,
  config: RootCauseConfig
): RootCauseCandidate[] {
  const candidates: RootCauseCandidate[] = [];

  // Check each node
  for (const [nodeId, node] of graph.nodes) {
    const score = calculateRootCauseScore(node, graph, config);
    if (score >= config.minRootCauseScore) {
      candidates.push({
        nodeId,
        score,
        reasons: generateReasons(node, graph, config),
        error: node.error,
      });
    }
  }

  // Also check cluster-level root causes
  for (const cluster of graph.clusters) {
    if (cluster.rootCauseCandidates.length > 0) {
      for (const candidate of cluster.rootCauseCandidates) {
        // Merge with node-level candidate if exists
        const existing = candidates.find(c => c.nodeId === candidate.nodeId);
        if (existing) {
          existing.score = Math.max(existing.score, candidate.score);
          existing.reasons.push(...candidate.reasons);
        } else {
          candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
}

/**
 * Calculates root cause score for a node
 */
function calculateRootCauseScore(
  node: ErrorNode,
  graph: ErrorDependencyGraph,
  config: RootCauseConfig
): number {
  let score = 0;

  // 1. Dependency analysis (fewer dependencies = more likely root cause)
  const dependencyScore = calculateDependencyScore(node, graph);
  score += dependencyScore * config.dependencyWeight;

  // 2. Cluster analysis (being in a cluster as root)
  const clusterScore = calculateClusterScore(node, graph);
  score += clusterScore * config.clusterWeight;

  // 3. Frequency analysis (recurring errors)
  const frequencyScore = calculateFrequencyScore(node);
  score += frequencyScore * config.frequencyWeight;

  // 4. Severity analysis
  const severityScore = calculateSeverityScore(node);
  score += severityScore * config.severityWeight;

  // 5. Validator hierarchy bonus
  if (config.preferEarlyValidators) {
    const validatorOrder = getValidatorOrder(node.error.stage);
    if (validatorOrder <= 4) {
      score += 0.1 * (5 - validatorOrder);
    }
  }

  // 6. Config file bonus
  if (config.preferConfigFiles && isConfigFile(node.error.file)) {
    score += 0.15;
  }

  return Math.min(1.0, score);
}

/**
 * Calculates score based on dependency structure
 */
function calculateDependencyScore(node: ErrorNode, graph: ErrorDependencyGraph): number {
  const depCount = node.dependencies.length;
  const dependentCount = node.dependents.length;

  // No dependencies = high root cause probability
  if (depCount === 0) {
    // But if it has many dependents, even higher
    if (dependentCount > 5) return 0.9;
    if (dependentCount > 0) return 0.7;
    return 0.5; // isolated error
  }

  // Few dependencies, many dependents = likely root cause
  if (depCount <= 2 && dependentCount > 3) return 0.8;
  if (depCount <= 3 && dependentCount > 1) return 0.6;

  // Many dependencies = likely symptom
  return Math.max(0.1, 1.0 - (depCount * 0.15));
}

/**
 * Calculates score based on cluster membership
 */
function calculateClusterScore(node: ErrorNode, graph: ErrorDependencyGraph): number {
  if (!node.clusterId) return 0;

  const cluster = graph.clusters.find(c => c.id === node.clusterId);
  if (!cluster) return 0;

  // If this node is marked as root cause candidate in cluster
  const isClusterRoot = cluster.rootCauseCandidates.some(c => c.nodeId === node.id);
  if (isClusterRoot) return 0.8;

  // If cluster is validator-type and this is the first validator error
  if (cluster.type === 'validator') {
    const validatorErrors = cluster.errors.filter(e => e.stage === cluster.validator);
    if (validatorErrors.length > 0) {
      const firstError = validatorErrors.reduce((earliest, curr) =>
        (curr.line || 0) < (earliest.line || 0) ? curr : earliest
      );
      if (firstError === node.error) return 0.6;
    }
  }

  return 0.2;
}

/**
 * Calculates score based on error frequency
 */
function calculateFrequencyScore(node: ErrorNode): number {
  // This would come from fingerprinting - placeholder for now
  // In reality, this would check how many cycles this error has appeared in
  return node.error.severity === 'error' ? 0.3 : 0.1;
}

/**
 * Calculates score based on severity
 */
function calculateSeverityScore(node: ErrorNode): number {
  return node.error.severity === 'error' ? 0.4 : 0.1;
}

/**
 * Generates human-readable reasons for root cause candidacy
 */
function generateReasons(
  node: ErrorNode,
  graph: ErrorDependencyGraph,
  config: RootCauseConfig
): string[] {
  const reasons: string[] = [];

  if (node.dependencies.length === 0) {
    reasons.push('No dependencies (independent error)');
  } else if (node.dependencies.length <= 2) {
    reasons.push(`Few dependencies (${node.dependencies.length})`);
  }

  if (node.dependents.length > 5) {
    reasons.push(`Many dependents (${node.dependents.length} errors depend on this)`);
  } else if (node.dependents.length > 0) {
    reasons.push(`Has ${node.dependents.length} dependent errors`);
  }

  const validatorOrder = getValidatorOrder(node.error.stage);
  if (validatorOrder <= 3) {
    reasons.push(`Early validation stage (${node.error.stage})`);
  }

  if (isConfigFile(node.error.file)) {
    reasons.push('Configuration file (often root cause)');
  }

  if (node.clusterId) {
    const cluster = graph.clusters.find(c => c.id === node.clusterId);
    if (cluster) {
      reasons.push(`Part of ${cluster.type} cluster (${cluster.errors.length} errors)`);
    }
  }

  if (node.error.message.includes('import') || node.error.message.includes('module')) {
    reasons.push('Import/module resolution error');
  }

  if (node.error.message.includes('type') || node.error.message.includes('TS')) {
    reasons.push('TypeScript type error (often cascades)');
  }

  return reasons;
}

/**
 * Ranks candidates by score
 */
function rankCandidates(
  candidates: RootCauseCandidate[],
  graph: ErrorDependencyGraph,
  config: RootCauseConfig
): RootCauseCandidate[] {
  return candidates
    .map(c => ({
      ...c,
      // Add tiebreaker: prefer errors that fix more other errors
      tiebreaker: calculateTiebreaker(c, graph),
    }))
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) {
        return b.score - a.score;
      }
      return b.tiebreaker - a.tiebreaker;
    });
}

/**
 * Tiebreaker: how many errors would be fixed by fixing this one
 */
function calculateTiebreaker(candidate: RootCauseCandidate, graph: ErrorDependencyGraph): number {
  const node = graph.nodes.get(candidate.nodeId);
  if (!node) return 0;

  // Count all transitive dependents
  let count = 0;
  const visited = new Set<string>();

  function countDependents(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const n = graph.nodes.get(nodeId);
    if (!n) return;

    count += n.dependents.length;
    for (const depId of n.dependents) {
      countDependents(depId);
    }
  }

  countDependents(candidate.nodeId);
  return count;
}

/**
 * Selects top root causes
 */
function selectRootCauses(
  rankedCandidates: RootCauseCandidate[],
  config: RootCauseConfig
): RootCauseCandidate[] {
  return rankedCandidates
    .filter(c => c.score >= config.minRootCauseScore)
    .slice(0, config.maxRootCauses);
}

/**
 * Builds explanation string
 */
function buildExplanation(
  rootCauses: RootCauseCandidate[],
  graph: ErrorDependencyGraph
): string {
  if (rootCauses.length === 0) {
    return 'No clear root causes identified. Errors appear to be independent or form circular dependencies.';
  }

  const lines = ['Root Cause Analysis Results:', ''];

  for (let i = 0; i < rootCauses.length; i++) {
    const rc = rootCauses[i];
    lines.push(`${i + 1}. ${rc.error.stage} in ${rc.error.file}${rc.error.line ? `:${rc.error.line}` : ''}`);
    lines.push(`   Root Cause Score: ${(rc.score * 100).toFixed(0)}%`);
    lines.push(`   Reasons: ${rc.reasons.join('; ')}`);
    lines.push(`   Error: ${rc.error.message.substring(0, 120)}...`);
    lines.push('');
  }

  // Add summary
  const totalErrors = graph.nodes.size;
  const clusteredErrors = Array.from(graph.nodes.values()).filter(n => n.clusterId).length;
  const rootCauseErrors = rootCauses.length;

  lines.push('Summary:');
  lines.push(`- Total Errors: ${totalErrors}`);
  lines.push(`- Clustered Errors: ${clusteredErrors}`);
  lines.push(`- Root Causes Identified: ${rootCauseErrors}`);
  lines.push(`- Estimated Coverage: ${Math.min(100, Math.round((rootCauseErrors / totalErrors) * 100 * 3))}% of errors may resolve by fixing root causes`);

  return lines.join('\n');
}

/**
 * Calculates confidence in the analysis
 */
function calculateConfidence(
  rootCauses: RootCauseCandidate[],
  graph: ErrorDependencyGraph
): number {
  if (rootCauses.length === 0) return 0.1;

  const topScore = rootCauses[0].score;
  const scoreGap = rootCauses.length > 1 ? rootCauses[0].score - rootCauses[1].score : topScore;
  const clusterCoverage = graph.clusters.length > 0 ? 0.8 : 0.4;
  const hasConfigRootCause = rootCauses.some(rc => isConfigFile(rc.error.file));

  let confidence = 0.3; // base

  confidence += topScore * 0.3;
  confidence += Math.min(scoreGap, 0.3) * 0.5;
  confidence += clusterCoverage * 0.1;
  if (hasConfigRootCause) confidence += 0.1;

  return Math.min(0.95, confidence);
}

/**
 * Determines the best repair strategy for a root cause
 */
export function determineRepairStrategy(
  rootCause: RootCauseCandidate,
  graph: ErrorDependencyGraph
): RepairStrategy {
  const error = rootCause.error;
  const file = error.file;

  // Strategy selection based on error type and context
  if (isConfigFile(file)) {
    return 'config-fix';
  }

  if (error.message.includes('import') || error.message.includes('module')) {
    return 'import-fix';
  }

  if (error.message.includes('type') || error.stage === 'Type Check') {
    return 'type-fix';
  }

  if (error.stage === 'Lint') {
    return 'lint-fix';
  }

  if (error.stage === 'Build') {
    return 'build-fix';
  }

  if (error.stage === 'Dependencies') {
    return 'dependency-fix';
  }

  // Default to minimal patch
  return 'minimal-patch';
}

/**
 * Generates a fix strategy for a root cause
 */
export function generateFixStrategy(
  rootCause: RootCauseCandidate,
  strategy: RepairStrategy,
  graph: ErrorDependencyGraph
): FixStrategy {
  const error = rootCause.error;

  const strategies: Record<RepairStrategy, FixStrategy> = {
    'config-fix': {
      type: 'config-fix',
      description: `Fix configuration in ${error.file}`,
      approach: 'Modify configuration file to resolve cascading errors',
      steps: [
        `Analyze ${error.file} for misconfiguration`,
        'Apply minimal fix to resolve root issue',
        'Validate dependent files',
      ],
      estimatedFiles: [error.file],
      confidence: 0.9,
    },
    'import-fix': {
      type: 'import-fix',
      description: `Fix import/module resolution in ${error.file}`,
      approach: 'Correct import paths, add missing exports, or fix module resolution',
      steps: [
        'Identify broken import paths',
        'Resolve to correct file paths',
        'Add missing exports if needed',
        'Verify TypeScript resolution',
      ],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.85,
    },
    'type-fix': {
      type: 'type-fix',
      description: `Fix TypeScript type errors in ${error.file}`,
      approach: 'Add missing types, fix type mismatches, or add type annotations',
      steps: [
        'Analyze type error details',
        'Add explicit type annotations',
        'Fix generic type parameters',
        'Ensure type compatibility',
      ],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.8,
    },
    'lint-fix': {
      type: 'lint-fix',
      description: `Fix linting errors in ${error.file}`,
      approach: 'Apply eslint --fix or manual corrections',
      steps: [
        'Run eslint --fix on affected files',
        'Manually fix remaining issues',
        'Verify no regressions',
      ],
      estimatedFiles: [error.file],
      confidence: 0.95,
    },
    'build-fix': {
      type: 'build-fix',
      description: `Fix build errors in ${error.file}`,
      approach: 'Resolve compilation errors preventing build',
      steps: [
        'Identify build-blocking errors',
        'Fix syntax and type errors',
        'Resolve missing dependencies',
        'Run full build verification',
      ],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.75,
    },
    'dependency-fix': {
      type: 'dependency-fix',
      description: 'Fix dependency issues',
      approach: 'Install missing packages, resolve version conflicts',
      steps: [
        'Analyze package.json for missing deps',
        'Run npm install with correct versions',
        'Resolve peer dependency conflicts',
        'Verify lockfile integrity',
      ],
      estimatedFiles: ['package.json', 'package-lock.json'],
      confidence: 0.9,
    },
    'minimal-patch': {
      type: 'minimal-patch',
      description: `Apply minimal patch to ${error.file}`,
      approach: 'Make smallest possible change to fix the specific error',
      steps: [
        'Analyze exact error location',
        'Generate minimal fix',
        'Validate fix resolves error',
        'Check for regressions',
      ],
      estimatedFiles: [error.file],
      confidence: 0.7,
    },
    'ast-transform': {
      type: 'ast-transform',
      description: `Apply AST transformation to ${error.file}`,
      approach: 'Use AST-based code transformation for precise fixes',
      steps: [
        'Parse file into AST',
        'Locate error nodes',
        'Apply transformation',
        'Regenerate code',
      ],
      estimatedFiles: [error.file],
      confidence: 0.8,
    },
    'function-rewrite': {
      type: 'function-rewrite',
      description: `Rewrite problematic function in ${error.file}`,
      approach: 'Rewrite the specific function causing errors',
      steps: [
        'Identify problematic function',
        'Design corrected implementation',
        'Replace function',
        'Run validation',
      ],
      estimatedFiles: [error.file],
      confidence: 0.6,
    },
    'module-rewrite': {
      type: 'module-rewrite',
      description: `Rewrite module ${error.file}`,
      approach: 'Complete rewrite of the module with correct architecture',
      steps: [
        'Analyze module responsibilities',
        'Design new implementation',
        'Implement with tests',
        'Replace module',
      ],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.5,
    },
    'architecture-review': {
      type: 'architecture-review',
      description: 'Architectural redesign required',
      approach: 'Fundamental architecture changes needed',
      steps: [
        'Review overall architecture',
        'Identify design flaws',
        'Propose new architecture',
        'Plan migration',
      ],
      estimatedFiles: Array.from(graph.nodes.keys()).map(n => graph.nodes.get(n)!.error.file).slice(0, 10),
      confidence: 0.4,
    },
    'architecture-fix': {
      type: 'architecture-fix',
      description: `Architectural fix for ${error.file}`,
      approach: 'Fundamental redesign of architectural relations',
      steps: ['Review design', 'Refactor modules', 'Migrate'],
      estimatedFiles: [error.file],
      confidence: 0.5,
    },
  };

  return strategies[strategy] || strategies['minimal-patch'];
}

/**
 * Finds files related to a given file in the dependency graph
 */
function findRelatedFiles(file: string, graph: ErrorDependencyGraph): string[] {
  const node = Array.from(graph.nodes.values()).find(n => n.error.file === file);
  if (!node) return [];

  const related = new Set<string>();
  for (const depId of node.dependents) {
    const depNode = graph.nodes.get(depId);
    if (depNode) related.add(depNode.error.file);
  }
  for (const depId of node.dependencies) {
    const depNode = graph.nodes.get(depId);
    if (depNode) related.add(depNode.error.file);
  }

  return Array.from(related).slice(0, 5);
}

/**
 * Gets the order of a validator in the validation hierarchy
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
 * Checks if a file is a configuration file
 */
function isConfigFile(file: string): boolean {
  const configPatterns = [
    'package.json', 'tsconfig.json', 'next.config.js', 'tailwind.config.js',
    '.eslintrc', 'prettier.config', 'jest.config', 'webpack.config',
    '.env', 'dockerfile', 'docker-compose', '.github/', '.gitlab/',
  ];
  return configPatterns.some(p => file.toLowerCase().includes(p.toLowerCase()));
}

export { DEFAULT_CONFIG };
export type { RootCauseConfig, FixStrategy };