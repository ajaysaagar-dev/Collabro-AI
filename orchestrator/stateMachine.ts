// ─── orchestrator/stateMachine.ts ────────────────────────────────────────────
// Typed state machine for the orchestrator pipeline (§2 of target.md).
// Every state transition is explicit, bounded by BudgetTracker guards,
// and emits a structured SSE event to the dashboard.

import { BudgetTracker, BudgetConfig } from './budgets';

// ─── States ──────────────────────────────────────────────────────────────────

export type OrchestratorState =
  | 'IDLE'
  | 'PLANNING'       // Planner Agent produces task graph
  | 'GENERATING'     // Coder Agent writes/edits files
  | 'STATIC_REVIEW'  // Reviewer Agent + linters/Semgrep before execution
  | 'PROVISIONING'   // Sandbox container created, deps installed
  | 'STARTING'       // Dev server boot, health-check polling
  | 'TESTING'        // Selenium/Playwright run against template manifest
  | 'CLASSIFYING'    // Failures bucketed into FailureReport categories
  | 'REPAIRING'      // Repair Agent patches code, bounded by retry budget
  | 'RETESTING'      // Back to TESTING with same sandbox generation
  | 'SUCCEEDED'
  | 'FAILED_BUDGET'  // Retry/time/cost budget exhausted — partial report returned
  | 'FAILED_FATAL';  // Unrecoverable (sandbox crash twice, reviewer block, etc.)

// ─── Events ──────────────────────────────────────────────────────────────────

export type OrchestratorEvent =
  | { type: 'START'; requestText: string; budgetConfig?: Partial<BudgetConfig> }
  | { type: 'PLAN_COMPLETE' }
  | { type: 'GENERATE_COMPLETE' }
  | { type: 'REVIEW_APPROVED' }
  | { type: 'REVIEW_BLOCKED'; reason: string }
  | { type: 'REVIEW_CHANGES_REQUESTED'; issues: string[] }
  | { type: 'SANDBOX_READY' }
  | { type: 'SANDBOX_FAILED'; error: string }
  | { type: 'SERVER_READY'; url: string }
  | { type: 'SERVER_FAILED'; error: string }
  | { type: 'TESTS_PASSED' }
  | { type: 'TESTS_FAILED'; failureCount: number }
  | { type: 'CLASSIFIED'; categories: string[] }
  | { type: 'REPAIR_COMPLETE'; editCount: number }
  | { type: 'REPAIR_FAILED'; error: string }
  | { type: 'BUDGET_EXHAUSTED'; reason: string }
  | { type: 'FATAL_ERROR'; error: string };

// ─── Transition log entry ────────────────────────────────────────────────────

export interface TransitionRecord {
  from: OrchestratorState;
  to: OrchestratorState;
  event: OrchestratorEvent;
  timestamp: number;
  budgetSnapshot: ReturnType<BudgetTracker['snapshot']>;
  notes?: string;
}

// ─── State Machine ────────────────────────────────────────────────────────────

export class OrchestratorStateMachine {
  private state: OrchestratorState = 'IDLE';
  private budget: BudgetTracker;
  private history: TransitionRecord[] = [];
  private onTransition?: (record: TransitionRecord) => void;

  constructor(
    budgetConfig?: Partial<BudgetConfig>,
    onTransition?: (record: TransitionRecord) => void,
  ) {
    this.budget = new BudgetTracker(budgetConfig);
    this.onTransition = onTransition;
  }

  getState(): OrchestratorState {
    return this.state;
  }

  getBudget(): BudgetTracker {
    return this.budget;
  }

  getHistory(): TransitionRecord[] {
    return [...this.history];
  }

  isTerminal(): boolean {
    return (
      this.state === 'SUCCEEDED' ||
      this.state === 'FAILED_BUDGET' ||
      this.state === 'FAILED_FATAL'
    );
  }

