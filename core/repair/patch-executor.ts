// ─── Patch Executor ─────────────────────────────────────────────────────────────
// Applies patches atomically with rollback capability

import fs from 'fs/promises';
import path from 'path';
import { ValidationError, runValidationPipeline } from '@/orchestrator/validation';
import { FileLockManager } from './file-lock-manager';
import {
  AtomicPatch,
  PatchDiff,
  PatchExecutorResult,
  RepairPlan,
  FileLifecycleState,
  RepairContext,
  ValidationCache,
} from './types';

/**
 * Executes a patch with atomic semantics and rollback capability
 */
export async function executePatch(
  patch: AtomicPatch,
  projectDir: string,
  lockManager: FileLockManager,
  context: RepairContext,
  validationCache: ValidationCache
): Promise<PatchExecutorResult> {
  const startTime = Date.now();
  const filePath = path.join(projectDir, patch.file);
  let backupContent: string | null = null;
  let backupPath: string | null = null;

  try {
    // 1. Read current file content
    let currentContent: string;
    try {
      currentContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      currentContent = '';
    }

    // 2. Create backup
    backupContent = currentContent;
    backupPath = filePath + '.bak.' + Date.now();
    await fs.writeFile(backupPath, currentContent, 'utf-8');

    // 3. Acquire lock
    const lockResult = lockManager.acquireLock(
      patch.file,
      patch.id,
      patch.createdBy,
      `Applying patch: ${patch.description}`
    );

    if (!lockResult.success) {
      await fs.unlink(backupPath).catch(() => {});
      return {
        success: false,
        patchId: patch.id,
        file: patch.file,
        error: lockResult.error || 'Failed to acquire lock',
        duration: Date.now() - startTime,
        rolledBack: false,
      };
    }

    // 4. Apply the patch
    const newContent = applyPatchDiff(currentContent, patch.diff);
    await fs.writeFile(filePath, newContent, 'utf-8');

    // 5. Update lock state to validating
    const lock = lockManager.getLock(patch.file);
    if (lock) {
      lock.state = 'validating';
    }

    // 6. Run incremental validation on affected files
    const validationResult = await runIncrementalValidation(
      patch,
      projectDir,
      context,
      validationCache
    );

    if (!validationResult.passed) {
      // Validation failed - rollback
      await rollbackPatch(patch, filePath, backupPath!, lockManager);
      return {
        success: false,
        patchId: patch.id,
        file: patch.file,
        error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
        duration: Date.now() - startTime,
        rolledBack: true,
        validationErrors: validationResult.errors,
      };
    }

    // 7. Validation passed - commit
    lockManager.releaseLock(patch.file, patch.id);
    lockManager.updateLifecycle(patch.file, 'passed');
    await fs.unlink(backupPath).catch(() => {});

    // 8. Invalidate validation cache for affected files
    invalidateCache(patch.affectedFiles, validationCache);

    return {
      success: true,
      patchId: patch.id,
      file: patch.file,
      duration: Date.now() - startTime,
      rolledBack: false,
      validationErrors: [],
      newContent,
    };
  } catch (error) {
    // Rollback on any error
    if (backupPath) {
      await rollbackPatch(patch, filePath, backupPath, lockManager);
    }
    return {
      success: false,
      patchId: patch.id,
      file: patch.file,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
      rolledBack: true,
    };
  }
}

/**
 * Applies a patch diff to content
 */
function applyPatchDiff(content: string, diff: PatchDiff): string {
  // If newContent is provided, use it directly
  if (diff.newContent !== undefined && diff.newContent !== content) {
    return diff.newContent;
  }

  // Otherwise apply hunks
  let result = content;
  const lines = content.split('\n');

  // Sort hunks by start line (descending) to apply from bottom up
  const sortedHunks = [...diff.hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of sortedHunks) {
    const startIdx = hunk.oldStart - 1;
    const endIdx = startIdx + hunk.oldLines;

    // Build new lines for this hunk
    const newLines: string[] = [];
    for (const line of hunk.lines) {
      if (line.type === 'context' || line.type === 'add') {
        newLines.push(line.content);
      }
      // Remove lines are skipped
    }

    // Replace
    result = [
      ...lines.slice(0, startIdx),
      ...newLines,
      ...lines.slice(endIdx),
    ].join('\n');
  }

  return result;
}

