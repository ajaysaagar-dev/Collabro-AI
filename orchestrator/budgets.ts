// ─── orchestrator/budgets.ts ─────────────────────────────────────────────────
// Guard configuration for the orchestrator state machine (§2 of target.md).
// All limits are config-driven so they can be overridden per-run.

export interface BudgetConfig {
  /** Maximum repair → retest cycles before declaring FAILED_BUDGET */
  MAX_REPAIR_LOOPS: number;
  /** Wall-clock limit for an entire run in minutes */
  MAX_WALL_CLOCK_MINUTES: number;
  /** Maximum total tokens for one run (0 = unlimited) */
  MAX_TOKENS_PER_RUN: number;
  /** Maximum number of times the sandbox may be restarted */
  MAX_SANDBOX_RESTARTS: number;
  /** Maximum concurrent file-writing tasks in implementation phase */
  MAX_CONCURRENT_WRITERS: number;
}

export const DEFAULT_BUDGET: BudgetConfig = {
  MAX_REPAIR_LOOPS: 5,
  MAX_WALL_CLOCK_MINUTES: 15,
  MAX_TOKENS_PER_RUN: 0,
  MAX_SANDBOX_RESTARTS: 2,
  MAX_CONCURRENT_WRITERS: 8,
};

export class BudgetTracker {
  private config: BudgetConfig;
  private repairLoops = 0;
  private sandboxRestarts = 0;
  private totalTokens = 0;
  private startTime: number;

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = { ...DEFAULT_BUDGET, ...config };
    this.startTime = Date.now();
  }

  /** Call each time we enter a REPAIRING state */
  incrementRepairLoop(): void {
    this.repairLoops++;
  }

  /** Call each time the sandbox restarts */
  incrementSandboxRestart(): void {
    this.sandboxRestarts++;
  }

  /** Add tokens consumed by a model call */
  addTokens(n: number): void {
    this.totalTokens += n;
  }

  /** Returns true if any hard limit has been hit */
  isExhausted(): boolean {
    return (
      this.repairLoops >= this.config.MAX_REPAIR_LOOPS ||
      this.sandboxRestarts >= this.config.MAX_SANDBOX_RESTARTS ||
      this.wallClockMinutes() >= this.config.MAX_WALL_CLOCK_MINUTES ||
      (this.config.MAX_TOKENS_PER_RUN > 0 && this.totalTokens >= this.config.MAX_TOKENS_PER_RUN)
    );
  }

  /** Returns the reason budgets were exceeded, or null if still within budget */
  exhaustionReason(): string | null {
    if (this.repairLoops >= this.config.MAX_REPAIR_LOOPS)
      return `MAX_REPAIR_LOOPS (${this.config.MAX_REPAIR_LOOPS}) reached`;
    if (this.sandboxRestarts >= this.config.MAX_SANDBOX_RESTARTS)
      return `MAX_SANDBOX_RESTARTS (${this.config.MAX_SANDBOX_RESTARTS}) reached`;
    if (this.wallClockMinutes() >= this.config.MAX_WALL_CLOCK_MINUTES)
      return `MAX_WALL_CLOCK_MINUTES (${this.config.MAX_WALL_CLOCK_MINUTES}) reached`;
    if (this.config.MAX_TOKENS_PER_RUN > 0 && this.totalTokens >= this.config.MAX_TOKENS_PER_RUN)
      return `MAX_TOKENS_PER_RUN (${this.config.MAX_TOKENS_PER_RUN}) reached`;
    return null;
  }

  snapshot() {
    return {
      repairLoops: this.repairLoops,
      sandboxRestarts: this.sandboxRestarts,
      totalTokens: this.totalTokens,
      elapsedMinutes: this.wallClockMinutes(),
      config: this.config,
    };
  }

  private wallClockMinutes(): number {
    return (Date.now() - this.startTime) / 60_000;
  }
}
