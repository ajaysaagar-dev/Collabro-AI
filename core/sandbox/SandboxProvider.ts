// ─── core/sandbox/SandboxProvider.ts ─────────────────────────────────────────
// Abstract sandbox interface (§4 of target.md).
// All sandbox implementations must adhere to this interface so that:
//   1. Orchestrator logic is unit-testable with MockSandboxProvider
//   2. DockerSandboxProvider (or Firecracker/E2B/Modal) can be swapped without touching agent code

export interface SandboxRunConfig {
  /** Absolute path to the project directory to mount */
  projectPath: string;
  /** Port the dev server will listen on inside the sandbox */
  port: number;
  /** Environment variables passed into the sandbox (scoped, not platform keys) */
  env?: Record<string, string>;
  /** Maximum CPU shares (relative weight, docker default 1024) */
  cpuShares?: number;
  /** Memory limit in MB */
  memoryMb?: number;
  /** Timeout in seconds for install + boot phases */
  timeoutSeconds?: number;
}

export interface SandboxStartResult {
  /** Sandbox-internal base URL the test agents should target */
  baseUrl: string;
  /** Unique sandbox instance ID (for logs, cleanup, diff) */
  instanceId: string;
  /** Port actually bound on the host (may differ from requested) */
  hostPort: number;
}

export interface SandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface FilesystemSnapshot {
  snapshotId: string;
  timestamp: number;
}

export interface SandboxProvider {
  /**
   * Create and start the sandbox: install deps, then boot dev server.
   * Returns as soon as the health-check endpoint responds.
   */
  start(config: SandboxRunConfig): Promise<SandboxStartResult>;

  /**
   * Run a command inside the running sandbox (non-destructive; for diagnostics).
   */
  exec(instanceId: string, command: string): Promise<SandboxExecResult>;

  /**
   * Snapshot the current filesystem state before a repair attempt.
   * Enables clean diff + rollback if the repair makes things worse.
   */
  snapshot(instanceId: string): Promise<FilesystemSnapshot>;

  /**
   * Restore to a previous snapshot (e.g. to diff a bad repair).
   */
  restore(instanceId: string, snapshotId: string): Promise<void>;

  /**
   * Restart the dev server inside the sandbox (after a repair patch).
   * Does NOT rebuild the container — only restarts the node process.
   */
  restart(instanceId: string): Promise<void>;

  /**
   * Destroy the sandbox entirely, freeing all resources.
   */
  stop(instanceId: string): Promise<void>;

  /**
   * Check whether the sandbox is healthy (dev server responding).
   */
  healthCheck(instanceId: string, path?: string): Promise<boolean>;
}
