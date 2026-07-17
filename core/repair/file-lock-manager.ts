// ─── File Lock Manager ─────────────────────────────────────────────────────────
// Manages file locks, lifecycles, and cooldowns to prevent concurrent edits and oscillation

import { AgentRole } from '@/types/Agent';
import {
  FileLock,
  FileLockState,
  FileLifecycle,
  FileLifecycleState,
  CooldownConfig,
  AtomicPatch,
  ErrorFingerprint,
} from './types';

const DEFAULT_COOLDOWN_CONFIG: CooldownConfig = {
  defaultCooldownMs: 30000,      // 30 seconds
  maxCooldownMs: 300000,         // 5 minutes
  escalationMultiplier: 2,
  rootCauseOverride: true,
};

const FILE_LIFECYCLE_TRANSITIONS: Record<FileLifecycleState, FileLifecycleState[]> = {
  'new': ['generated', 'error'],
  'generated': ['validating', 'error'],
  'validating': ['passed', 'error'],
  'passed': ['locked', 'frozen', 'cooldown'],
  'locked': ['frozen', 'cooldown', 'error'],
  'frozen': ['cooldown'],  // Only unlocked by root cause analyzer
  'cooldown': ['generated', 'validating'],
  'error': ['generated', 'cooldown'],
};

/**
 * File Lock Manager - manages file locking, lifecycle, and cooldowns
 */
export class FileLockManager {
  private locks = new Map<string, FileLock>();
  private lifecycles = new Map<string, FileLifecycle>();
  private cooldownConfig: CooldownConfig;
  private patchHistory = new Map<string, AtomicPatch[]>(); // file -> patches

  constructor(config: Partial<CooldownConfig> = {}) {
    this.cooldownConfig = { ...DEFAULT_COOLDOWN_CONFIG, ...config };
  }

  /**
   * Acquires a lock on a file for a patch
   */
  acquireLock(
    file: string,
    patchId: string,
    agent: AgentRole,
    reason: string,
    timeoutMs?: number
  ): { success: boolean; lock?: FileLock; error?: string } {
    const existingLock = this.locks.get(file);

    // Check if already locked by another patch
    if (existingLock && existingLock.state === 'locked' && existingLock.ownerPatchId !== patchId) {
      if (!existingLock.expiresAt || existingLock.expiresAt > Date.now()) {
        return {
          success: false,
          error: `File ${file} is locked by patch ${existingLock.ownerPatchId} (agent: ${existingLock.ownerAgent})`,
        };
      }
      // Lock expired, can acquire
    }

    // Check cooldown
    const lifecycle = this.getLifecycle(file);
    if (lifecycle && lifecycle.cooldownUntil && lifecycle.cooldownUntil > Date.now()) {
      const remaining = lifecycle.cooldownUntil - Date.now();
      return {
        success: false,
        error: `File ${file} is in cooldown for ${Math.ceil(remaining / 1000)}s`,
      };
    }

    // Check if frozen
    if (lifecycle && lifecycle.state === 'frozen') {
      return {
        success: false,
        error: `File ${file} is frozen: ${lifecycle.patchHistory.slice(-1)[0]?.patchId || 'unknown reason'}`,
      };
    }

    // Create lock
    const lock: FileLock = {
      file,
      state: 'locked',
      ownerPatchId: patchId,
      ownerAgent: agent,
      lockedAt: Date.now(),
      expiresAt: timeoutMs ? Date.now() + timeoutMs : undefined,
      reason,
    };

    this.locks.set(file, lock);
    this.updateLifecycle(file, 'locked');

    return { success: true, lock };
  }

  /**
   * Releases a lock
   */
  releaseLock(file: string, patchId: string): boolean {
    const lock = this.locks.get(file);
    if (!lock) return false;

    if (lock.ownerPatchId !== patchId) {
      // Only owner or admin can release
      return false;
    }

    this.locks.delete(file);
    this.updateLifecycle(file, 'passed');

    return true;
  }

  /**
   * Forces release of a lock (for rollback/escalation)
   */
  forceReleaseLock(file: string): boolean {
    const lock = this.locks.get(file);
    if (!lock) return false;

    this.locks.delete(file);
    this.updateLifecycle(file, 'cooldown');
    this.startCooldown(file);

    return true;
  }