  /** Attempt a state transition. Returns the new state or throws if invalid. */
  send(event: OrchestratorEvent): OrchestratorState {
    const from = this.state;
    let to: OrchestratorState;

    // Check budget guard on every transition (except terminal states)
    if (!this.isTerminal() && this.budget.isExhausted()) {
      to = 'FAILED_BUDGET';
      this.record(from, to, event, `Budget: ${this.budget.exhaustionReason()}`);
      this.state = to;
      return to;
    }

    to = this.resolveTransition(from, event);
    if (!to) {
      throw new Error(
        `[StateMachine] Invalid transition: ${from} + ${event.type}`,
      );
    }

    // Book-keeping for bounded loops
    if (to === 'REPAIRING') {
      this.budget.incrementRepairLoop();
    }
    if (to === 'PROVISIONING') {
      // Count sandbox restarts if we're re-provisioning after a failure
      if (from === 'STARTING' || from === 'FAILED_FATAL') {
        this.budget.incrementSandboxRestart();
      }
    }

    this.record(from, to, event);
    this.state = to;
    return to;
  }

  private resolveTransition(
    state: OrchestratorState,
    event: OrchestratorEvent,
  ): OrchestratorState {
    switch (state) {
      case 'IDLE':
        if (event.type === 'START') return 'PLANNING';
        break;

      case 'PLANNING':
        if (event.type === 'PLAN_COMPLETE') return 'GENERATING';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'GENERATING':
        if (event.type === 'GENERATE_COMPLETE') return 'STATIC_REVIEW';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'STATIC_REVIEW':
        if (event.type === 'REVIEW_APPROVED') return 'PROVISIONING';
        if (event.type === 'REVIEW_BLOCKED') return 'FAILED_FATAL'; // hard block
        if (event.type === 'REVIEW_CHANGES_REQUESTED') return 'GENERATING';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'PROVISIONING':
        if (event.type === 'SANDBOX_READY') return 'STARTING';
        if (event.type === 'SANDBOX_FAILED') return 'FAILED_FATAL';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'STARTING':
        if (event.type === 'SERVER_READY') return 'TESTING';
        if (event.type === 'SERVER_FAILED') return 'REPAIRING';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'TESTING':
        if (event.type === 'TESTS_PASSED') return 'SUCCEEDED';
        if (event.type === 'TESTS_FAILED') return 'CLASSIFYING';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'CLASSIFYING':
        if (event.type === 'CLASSIFIED') return 'REPAIRING';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'REPAIRING':
        if (event.type === 'REPAIR_COMPLETE') return 'RETESTING';
        if (event.type === 'REPAIR_FAILED') return 'FAILED_BUDGET';
        if (event.type === 'BUDGET_EXHAUSTED') return 'FAILED_BUDGET';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;

      case 'RETESTING':
        // RETESTING → TESTING decrements budget (tracked as a full loop)
        if (event.type === 'SERVER_READY') return 'TESTING';
        if (event.type === 'TESTS_PASSED') return 'SUCCEEDED';
        if (event.type === 'TESTS_FAILED') return 'CLASSIFYING';
        if (event.type === 'SANDBOX_FAILED') return 'FAILED_BUDGET';
        if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';
        break;
    }

    // Fallthrough — budget exhaustion check already done above
    if (event.type === 'BUDGET_EXHAUSTED') return 'FAILED_BUDGET';
    if (event.type === 'FATAL_ERROR') return 'FAILED_FATAL';

    throw new Error(
      `[StateMachine] No valid transition from "${state}" on event "${event.type}"`,
    );
  }

  private record(
    from: OrchestratorState,
    to: OrchestratorState,
    event: OrchestratorEvent,
    notes?: string,
  ): void {
    const record: TransitionRecord = {
      from,
      to,
      event,
      timestamp: Date.now(),
      budgetSnapshot: this.budget.snapshot(),
      notes,
    };
    this.history.push(record);
    this.onTransition?.(record);
  }
}