/**
 * Runs incremental validation on affected files
 */
async function runIncrementalValidation(
  patch: AtomicPatch,
  projectDir: string,
  context: RepairContext,
  validationCache: ValidationCache
): Promise<{ passed: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  // Run only the required validators for affected files
  for (const validatorName of patch.requiredValidators) {
    const cacheKey = `${validatorName}:${patch.file}`;
    const cached = validationCache.get(cacheKey);

    if (cached && !isCacheExpired(cached, context.config?.validationCacheTtlMs || 300000)) {
      // Use cached result
      if (cached.result.status === 'fail') {
        errors.push(...cached.result.errors);
      }
      continue;
    }

    // Run the validator
    const result = await runSingleValidator(validatorName, patch.file, projectDir);

    // Cache result
    validationCache.set(cacheKey, {
      validator: validatorName,
      fileHashes: new Map([[patch.file, hashContent(result.output || '')]]),
      result: {
        validator: validatorName,
        status: result.errors.length > 0 ? 'fail' : 'pass',
        errors: result.errors,
        duration: result.duration,
        filesValidated: [patch.file],
        cacheHit: false,
        timestamp: Date.now(),
      },
      cachedAt: Date.now(),
      expiresAt: Date.now() + (context.config?.validationCacheTtlMs || 300000),
    });

    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * Runs a single validator on a file
 */
async function runSingleValidator(
  validatorName: string,
  file: string,
  projectDir: string
): Promise<{ errors: ValidationError[]; duration: number; output?: string }> {
  const start = Date.now();
  const errors: ValidationError[] = [];

  try {
    switch (validatorName) {
      case 'Type Check': {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);
        try {
          await execPromise('npx tsc --noEmit', { cwd: projectDir, timeout: 45000 });
        } catch (err: any) {
          const output = err.stdout + '\n' + err.stderr;
          parseTypeScriptErrors(output, errors);
        }
        break;
      }
      case 'Lint': {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);
        try {
          await execPromise('npm run lint', { cwd: projectDir, timeout: 30000 });
        } catch (err: any) {
          errors.push({
            stage: 'Lint',
            file,
            message: `Lint failed: ${err.message}`,
            severity: 'error',
          });
        }
        break;
      }
      case 'Build': {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);
        try {
          await execPromise('npm run build', { cwd: projectDir, timeout: 120000 });
        } catch (err: any) {
          errors.push({
            stage: 'Build',
            file,
            message: `Build failed: ${err.message}`,
            severity: 'error',
          });
        }
        break;
      }
      case 'Static Analysis': {
        // Check for broken imports
        const brokenImports = await checkBrokenImports(file, projectDir);
        errors.push(...brokenImports);
        break;
      }
      default:
        // Skip unknown validators
        break;
    }
  } catch (error) {
    errors.push({
      stage: validatorName,
      file,
      message: `Validator error: ${error}`,
      severity: 'error',
    });
  }

  return { errors, duration: Date.now() - start };
}

/**
 * Parses TypeScript errors from output
 */
function parseTypeScriptErrors(output: string, errors: ValidationError[]): void {
  const lines = output.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^(]+)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.*)$/);
    if (match) {
      errors.push({
        stage: 'Type Check',
        file: match[1].trim(),
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        message: `${match[4]}: ${match[5]}`,
        severity: 'error',
      });
    }
  }
}

/**
 * Checks for broken imports in a file
 */
async function checkBrokenImports(file: string, projectDir: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const filePath = path.join(projectDir, file);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const importRegex = /import\s+[\s\S]*?\s+from\s+['"](\.\.?[^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = path.resolve(path.dirname(filePath), importPath);

      // Try extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
      let found = false;
      for (const ext of extensions) {
        try {
          await fs.access(resolved + ext);
          found = true;
          break;
        } catch {
          // Continue
        }
      }

      if (!found) {
        errors.push({
          stage: 'Static Analysis',
          file,
          message: `Broken import: "${importPath}" in ${file}`,
          severity: 'error',
        });
      }
    }
  } catch {
    // File might not exist yet
  }

  return errors;
}