  /**
   * Freezes a file (prevents further edits unless root cause override)
   */
  freezeFile(file: string, reason: string): boolean {
    const lock = this.locks.get(file);
    if (lock) {
      lock.state = 'frozen';
      lock.reason = reason;
    }

    this.updateLifecycle(file, 'frozen');
    return true;
  }

  /**
   * Unfreezes a file (only allowed by root cause analyzer)
   */
  unfreezeFile(file: string, rootCauseOverride: boolean = false): boolean {
    const lifecycle = this.getLifecycle(file);
    if (!lifecycle || lifecycle.state !== 'frozen') return false;

    if (!rootCauseOverride && !this.cooldownConfig.rootCauseOverride) {
      return false;
    }

    this.updateLifecycle(file, 'cooldown');
    this.startCooldown(file);

    const lock = this.locks.get(file);
    if (lock) {
      lock.state = 'cooldown';
    }

    return true;
  }

  /**
   * Starts cooldown period for a file
   */
  startCooldown(file: string, attemptNumber: number = 1): void {
    const lifecycle = this.getOrCreateLifecycle(file);
    const baseCooldown = this.cooldownConfig.defaultCooldownMs;
    const escalatedCooldown = baseCooldown * Math.pow(this.cooldownConfig.escalationMultiplier, attemptNumber - 1);
    const cooldown = Math.min(escalatedCooldown, this.cooldownConfig.maxCooldownMs);

    lifecycle.cooldownUntil = Date.now() + cooldown;
    this.updateLifecycle(file, 'cooldown');
  }

  /**
   * Checks if a file can be edited
   */
  canEdit(file: string, patchId?: string, rootCauseOverride: boolean = false): { allowed: boolean; reason?: string } {
    const lock = this.locks.get(file);
    const lifecycle = this.getLifecycle(file);

    // Check lock
    if (lock && lock.state === 'locked') {
      if (patchId && lock.ownerPatchId === patchId) {
        return { allowed: true }; // Owner can edit
      }
      if (lock.expiresAt && lock.expiresAt < Date.now()) {
        // Expired lock
        this.locks.delete(file);
      } else {
        return { allowed: false, reason: `Locked by ${lock.ownerAgent} (patch: ${lock.ownerPatchId})` };
      }
    }

    // Check frozen
    if (lifecycle && lifecycle.state === 'frozen') {
      if (rootCauseOverride && this.cooldownConfig.rootCauseOverride) {
        return { allowed: true };
      }
      return { allowed: false, reason: `File is frozen: ${lock?.reason || 'root cause resolution required'}` };
    }

    // Check cooldown
    if (lifecycle && lifecycle.cooldownUntil && lifecycle.cooldownUntil > Date.now()) {
      const remaining = lifecycle.cooldownUntil - Date.now();
      return { allowed: false, reason: `In cooldown for ${Math.ceil(remaining / 1000)}s` };
    }

    return { allowed: true };
  }

  /**
   * Records a patch application in history
   */
  recordPatch(file: string, patch: AtomicPatch): void {
    const history = this.patchHistory.get(file) || [];
    history.push(patch);
    this.patchHistory.set(file, history.slice(-20)); // Keep last 20

    const lifecycle = this.getOrCreateLifecycle(file);
    lifecycle.patchHistory.push({
      patchId: patch.id,
      appliedAt: Date.now(),
      success: patch.status === 'applied',
      validatorResults: {},
    });
  }

  /**
   * Records a patch rollback
   */
  recordRollback(file: string, patchId: string): void {
    const history = this.patchHistory.get(file);
    if (history) {
      const patch = history.find(p => p.id === patchId);
      if (patch) {
        patch.status = 'rolled-back';
        patch.rolledBackAt = Date.now();
      }
    }

    const lifecycle = this.getLifecycle(file);
    if (lifecycle) {
      const lastPatch = lifecycle.patchHistory[lifecycle.patchHistory.length - 1];
      if (lastPatch && lastPatch.patchId === patchId) {
        lastPatch.revertedAt = Date.now();
      }
    }

    // Start cooldown after rollback
    const attemptNumber = (this.patchHistory.get(file) || []).filter(p => p.status === 'rolled-back').length + 1;
    this.startCooldown(file, attemptNumber);
  }

