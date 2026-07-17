// ─── core/sandbox/MockSandboxProvider.ts ─────────────────────────────────────
// In-memory mock sandbox for unit-testing orchestrator logic without Docker.
// Allows fully deterministic testing of state-machine transitions.

import {
  SandboxProvider,
  SandboxRunConfig,
  SandboxStartResult,
  SandboxExecResult,
  FilesystemSnapshot,
} from './SandboxProvider';

export interface MockSandboxBehavior {
  /** Whether start() should succeed. Default: true */
  startSucceeds?: boolean;
  /** Whether healthCheck() returns true. Default: true */
  healthyAfterStart?: boolean;
  /** Whether restart() should succeed. Default: true */
  restartSucceeds?: boolean;
  /** stdout/stderr for exec() calls */
  execResult?: SandboxExecResult;
  /** Simulated boot delay in ms */
  bootDelayMs?: number;
}

export class MockSandboxProvider implements SandboxProvider {
  readonly calls: { method: string; args: unknown[] }[] = [];
  private behavior: MockSandboxBehavior;
  private instances = new Map<string, { hostPort: number }>();
  private snapshots = new Map<string, FilesystemSnapshot[]>();

  constructor(behavior: MockSandboxBehavior = {}) {
    this.behavior = { startSucceeds: true, healthyAfterStart: true, ...behavior };
  }

  async start(config: SandboxRunConfig): Promise<SandboxStartResult> {
    this.calls.push({ method: 'start', args: [config] });
    if (this.behavior.bootDelayMs) {
      await new Promise((r) => setTimeout(r, this.behavior.bootDelayMs));
    }
    if (this.behavior.startSucceeds === false) {
      throw new Error('[MockSandbox] Simulated start failure');
    }
    const instanceId = `mock-${Date.now()}`;
    const hostPort = config.port ?? 3000;
    this.instances.set(instanceId, { hostPort });
    return { baseUrl: `http://localhost:${hostPort}`, instanceId, hostPort };
  }

  async exec(instanceId: string, command: string): Promise<SandboxExecResult> {
    this.calls.push({ method: 'exec', args: [instanceId, command] });
    return this.behavior.execResult ?? { stdout: '', stderr: '', exitCode: 0 };
  }

  async snapshot(instanceId: string): Promise<FilesystemSnapshot> {
    this.calls.push({ method: 'snapshot', args: [instanceId] });
    const snap: FilesystemSnapshot = { snapshotId: `snap-${Date.now()}`, timestamp: Date.now() };
    const existing = this.snapshots.get(instanceId) ?? [];
    existing.push(snap);
    this.snapshots.set(instanceId, existing);
    return snap;
  }

  async restore(instanceId: string, snapshotId: string): Promise<void> {
    this.calls.push({ method: 'restore', args: [instanceId, snapshotId] });
  }

  async restart(instanceId: string): Promise<void> {
    this.calls.push({ method: 'restart', args: [instanceId] });
    if (this.behavior.restartSucceeds === false) {
      throw new Error('[MockSandbox] Simulated restart failure');
    }
  }

  async stop(instanceId: string): Promise<void> {
    this.calls.push({ method: 'stop', args: [instanceId] });
    this.instances.delete(instanceId);
  }

  async healthCheck(instanceId: string, path?: string): Promise<boolean> {
    this.calls.push({ method: 'healthCheck', args: [instanceId, path] });
    return this.behavior.healthyAfterStart !== false;
  }

  /** For test assertions: get all calls to a specific method */
  callsTo(method: string): { method: string; args: unknown[] }[] {
    return this.calls.filter((c) => c.method === method);
  }
}