/**
 * Rolls back a patch
 */
async function rollbackPatch(
  patch: AtomicPatch,
  filePath: string,
  backupPath: string,
  lockManager: FileLockManager
): Promise<void> {
  try {
    // Restore backup
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    await fs.writeFile(filePath, backupContent, 'utf-8');

    // Release lock
    lockManager.forceReleaseLock(patch.file);
    lockManager.updateLifecycle(patch.file, 'error');

    // Clean up backup
    await fs.unlink(backupPath).catch(() => {});
  } catch (error) {
    console.error(`[PatchExecutor] Failed to rollback ${patch.file}:`, error);
  }
}

/**
 * Invalidates cache for affected files
 */
function invalidateCache(affectedFiles: string[], validationCache: ValidationCache): void {
  for (const file of affectedFiles) {
    for (const [key, entry] of validationCache) {
      if (entry.fileHashes.has(file)) {
        validationCache.delete(key);
      }
    }
  }
}

/**
 * Checks if cache entry is expired
 */
function isCacheExpired(entry: any, ttlMs: number): boolean {
  return Date.now() > entry.expiresAt;
}

/**
 * Simple content hash
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Executes a full repair plan
 */
export async function executeRepairPlan(
  plan: RepairPlan,
  projectDir: string,
  lockManager: FileLockManager,
  context: RepairContext,
  validationCache: ValidationCache,
  onProgress?: (patch: AtomicPatch, result: PatchExecutorResult) => void
): Promise<PatchExecutorResult[]> {
  const results: PatchExecutorResult[] = [];

  for (const patch of plan.patches) {
    // Check if prerequisites are met
    const prereqsMet = patch.prerequisites.every(prereqFile => {
      const prereqPatch = plan.patches.find(p => p.file === prereqFile);
      return prereqPatch && results.some(r => r.patchId === prereqPatch.id && r.success);
    });

    if (!prereqsMet) {
      const result: PatchExecutorResult = {
        success: false,
        patchId: patch.id,
        file: patch.file,
        error: 'Prerequisites not met',
        duration: 0,
        rolledBack: false,
      };
      results.push(result);
      onProgress?.(patch, result);
      continue;
    }

    // Execute patch
    const result = await executePatch(patch, projectDir, lockManager, context, validationCache);
    results.push(result);
    onProgress?.(patch, result);

    // Stop on failure if critical
    if (!result.success && patch.risk === 'critical') {
      break;
    }
  }

  return results;
}

/**
 * Rolls back all applied patches in a plan (reverse order)
 */
export async function rollbackRepairPlan(
  plan: RepairPlan,
  projectDir: string,
  lockManager: FileLockManager,
  validationCache: ValidationCache
): Promise<PatchExecutorResult[]> {
  const results: PatchExecutorResult[] = [];

  // Get applied patches in reverse order
  const appliedPatches = plan.patches
    .filter(p => p.status === 'applied')
    .reverse();

  for (const patch of appliedPatches) {
    const filePath = path.join(projectDir, patch.file);
    const backupPath = filePath + '.bak.' + patch.appliedAt;

    // Check if backup exists
    try {
      await fs.access(backupPath);
    } catch {
      // No backup, skip
      results.push({
        success: false,
        patchId: patch.id,
        file: patch.file,
        error: 'No backup found for rollback',
        duration: 0,
        rolledBack: false,
      });
      continue;
    }

    const startTime = Date.now();
    await rollbackPatch(patch, filePath, backupPath, lockManager);

    results.push({
      success: true,
      patchId: patch.id,
      file: patch.file,
      duration: Date.now() - startTime,
      rolledBack: true,
    });

    // Invalidate cache
    invalidateCache(patch.affectedFiles, validationCache);
  }

  return results;
}