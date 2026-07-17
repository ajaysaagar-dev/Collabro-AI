// ─── memory/working/index.ts ──────────────────────────────────────────────────
// Working memory tier — holds current run's task graph and live state.
// Backed by an in-process Map for dev/test; Redis-compatible interface
// so it can be swapped for ioredis in production.
//
// Lifetime: duration of one run. Cleared on run completion.

export interface WorkingMemoryStore {
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
  flush(runId: string): Promise<void>;
}

// ─── In-process implementation (default) ─────────────────────────────────────

interface Entry<T> {
  value: T;
  expiresAt?: number;
}

export class InProcessWorkingMemory implements WorkingMemoryStore {
  private store = new Map<string, Entry<unknown>>();

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const entry: Entry<T> = { value };
    if (ttlSeconds) entry.expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, entry as Entry<unknown>);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as Entry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flush(runId: string): Promise<void> {
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(`${runId}:`)) this.store.delete(key);
    }
  }
}

// ─── Typed working-memory helpers (used throughout the orchestrator) ──────────

export function runKey(runId: string, field: string): string {
  return `${runId}:${field}`;
}

/** Store the task graph produced by the Planner Agent */
export async function storeTaskGraph(
  mem: WorkingMemoryStore,
  runId: string,
  taskGraph: unknown[],
): Promise<void> {
  await mem.set(runKey(runId, 'taskGraph'), taskGraph, 900); // 15 min TTL
}

/** Retrieve the task graph */
export async function getTaskGraph(
  mem: WorkingMemoryStore,
  runId: string,
): Promise<unknown[] | null> {
  return mem.get(runKey(runId, 'taskGraph'));
}

/** Store live orchestrator state */
export async function storeRunState(
  mem: WorkingMemoryStore,
  runId: string,
  state: string,
): Promise<void> {
  await mem.set(runKey(runId, 'state'), state, 900);
}

export async function getRunState(
  mem: WorkingMemoryStore,
  runId: string,
): Promise<string | null> {
  return mem.get(runKey(runId, 'state'));
}

// Singleton for the current process
export const workingMemory: WorkingMemoryStore = new InProcessWorkingMemory();
