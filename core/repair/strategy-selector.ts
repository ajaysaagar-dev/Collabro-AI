// ─── Strategy Selector ─────────────────────────────────────────────────────────
// Rotates repair strategies when previous attempts fail

import { AgentRole } from '@/types/Agent';
import {
  RepairStrategy,
  StrategyAttempt,
  StrategySelection,
  FixStrategy,
  RootCauseCandidate,
  ErrorDependencyGraph,
  ErrorCluster,
  RepairOrchestratorConfig,
  AtomicPatch,
  ValidationError,
} from './types';

const STRATEGY_ORDER: RepairStrategy[] = [
  'minimal-patch',
  'ast-transform',
  'function-rewrite',
  'module-rewrite',
  'architecture-review',
];

const STRATEGY_METADATA: Partial<Record<RepairStrategy, {
  description: string;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  estimatedTimeMs: number;
  baseConfidence: number;
  applicableErrors: string[];
  requiresHumanReview: boolean;
}>> = {
  'minimal-patch': {
    description: 'Smallest possible change to fix the specific error',
    complexity: 'low',
    estimatedTimeMs: 10000,
    baseConfidence: 0.75,
    applicableErrors: ['type', 'lint', 'import', 'syntax'],
    requiresHumanReview: false,
  },
  'ast-transform': {
    description: 'AST-based code transformation for precise fixes',
    complexity: 'medium',
    estimatedTimeMs: 15000,
    baseConfidence: 0.80,
    applicableErrors: ['type', 'syntax', 'import', 'unused'],
    requiresHumanReview: false,
  },
  'function-rewrite': {
    description: 'Rewrite the specific function causing errors',
    complexity: 'medium',
    estimatedTimeMs: 30000,
    baseConfidence: 0.65,
    applicableErrors: ['type', 'logic', 'complexity'],
    requiresHumanReview: true,
  },
  'module-rewrite': {
    description: 'Complete rewrite of the problematic module',
    complexity: 'high',
    estimatedTimeMs: 60000,
    baseConfidence: 0.50,
    applicableErrors: ['architecture', 'circular', 'complexity', 'multiple'],
    requiresHumanReview: true,
  },
  'architecture-review': {
    description: 'Fundamental architecture redesign',
    complexity: 'critical',
    estimatedTimeMs: 120000,
    baseConfidence: 0.40,
    applicableErrors: ['systemic', 'circular', 'cascading', 'design-flaw'],
    requiresHumanReview: true,
  },
};

/**
 * Selects the next repair strategy based on previous attempts
 */
export function selectNextStrategy(
  rootCause: RootCauseCandidate,
  previousAttempts: StrategyAttempt[],
  config: RepairOrchestratorConfig,
  graph: ErrorDependencyGraph
): StrategySelection {
  // Get attempted strategies
  const attemptedStrategies = new Set(previousAttempts.map(a => a.strategy));

  // Find next untried strategy in order
  let nextStrategy: RepairStrategy | null = null;

  for (const strategy of config.strategyRotationOrder) {
    if (!attemptedStrategies.has(strategy)) {
      nextStrategy = strategy;
      break;
    }
  }

  // If all tried, escalate to architecture review
  if (!nextStrategy) {
    nextStrategy = 'architecture-review';
  }

  // Calculate confidence based on strategy and context
  const confidence = calculateStrategyConfidence(nextStrategy, rootCause, graph, previousAttempts);

  // Get previous attempts for this root cause
  const relevantAttempts = previousAttempts.filter(
    a => a.patchIds.some(pid => pid.includes(rootCause.nodeId))
  );

  // Determine max attempts
  const maxAttempts = config.maxRetriesPerStrategy;

  return {
    strategy: nextStrategy,
    reason: generateStrategyReason(nextStrategy, previousAttempts, rootCause),
    confidence,
    previousAttempts: relevantAttempts,
    maxAttempts,
  };
}

/**
 * Calculates confidence for a strategy
 */
