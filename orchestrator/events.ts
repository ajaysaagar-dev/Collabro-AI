// ─── orchestrator/events.ts ──────────────────────────────────────────────────
// SSE event emitter for dashboard live pipeline view (§2 + §11 of target.md).
// Every state transition in stateMachine.ts calls into this module to broadcast
// structured events so the dashboard can show real-time pipeline progress.

import { TransitionRecord } from './stateMachine';

export type SSEEventType =
  | 'state_transition'
  | 'agent_start'
  | 'agent_complete'
  | 'agent_error'
  | 'file_written'
  | 'test_result'
  | 'repair_attempt'
  | 'budget_snapshot'
  | 'token_usage'
  | 'run_complete'
  | 'log';

export interface SSEPayload {
  type: SSEEventType;
  runId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface AgentStartEvent {
  agent: string;
  taskId: string;
  description: string;
}

export interface AgentCompleteEvent {
  agent: string;
  taskId: string;
  duration: number;
  tokensUsed?: number;
  cost?: number;
}

export interface TokenUsageEvent {
  agent: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  costUsd: number;
}

// ─── In-process SSE broker ────────────────────────────────────────────────────

type Listener = (payload: SSEPayload) => void;

class SSEEventBroker {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(runId: string, listener: Listener): () => void {
    let set = this.listeners.get(runId);
    if (!set) {
      set = new Set();
      this.listeners.set(runId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(runId);
    };
  }

  emit(payload: SSEPayload): void {
    const set = this.listeners.get(payload.runId);
    if (set) {
      for (const l of set) {
        try { l(payload); } catch { /* never crash the pipeline */ }
      }
    }
  }

  /** Serialize an SSEPayload to the wire format: "data: <json>\n\n" */
  static format(payload: SSEPayload): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
  }
}

export const sseBroker = new SSEEventBroker();

// ─── Helper emitters (used by orchestrator and agents) ────────────────────────

export function emitTransition(runId: string, record: TransitionRecord): void {
  sseBroker.emit({
    type: 'state_transition',
    runId,
    timestamp: record.timestamp,
    data: {
      from: record.from,
      to: record.to,
      event: record.event,
      budget: record.budgetSnapshot,
      notes: record.notes,
    },
  });
}

export function emitAgentStart(runId: string, event: AgentStartEvent): void {
  sseBroker.emit({
    type: 'agent_start',
    runId,
    timestamp: Date.now(),
    data: event as unknown as Record<string, unknown>,
  });
}

export function emitAgentComplete(runId: string, event: AgentCompleteEvent): void {
  sseBroker.emit({
    type: 'agent_complete',
    runId,
    timestamp: Date.now(),
    data: event as unknown as Record<string, unknown>,
  });
}

export function emitAgentError(runId: string, agent: string, error: string): void {
  sseBroker.emit({
    type: 'agent_error',
    runId,
    timestamp: Date.now(),
    data: { agent, error },
  });
}

export function emitFileWritten(runId: string, path: string, action: string): void {
  sseBroker.emit({
    type: 'file_written',
    runId,
    timestamp: Date.now(),
    data: { path, action },
  });
}

export function emitTestResult(
  runId: string,
  passed: boolean,
  failureCount: number,
  duration: number,
): void {
  sseBroker.emit({
    type: 'test_result',
    runId,
    timestamp: Date.now(),
    data: { passed, failureCount, duration },
  });
}

export function emitRepairAttempt(
  runId: string,
  loop: number,
  targetedFailures: string[],
  explanation: string,
): void {
  sseBroker.emit({
    type: 'repair_attempt',
    runId,
    timestamp: Date.now(),
    data: { loop, targetedFailures, explanation },
  });
}

export function emitTokenUsage(runId: string, event: TokenUsageEvent): void {
  sseBroker.emit({
    type: 'token_usage',
    runId,
    timestamp: Date.now(),
    data: event as unknown as Record<string, unknown>,
  });
}

export function emitLog(runId: string, level: string, message: string): void {
  sseBroker.emit({
    type: 'log',
    runId,
    timestamp: Date.now(),
    data: { level, message },
  });
}

export function emitRunComplete(
  runId: string,
  outcome: 'SUCCEEDED' | 'FAILED_BUDGET' | 'FAILED_FATAL',
  totalRepairLoops: number,
  totalTokens: number,
  totalCostUsd: number,
  durationMs: number,
): void {
  sseBroker.emit({
    type: 'run_complete',
    runId,
    timestamp: Date.now(),
    data: { outcome, totalRepairLoops, totalTokens, totalCostUsd, durationMs },
  });
}
