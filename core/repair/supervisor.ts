// ─── Supervisor Agent ──────────────────────────────────────────────────────────
// Monitors the repair process and detects loops, regressions, and stagnation

import { ValidationError } from '@/orchestrator/validation';
import {
  SupervisorState,
  SupervisorDetection,
  SupervisorDetectionType,
  SupervisorAction,
  ErrorBudget,
  ProgressScore,
  StagnationDetection,
  RepairContext,
  RepairOrchestratorConfig,
  AtomicPatch,
  RootCauseAnalysis,
  ErrorFingerprint,
} from './types';

const DEFAULT_SUPERVISOR_CONFIG = {
  checkInterval: 1,
  stagnationThreshold: 3,
  errorBudgetImprovementThreshold: 0.15,
  maxCycles: 10,
  regressionThreshold: 0.3,
  oscillationThreshold: 2,
  deadlockTimeoutMs: 60000,
};

/**
 * Supervisor Agent - monitors and controls the repair process
 */
export class SupervisorAgent {
  private state: SupervisorState;
  private config: typeof DEFAULT_SUPERVISOR_CONFIG;
  private detectionHistory: SupervisorDetection[] = [];
  private lastCheckCycle = 0;

  constructor(config: Partial<typeof DEFAULT_SUPERVISOR_CONFIG> = {}) {
    this.config = { ...DEFAULT_SUPERVISOR_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  private createInitialState(): SupervisorState {
    return {
      cycleCount: 0,
      maxCycles: this.config.maxCycles,
      errorBudget: {
        cycle: 0,
        initialErrors: 0,
        currentErrors: 0,
        bestErrors: Infinity,
        stagnationCycles: 0,
        maxStagnationCycles: this.config.stagnationThreshold,
        improvementThreshold: this.config.errorBudgetImprovementThreshold,
      },
      progressScores: [],
      detections: [],
      lastAction: 'continue',
      paused: false,
      escalated: false,
    };
  }

  /**
   * Initializes error budget at start of repair
   */
  initialize(errorCount: number): void {
    this.state.errorBudget = {
      cycle: 1,
      initialErrors: errorCount,
      currentErrors: errorCount,
      bestErrors: errorCount,
      stagnationCycles: 0,
      maxStagnationCycles: this.config.stagnationThreshold,
      improvementThreshold: this.config.errorBudgetImprovementThreshold,
    };
    this.state.cycleCount = 0;
    this.state.progressScores = [];
    this.state.detections = [];
    this.state.paused = false;
    this.state.escalated = false;
  }

  /**
   * Called at the start of each repair cycle
   */
  onCycleStart(cycle: number): SupervisorAction {
    this.state.cycleCount = cycle;
    this.state.errorBudget.cycle = cycle;

    // Check if we should even continue
    if (cycle > this.config.maxCycles) {
      return this.takeAction('escalate', 'Max cycles exceeded');
    }

    return 'continue';
  }

  /**
   * Called after each repair cycle with results
   */
  onCycleComplete(
    cycle: number,
    errors: ValidationError[],
    previousErrors: ValidationError[],
    appliedPatches: AtomicPatch[],
    rolledBackPatches: AtomicPatch[]
 ): { action: SupervisorAction; detections: SupervisorDetection[] } {
    const detections: SupervisorDetection[] = [];

    // Update error budget
    this.updateErrorBudget(errors);

    // Calculate progress score
    const progressScore = this.calculateProgressScore(
      cycle,
      errors,
      previousErrors,
      appliedPatches,
      rolledBackPatches
    );
    this.state.progressScores.push(progressScore);

    // Run all detections
    detections.push(...this.detectRepairLoop(errors, previousErrors));
    detections.push(...this.detectOscillation(errors, previousErrors));
    detections.push(...this.detectRegressions(errors, previousErrors));
    detections.push(...this.detectDeadlock(appliedPatches));
    detections.push(...this.detectStarvation(errors));
    detections.push(...this.detectRepeatedPatches(appliedPatches));
    detections.push(...this.detectRepeatedValidators());
    detections.push(...this.detectRepeatedRewrites(appliedPatches));
    detections.push(...this.detectStagnation());

    // Store detections
    this.state.detections.push(...detections);
    this.detectionHistory.push(...detections);

    // Determine action based on detections
    const action = this.determineAction(detections, progressScore);
    this.state.lastAction = action;

    return { action, detections };
  }

  /**
   * Updates error budget with current errors
   */
  private updateErrorBudget(errors: ValidationError[]): void {
    this.state.errorBudget.currentErrors = errors.length;

    if (errors.length < this.state.errorBudget.bestErrors) {
      this.state.errorBudget.bestErrors = errors.length;
      this.state.errorBudget.stagnationCycles = 0;
      this.state.lastProgressTime = Date.now();
    } else {
      this.state.errorBudget.stagnationCycles++;
    }
  }

  /**
   * Calculates progress score for a cycle
   */
  private calculateProgressScore(
    cycle: number,
    errors: ValidationError[],
    previousErrors: ValidationError[],
    appliedPatches: AtomicPatch[],
    rolledBackPatches: AtomicPatch[]
  ): ProgressScore {
    const errorsFixed = previousErrors.length - errors.length;
    const regressions = rolledBackPatches.length;
    const newErrors = Math.max(0, errors.length - previousErrors.length + errorsFixed);

    // Count validators passed (simplified)
    const validatorsTotal = 10; // Would come from validation pipeline
    const validatorsPassed = validatorsTotal - Math.min(validatorsTotal, errors.length);

    const patchesApplied = appliedPatches.length;
    const patchesRolledBack = rolledBackPatches.length;

    // Calculate overall score
    let score = 50; // Base

    // Positive factors
    score += errorsFixed * 5;
    score += validatorsPassed * 3;
    score += patchesApplied * 2;

    // Negative factors
    score -= regressions * 10;
    score -= newErrors * 5;
    score -= patchesRolledBack * 8;

    // Normalize to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine trend
    let trend: ProgressScore['trend'] = 'stable';
    if (this.state.progressScores.length >= 2) {
      const prevScore = this.state.progressScores[this.state.progressScores.length - 1].overallScore;
      if (score > prevScore + 5) trend = 'improving';
      else if (score < prevScore - 5) trend = 'degrading';
    }

    return {
      cycle,
      timestamp: Date.now(),
      errorsFixed,
      regressions,
      newErrors,
      validatorsPassed,
      validatorsTotal,
      patchesApplied,
      patchesRolledBack,
      overallScore: score,
      trend,
    };
  }

  /**
   * Detects repair loops (same errors recurring)
   */
  private detectRepairLoop(
    errors: ValidationError[],
    previousErrors: ValidationError[]
  ): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    // Create fingerprint sets
    const currentFingerprints = new Set(errors.map(e => this.fingerprintError(e)));
    const previousFingerprints = new Set(previousErrors.map(e => this.fingerprintError(e)));

    // Find recurring errors
    let recurring = 0;
    for (const fp of currentFingerprints) {
      if (previousFingerprints.has(fp)) {
        recurring++;
      }
    }

    const recurrenceRate = previousFingerprints.size > 0 ? recurring / previousFingerprints.size : 0;

    if (recurrenceRate > 0.5 && recurring > 3) {
      detections.push({
        type: 'repair-loop',
        detected: true,
        severity: recurrenceRate > 0.8 ? 'critical' : 'warning',
        description: `${recurring} errors recurring (${(recurrenceRate * 100).toFixed(0)}% recurrence rate)`,
        evidence: [`Recurring errors: ${recurring}`, `Previous unique errors: ${previousFingerprints.size}`],
        recommendedAction: 'change-strategy',
        timestamp: Date.now(),
      });
    }

    return detections;
  }

  /**
   * Detects oscillation (errors appearing/disappearing)
   */
  private detectOscillation(
    errors: ValidationError[],
    previousErrors: ValidationError[]
  ): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    // Check if we have enough history
    if (this.state.progressScores.length < 3) return detections;

    // Look for error count oscillation
    const recentScores = this.state.progressScores.slice(-5);
    const errorCounts = recentScores.map(s => s.newErrors + s.regressions);

    let oscillations = 0;
    for (let i = 1; i < errorCounts.length; i++) {
      if ((errorCounts[i] > errorCounts[i - 1] && errorCounts[i - 1] < errorCounts[i - 2]) ||
          (errorCounts[i] < errorCounts[i - 1] && errorCounts[i - 1] > errorCounts[i - 2])) {
        oscillations++;
      }
    }

    if (oscillations >= this.config.oscillationThreshold) {
      detections.push({
        type: 'oscillation',
        detected: true,
        severity: oscillations >= 4 ? 'critical' : 'warning',
        description: `Error count oscillating (${oscillations} direction changes in recent cycles)`,
        evidence: [`Error counts: ${errorCounts.join(' -> ')}`],
        recommendedAction: 'change-strategy',
        timestamp: Date.now(),
      });
    }

    return detections;
  }

