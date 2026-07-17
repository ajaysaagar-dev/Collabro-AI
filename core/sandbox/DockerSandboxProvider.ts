// ─── core/sandbox/DockerSandboxProvider.ts ───────────────────────────────────
// Docker-based sandbox implementation (§4 of target.md).
// Per-run isolation: no host network · resource limits · ephemeral overlay.
// Falls back gracefully if Docker is not available (returns a clear error).

import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';
import {
  SandboxProvider,
  SandboxRunConfig,
  SandboxStartResult,
  SandboxExecResult,
  FilesystemSnapshot,
} from './SandboxProvider';

const exec = promisify(execCb);

const DOCKER_IMAGE = 'node:22-alpine';
const HEALTH_CHECK_INTERVAL_MS = 2000;
const HEALTH_CHECK_MAX_ATTEMPTS = 60; // 2 min max

export class DockerSandboxProvider implements SandboxProvider {
  /** Map of instanceId → host port for health checking */
  private instances = new Map<string, { hostPort: number; containerId: string }>();

  async start(config: SandboxRunConfig): Promise<SandboxStartResult> {
    await this.ensureDockerAvailable();

    const instanceId = `collabro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const port = config.port ?? 3000;
    const hostPort = await this.findFreePort(port);
    const timeoutS = config.timeoutSeconds ?? 120;

    const envFlags = Object.entries(config.env ?? {})
      .map(([k, v]) => `-e ${k}="${v}"`)
      .join(' ');

    const memoryFlag = config.memoryMb ? `--memory=${config.memoryMb}m` : '';
    const cpuFlag = config.cpuShares ? `--cpu-shares=${config.cpuShares}` : '';

    // Mount project read-only, copy to writable workdir inside container
    const runCmd = [
      'docker run -d',
      `--name ${instanceId}`,
      `--network=collabro-sandbox`,       // isolated bridge network, no host access
      `-p 127.0.0.1:${hostPort}:${port}`, // only localhost binding — never 0.0.0.0
      `-v "${config.projectPath}:/workspace:ro"`, // read-only source mount
      `-w /app`,
      memoryFlag,
      cpuFlag,
      envFlags,
      `--pids-limit=512`,
      `--read-only --tmpfs /tmp --tmpfs /app`,
      DOCKER_IMAGE,
      `sh -c "cp -r /workspace/. /app && npm install --prefer-offline --no-audit 2>&1 && npm run dev 2>&1"`,
    ]
      .filter(Boolean)
      .join(' ');

    await this.ensureSandboxNetwork();

    const { stdout } = await exec(runCmd, { timeout: timeoutS * 1000 });
    const containerId = stdout.trim();
    this.instances.set(instanceId, { hostPort, containerId });

    // Poll health check
    const healthy = await this.pollHealth(`http://127.0.0.1:${hostPort}/`);
    if (!healthy) {
      await this.stop(instanceId);
      throw new Error(`[DockerSandbox] Server did not become healthy on port ${hostPort}`);
    }

    return { baseUrl: `http://127.0.0.1:${hostPort}`, instanceId, hostPort };
  }

  async exec(instanceId: string, command: string): Promise<SandboxExecResult> {
    const info = this.instances.get(instanceId);
    if (!info) throw new Error(`[DockerSandbox] Unknown instance: ${instanceId}`);

    try {
      const { stdout, stderr } = await exec(
        `docker exec ${info.containerId} sh -c "${command.replace(/"/g, '\\"')}"`,
        { timeout: 30_000 },
      );
      return { stdout, stderr, exitCode: 0 };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.code ?? 1 };
    }
  }

  async snapshot(instanceId: string): Promise<FilesystemSnapshot> {
    const info = this.instances.get(instanceId);
    if (!info) throw new Error(`[DockerSandbox] Unknown instance: ${instanceId}`);

    const snapshotId = `snap-${Date.now()}`;
    await exec(`docker commit ${info.containerId} ${instanceId}-${snapshotId}`);
    return { snapshotId, timestamp: Date.now() };
  }

  async restore(instanceId: string, snapshotId: string): Promise<void> {
    // To restore, we stop the current container and start a new one from the snapshot image
    const info = this.instances.get(instanceId);
    if (!info) throw new Error(`[DockerSandbox] Unknown instance: ${instanceId}`);
    await exec(`docker rm -f ${info.containerId}`);
    const { stdout } = await exec(
      `docker run -d --name ${instanceId}-restored --network=collabro-sandbox -p 127.0.0.1:${info.hostPort}:3000 ${instanceId}-${snapshotId}`,
    );
    info.containerId = stdout.trim();
  }

  async restart(instanceId: string): Promise<void> {
    const info = this.instances.get(instanceId);
    if (!info) throw new Error(`[DockerSandbox] Unknown instance: ${instanceId}`);
    // Kill the running npm process inside, container keeps running
    await exec(`docker exec ${info.containerId} sh -c "kill 1 2>/dev/null; npm run dev &"`);
    await this.pollHealth(`http://127.0.0.1:${info.hostPort}/`);
  }

  async stop(instanceId: string): Promise<void> {
    const info = this.instances.get(instanceId);
    if (!info) return;
    try {
      await exec(`docker rm -f ${info.containerId}`);
    } catch {
      // best-effort cleanup
    }
    this.instances.delete(instanceId);
  }

  async healthCheck(instanceId: string, path = '/'): Promise<boolean> {
    const info = this.instances.get(instanceId);
    if (!info) return false;
    return this.httpGet(`http://127.0.0.1:${info.hostPort}${path}`);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async ensureDockerAvailable(): Promise<void> {
    try {
      await exec('docker info', { timeout: 5000 });
    } catch {
      throw new Error(
        '[DockerSandbox] Docker is not running or not installed. ' +
          'Install Docker Desktop or Docker Engine to enable sandboxed execution.',
      );
    }
  }

  private async ensureSandboxNetwork(): Promise<void> {
    try {
      await exec('docker network inspect collabro-sandbox', { timeout: 5000 });
    } catch {
      // Network doesn't exist, create it with no external access
      await exec(
        'docker network create --internal --driver bridge collabro-sandbox',
        { timeout: 10_000 },
      );
    }
  }

  private async findFreePort(preferred: number): Promise<number> {
    // Try preferred port first, then increment
    for (let p = preferred; p < preferred + 100; p++) {
      try {
        await exec(`ss -tlnp | grep :${p}`);
        // Port in use, try next
      } catch {
        return p; // grep returns non-zero if no match → port is free
      }
    }
    throw new Error('[DockerSandbox] Could not find a free port');
  }

  private pollHealth(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        this.httpGet(url).then((ok) => {
          if (ok) return resolve(true);
          if (attempts >= HEALTH_CHECK_MAX_ATTEMPTS) return resolve(false);
          setTimeout(check, HEALTH_CHECK_INTERVAL_MS);
        });
      };
      setTimeout(check, HEALTH_CHECK_INTERVAL_MS);
    });
  }

  private httpGet(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 3000 }, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }
}