  /**
   * Gets the lifecycle state of a file
   */
  getLifecycle(file: string): FileLifecycle | undefined {
    return this.lifecycles.get(file);
  }

  /**
   * Gets or creates lifecycle
   */
  private getOrCreateLifecycle(file: string): FileLifecycle {
    let lifecycle = this.lifecycles.get(file);
    if (!lifecycle) {
      lifecycle = {
        file,
        state: 'new',
        ownerAgent: 'manager',
        patchHistory: [],
      };
      this.lifecycles.set(file, lifecycle);
    }
    return lifecycle;
  }

  /**
   * Updates lifecycle state
   */
  public updateLifecycle(file: string, state: FileLifecycleState): void {
    const lifecycle = this.getOrCreateLifecycle(file);
    const validTransitions = FILE_LIFECYCLE_TRANSITIONS[lifecycle.state] || [];

    if (!validTransitions.includes(state) && state !== lifecycle.state) {
      console.warn(`[FileLockManager] Invalid lifecycle transition: ${lifecycle.state} -> ${state} for ${file}`);
    }

    lifecycle.state = state;
    switch (state) {
      case 'generated':
        lifecycle.generatedAt = Date.now();
        break;
      case 'validating':
        // No timestamp
        break;
      case 'passed':
        lifecycle.validatedAt = Date.now();
        break;
      case 'locked':
        lifecycle.lockedAt = Date.now();
        break;
      case 'frozen':
        lifecycle.frozenAt = Date.now();
        break;
    }
  }

  /**
   * Gets all locks
   */
  getAllLocks(): FileLock[] {
    return Array.from(this.locks.values());
  }

  /**
   * Gets all lifecycles
   */
  getAllLifecycles(): FileLifecycle[] {
    return Array.from(this.lifecycles.values());
  }

  /**
   * Gets files in cooldown
   */
  getFilesInCooldown(): string[] {
    const now = Date.now();
    return Array.from(this.lifecycles.entries())
      .filter(([, lifecycle]) => lifecycle.cooldownUntil && lifecycle.cooldownUntil > now)
      .map(([file]) => file);
  }

  /**
   * Gets files that are frozen
   */
  getFrozenFiles(): string[] {
    return Array.from(this.lifecycles.entries())
      .filter(([, lifecycle]) => lifecycle.state === 'frozen')
      .map(([file]) => file);
  }

  /**
   * Cleans up expired locks
   */
  cleanupExpiredLocks(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [file, lock] of this.locks.entries()) {
      if (lock.expiresAt && lock.expiresAt < now) {
        this.locks.delete(file);
        this.updateLifecycle(file, 'cooldown');
        this.startCooldown(file);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Resets a file's state (for testing or manual intervention)
   */
  resetFile(file: string): void {
    this.locks.delete(file);
    this.lifecycles.delete(file);
    this.patchHistory.delete(file);
  }

  /**
   * Gets patch history for a file
   */
  getPatchHistory(file: string): AtomicPatch[] {
    return this.patchHistory.get(file) || [];
  }

  /**
   * Checks if a file has been edited recently (oscillation detection)
   */
  hasRecentEdits(file: string, timeWindowMs: number = 60000): boolean {
    const history = this.patchHistory.get(file) || [];
    const now = Date.now();
    return history.some(p => p.appliedAt && (now - p.appliedAt) < timeWindowMs);
  }

  /**
   * Gets a lock for a file
   */
  getLock(file: string): FileLock | undefined {
    return this.locks.get(file);
  }

  /**
   * Gets edit frequency for a file
   */
  getEditFrequency(file: string, timeWindowMs: number = 300000): number {
    const history = this.patchHistory.get(file) || [];
    const now = Date.now();
    return history.filter(p => p.appliedAt && (now - p.appliedAt) < timeWindowMs).length;
  }
}

/**
 * Singleton instance for global use
 */
let globalLockManager: FileLockManager | null = null;

export function getFileLockManager(config?: Partial<CooldownConfig>): FileLockManager {
  if (!globalLockManager) {
    globalLockManager = new FileLockManager(config);
  }
  return globalLockManager;
}

export function resetFileLockManager(): void {
  globalLockManager = null;
}