  /**
   * Detects regressions (new errors introduced)
   */
  private detectRegressions(
    errors: ValidationError[],
    previousErrors: ValidationError[]
  ): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    const currentFps = new Set(errors.map(e => this.fingerprintError(e)));
    const previousFps = new Set(previousErrors.map(e => this.fingerprintError(e)));

    // New errors not in previous
    const newErrors = [...currentFps].filter(fp => !previousFps.has(fp));

    if (newErrors.length > 0) {
      const regressionRate = newErrors.length / Math.max(1, previousFps.size);

      if (regressionRate > this.config.regressionThreshold) {
        detections.push({
          type: 'regression',
          detected: true,
          severity: regressionRate > 0.5 ? 'critical' : 'warning',
          description: `${newErrors.length} new errors introduced (regression rate: ${(regressionRate * 100).toFixed(0)}%)`,
          evidence: [`New errors: ${newErrors.length}`, `Previous errors: ${previousFps.size}`],
          recommendedAction: 'rollback',
          timestamp: Date.now(),
        });
      }
    }

    return detections;
  }

  /**
   * Detects deadlock (circular dependencies blocking progress)
   */
  private detectDeadlock(appliedPatches: AtomicPatch[]): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    // Check for circular patch dependencies
    const patchFiles = appliedPatches.map(p => p.file);
    const uniqueFiles = new Set(patchFiles);

    if (patchFiles.length > uniqueFiles.size * 2) {
      detections.push({
        type: 'deadlock',
        detected: true,
        severity: 'warning',
        description: 'Possible deadlock: same files being patched repeatedly',
        evidence: [`Patches: ${patchFiles.length}`, `Unique files: ${uniqueFiles.size}`],
        recommendedAction: 'change-strategy',
        timestamp: Date.now(),
      });
    }

    return detections;
  }

  /**
   * Detects starvation (some errors never addressed)
   */
  private detectStarvation(errors: ValidationError[]): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    // Group by validator
    const byValidator = new Map<string, number>();
    for (const error of errors) {
      byValidator.set(error.stage, (byValidator.get(error.stage) || 0) + 1);
    }

    // Check if some validators have consistently high errors
    for (const [validator, count] of byValidator) {
      if (count > 10 && this.state.cycleCount > 3) {
        detections.push({
          type: 'starvation',
          detected: true,
          severity: 'warning',
          description: `Validator "${validator}" has ${count} unaddressed errors after ${this.state.cycleCount} cycles`,
          evidence: [`${validator}: ${count} errors`, `Cycle: ${this.state.cycleCount}`],
          recommendedAction: 'change-strategy',
          timestamp: Date.now(),
        });
      }
    }

    return detections;
  }

  /**
   * Detects repeated patches on same files
   */
  private detectRepeatedPatches(appliedPatches: AtomicPatch[]): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    const filePatchCount = new Map<string, number>();
    for (const patch of appliedPatches) {
      filePatchCount.set(patch.file, (filePatchCount.get(patch.file) || 0) + 1);
    }

    for (const [file, count] of filePatchCount) {
      if (count >= 3) {
        detections.push({
          type: 'repeated-patches',
          detected: true,
          severity: count >= 5 ? 'critical' : 'warning',
          description: `File "${file}" patched ${count} times in this cycle`,
          evidence: [`File: ${file}`, `Patch count: ${count}`],
          recommendedAction: 'change-strategy',
          timestamp: Date.now(),
        });
      }
    }

    return detections;
  }

  /**
   * Detects repeated validators running
   */
  private detectRepeatedValidators(): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    // This would track which validators ran each cycle
    // For now, placeholder

    return detections;
  }

  /**
   * Detects repeated rewrites of same files
   */
  private detectRepeatedRewrites(appliedPatches: AtomicPatch[]): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    const rewriteStrategies = ['function-rewrite', 'module-rewrite', 'architecture-review'];
    const rewritePatches = appliedPatches.filter(p => rewriteStrategies.includes(p.strategy));

    if (rewritePatches.length > 2) {
      detections.push({
        type: 'repeated-rewrites',
        detected: true,
        severity: 'critical',
        description: `${rewritePatches.length} major rewrites in single cycle`,
        evidence: rewritePatches.map(p => `${p.strategy} on ${p.file}`),
        recommendedAction: 'architecture-review',
        timestamp: Date.now(),
      });
    }

    return detections;
  }

  /**
   * Detects stagnation (no progress over cycles)
   */
  private detectStagnation(): SupervisorDetection[] {
    const detections: SupervisorDetection[] = [];

    if (this.state.errorBudget.stagnationCycles >= this.config.stagnationThreshold) {
      detections.push({
        type: 'stagnation',
        detected: true,
        severity: 'critical',
        description: `No improvement for ${this.state.errorBudget.stagnationCycles} cycles`,
        evidence: [
          `Initial errors: ${this.state.errorBudget.initialErrors}`,
          `Best errors: ${this.state.errorBudget.bestErrors}`,
          `Current errors: ${this.state.errorBudget.currentErrors}`,
          `Stagnation cycles: ${this.state.errorBudget.stagnationCycles}`,
        ],
        recommendedAction: 'escalate',
        timestamp: Date.now(),
      });
    }

    return detections;
  }

  /**
   * Determines action based on detections
   */
  private determineAction(
    detections: SupervisorDetection[],
    progressScore: ProgressScore
  ): SupervisorAction {
    // Critical detections take priority
    const criticalDetections = detections.filter(d => d.severity === 'critical');

    if (criticalDetections.length > 0) {
      // Check for specific critical types
      if (criticalDetections.some(d => d.type === 'stagnation' || d.type === 'error-budget-exceeded')) {
        return 'escalate';
      }
      if (criticalDetections.some(d => d.type === 'regression')) {
        return 'rollback';
      }
      if (criticalDetections.some(d => d.type === 'repeated-rewrites')) {
        return 'architecture-review';
      }
      return 'change-strategy';
    }

    // Warning detections
    const warningDetections = detections.filter(d => d.severity === 'warning');
    if (warningDetections.length >= 3) {
      return 'change-strategy';
    }

    // Check progress trend
    if (progressScore.trend === 'degrading') {
      return 'change-strategy';
    }

    // Check if paused
    if (this.state.paused) {
      return 'pause';
    }

    return 'continue';
  }

  /**
   * Takes an action and updates state
   */
  private takeAction(action: SupervisorAction, reason: string): SupervisorAction {
    this.state.lastAction = action;

    switch (action) {
      case 'pause':
        this.state.paused = true;
        break;
      case 'rollback':
        // Trigger rollback in orchestrator
        break;
      case 'escalate':
        this.state.escalated = true;
        break;
      case 'architecture-review':
        this.state.escalated = true;
        break;
      case 'human-intervention':
        this.state.escalated = true;
        break;
    }

    console.log(`[Supervisor] Action: ${action} - ${reason}`);
    return action;
  }

  /**
   * Creates error fingerprint
   */
  private fingerprintError(error: ValidationError): string {
    return `${error.stage}|${error.file}|${error.line || 0}|${error.column || 0}|${error.message.substring(0, 50)}`;
  }

  /**
   * Gets current supervisor state
   */
  getState(): SupervisorState {
    return { ...this.state };
  }

  /**
   * Gets detection history
   */
  getDetections(): SupervisorDetection[] {
    return [...this.detectionHistory];
  }

  /**
   * Checks if repair should continue
   */
  shouldContinue(): boolean {
    return !this.state.paused && !this.state.escalated && this.state.cycleCount < this.config.maxCycles;
  }

  /**
   * Gets stagnation detection
   */
  getStagnation(): StagnationDetection {
    const currentErrors = this.state.errorBudget.currentErrors;
    const previousErrors = this.state.progressScores.length > 0
      ? this.state.errorBudget.initialErrors - this.state.progressScores[this.state.progressScores.length - 1].errorsFixed
      : this.state.errorBudget.initialErrors;

    return {
      detected: this.state.errorBudget.stagnationCycles >= this.config.stagnationThreshold,
      cyclesWithoutImprovement: this.state.errorBudget.stagnationCycles,
      errorCount: currentErrors,
      previousErrorCount: previousErrors,
      recommendation: this.state.errorBudget.stagnationCycles >= this.config.stagnationThreshold ? 'escalate' : 'continue',
    };
  }

  /**
   * Resumes from pause
   */
  resume(): void {
    this.state.paused = false;
  }

  /**
   * Resets supervisor
   */
  reset(): void {
    this.state = this.createInitialState();
    this.detectionHistory = [];
  }
}