function calculateStrategyConfidence(
  strategy: RepairStrategy,
  rootCause: RootCauseCandidate,
  graph: ErrorDependencyGraph,
  previousAttempts: StrategyAttempt[]
): number {
  const metadata = STRATEGY_METADATA[strategy] || STRATEGY_METADATA['minimal-patch']!;
  let confidence = metadata.baseConfidence;

  // Adjust based on error type match
  const errorType = classifyErrorType(rootCause.error);
  if (metadata.applicableErrors.some(e => errorType.includes(e))) {
    confidence += 0.1;
  }

  // Adjust based on previous failures
  const sameStrategyAttempts = previousAttempts.filter(a => a.strategy === strategy);
  if (sameStrategyAttempts.length > 0) {
    confidence -= 0.15 * sameStrategyAttempts.length;
  }

  // Adjust based on cluster size
  const cluster = graph.clusters.find(c => c.nodeIds.includes(rootCause.nodeId));
  if (cluster) {
    if (cluster.errors.length > 10) confidence -= 0.1;
    if (cluster.errors.length > 20) confidence -= 0.15;
  }

  // Adjust based on root cause score
  confidence += rootCause.score * 0.1;

  return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * Classifies error type from message
 */
function classifyErrorType(error: ValidationError): string[] {
  const types: string[] = [];
  const msg = error.message.toLowerCase();

  if (msg.includes('type') || msg.includes('ts')) types.push('type');
  if (msg.includes('lint') || msg.includes('eslint')) types.push('lint');
  if (msg.includes('import') || msg.includes('module') || msg.includes('cannot find')) types.push('import');
  if (msg.includes('syntax') || msg.includes('unexpected') || msg.includes('expected')) types.push('syntax');
  if (msg.includes('unused') || msg.includes('not used')) types.push('unused');
  if (msg.includes('circular') || msg.includes('cycle')) types.push('circular');
  if (msg.includes('build') || msg.includes('compile')) types.push('build');

  if (types.length === 0) types.push('unknown');

  return types;
}

/**
 * Generates human-readable reason for strategy selection
 */
function generateStrategyReason(
  strategy: RepairStrategy,
  previousAttempts: StrategyAttempt[],
  rootCause: RootCauseCandidate
): string {
  const metadata = STRATEGY_METADATA[strategy] || STRATEGY_METADATA['minimal-patch']!;
  const attempted = new Set(previousAttempts.map(a => a.strategy));

  if (attempted.size === 0) {
    return `First attempt: ${metadata.description}`;
  }

  const lastAttempt = previousAttempts[previousAttempts.length - 1];
  return `Previous strategy "${lastAttempt.strategy}" failed (${lastAttempt.result}). ` +
    `Trying "${strategy}": ${metadata.description}. ` +
    `Error type: ${classifyErrorType(rootCause.error).join(', ')}.`;
}

/**
 * Records a strategy attempt
 */
export function recordStrategyAttempt(
  strategy: RepairStrategy,
  patchIds: string[],
  result: 'success' | 'failure' | 'partial',
  errorsFixed: number,
  errorsIntroduced: number,
  regressions: number,
  duration: number
): StrategyAttempt {
  return {
    strategy,
    attemptNumber: 0, // Will be set by caller
    patchIds,
    result,
    errorsFixed,
    errorsIntroduced,
    regressions,
    duration,
    timestamp: Date.now(),
  };
}

/**
 * Analyzes strategy effectiveness
 */
export function analyzeStrategyEffectiveness(
  attempts: StrategyAttempt[]
): {
  bestStrategy: RepairStrategy | null;
  worstStrategy: RepairStrategy | null;
  successRateByStrategy: Record<RepairStrategy, number>;
  recommendation: string;
} {
  const byStrategy = new Map<RepairStrategy, StrategyAttempt[]>();

  for (const attempt of attempts) {
    if (!byStrategy.has(attempt.strategy)) {
      byStrategy.set(attempt.strategy, []);
    }
    byStrategy.get(attempt.strategy)!.push(attempt);
  }

  const successRateByStrategy: Record<RepairStrategy, number> = {} as any;
  let bestRate = -1;
  let worstRate = 2;
  let bestStrategy: RepairStrategy | null = null;
  let worstStrategy: RepairStrategy | null = null;

  for (const [strategy, attempts] of byStrategy) {
    const successCount = attempts.filter(a => a.result === 'success').length;
    const rate = successCount / attempts.length;
    successRateByStrategy[strategy] = rate;

    if (rate > bestRate) {
      bestRate = rate;
      bestStrategy = strategy;
    }
    if (rate < worstRate) {
      worstRate = rate;
      worstStrategy = strategy;
    }
  }

  let recommendation = '';
  if (bestStrategy && bestRate > 0.5) {
    recommendation = `Strategy "${bestStrategy}" has ${(bestRate * 100).toFixed(0)}% success rate. Consider prioritizing it.`;
  } else if (attempts.length > 5) {
    recommendation = 'Multiple strategies attempted with low success. Consider architecture review.';
  } else {
    recommendation = 'Insufficient data for recommendation. Continue current rotation.';
  }

  return {
    bestStrategy,
    worstStrategy,
    successRateByStrategy,
    recommendation,
  };
}

/**
 * Determines if we should escalate
 */
export function shouldEscalate(
  attempts: StrategyAttempt[],
  config: RepairOrchestratorConfig,
  currentStrategy: RepairStrategy
): { escalate: boolean; reason: string; nextAction: 'rotate' | 'architecture-review' | 'human' } {
  const currentAttempts = attempts.filter(a => a.strategy === currentStrategy);
  const totalAttempts = attempts.length;

  // Check max retries for current strategy
  if (currentAttempts.length >= config.maxRetriesPerStrategy) {
    const nextStrategyIndex = STRATEGY_ORDER.indexOf(currentStrategy) + 1;
    if (nextStrategyIndex < STRATEGY_ORDER.length) {
      return {
        escalate: true,
        reason: `Max retries (${config.maxRetriesPerStrategy}) reached for ${currentStrategy}`,
        nextAction: 'rotate',
      };
    } else {
      return {
        escalate: true,
        reason: 'All strategies exhausted',
        nextAction: 'architecture-review',
      };
    }
  }

  // Check total attempts
  if (totalAttempts >= config.maxCycles) {
    return {
      escalate: true,
      reason: `Total attempts (${totalAttempts}) exceeded max cycles (${config.maxCycles})`,
      nextAction: 'architecture-review',
    };
  }

  // Check for repeated failures across strategies
  const recentFailures = attempts.slice(-3).filter(a => a.result === 'failure');
  if (recentFailures.length >= 3) {
    return {
      escalate: true,
      reason: 'Three consecutive strategy failures',
      nextAction: 'rotate',
    };
  }

  // Check for regression introduction
  const totalRegressions = attempts.reduce((sum, a) => sum + a.regressions, 0);
  if (totalRegressions > attempts.length * 2) {
    return {
      escalate: true,
      reason: 'Too many regressions introduced across attempts',
      nextAction: 'human',
    };
  }

  return { escalate: false, reason: '', nextAction: 'rotate' };
}

/**
 * Gets strategy metadata
 */
export function getStrategyMetadata(strategy: RepairStrategy) {
  return STRATEGY_METADATA[strategy];
}

/**
 * Gets all strategies in order
 */
export function getStrategyOrder(): RepairStrategy[] {
  return [...STRATEGY_ORDER];
}