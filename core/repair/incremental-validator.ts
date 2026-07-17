// ─── Incremental Validator ──────────────────────────────────────────────────────
// Runs only the validators needed for changed files, with caching

import fs from 'fs/promises';
import path from 'path';
import { ValidationError } from '@/orchestrator/validation';
import { FileLockManager } from './file-lock-manager';
import {
  ValidationCache,
  ValidationCacheEntry,
  IncrementalValidationResult,
  ValidationStage,
  ValidatorConfig,
  RepairOrchestratorConfig,
} from './types';

const VALIDATION_HIERARCHY: ValidationStage[] = [
  { name: 'Project Structure', order: 1, validators: ['Project Structure'], dependsOn: [], runCondition: 'always' },
  { name: 'Dependencies', order: 2, validators: ['Dependencies'], dependsOn: ['Project Structure'], runCondition: 'always' },
  { name: 'Environment', order: 3, validators: ['Environment'], dependsOn: ['Dependencies'], runCondition: 'always' },
  { name: 'Type Check', order: 4, validators: ['Type Check'], dependsOn: ['Environment'], runCondition: 'on-change' },
  { name: 'Lint', order: 5, validators: ['Lint'], dependsOn: ['Type Check'], runCondition: 'on-change' },
  { name: 'Formatting', order: 6, validators: ['Formatting'], dependsOn: ['Type Check'], runCondition: 'on-change' },
  { name: 'Static Analysis', order: 7, validators: ['Static Analysis'], dependsOn: ['Type Check'], runCondition: 'on-change' },
  { name: 'Build', order: 8, validators: ['Build'], dependsOn: ['Type Check', 'Lint', 'Static Analysis'], runCondition: 'on-change' },
  { name: 'Dev Server', order: 9, validators: ['Dev Server'], dependsOn: ['Build'], runCondition: 'on-failure' },
  { name: 'Runtime Validation', order: 10, validators: ['Runtime Validation'], dependsOn: ['Dev Server'], runCondition: 'on-failure' },
];

const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  'Project Structure': { timeout: 5000, incremental: true },
  'Dependencies': { timeout: 60000, incremental: false },
  'Environment': { timeout: 5000, incremental: true },
  'Type Check': { timeout: 45000, incremental: true },
  'Lint': { timeout: 30000, incremental: true },
  'Formatting': { timeout: 10000, incremental: true },
  'Static Analysis': { timeout: 15000, incremental: true },
  'Build': { timeout: 120000, incremental: true },
  'Dev Server': { timeout: 15000, incremental: false },
  'Runtime Validation': { timeout: 30000, incremental: false },
};

/**
 * Creates a new validation cache
 */
export function createValidationCache(): ValidationCache {
  return new Map();
}

/**
 * Runs incremental validation for changed files
 */
export async function runIncrementalValidation(
  changedFiles: string[],
  projectDir: string,
  config: RepairOrchestratorConfig,
  validationCache: ValidationCache,
  lockManager: FileLockManager,
  onLog?: (stage: string, message: string) => void
): Promise<IncrementalValidationResult[]> {
  const results: IncrementalValidationResult[] = [];

  // Get validators that need to run based on hierarchy
  const validatorsToRun = getValidatorsForFiles(changedFiles, validationCache);

  for (const validatorName of validatorsToRun) {
    const stageStart = Date.now();
    onLog?.(validatorName, `Running incremental validation for ${changedFiles.join(', ')}`);

    // Check cache first
    const cacheKey = `${validatorName}:${changedFiles.sort().join(',')}`;
    const cached = validationCache.get(cacheKey);

    if (cached && !isCacheExpired(cached, config.validationCacheTtlMs)) {
      onLog?.(validatorName, `Cache hit for ${validatorName}`);
      results.push({
        ...cached.result,
        cacheHit: true,
      });
      continue;
    }

    // Run validator
    const validatorConfig = DEFAULT_VALIDATOR_CONFIG[validatorName] || { timeout: 10000, incremental: true };
    const result = await runValidator(validatorName, changedFiles, projectDir, validatorConfig);

    // Store in cache
    const fileHashes = new Map<string, string>();
    for (const file of changedFiles) {
      // In real implementation, hash file content
      fileHashes.set(file, hashFile(file, projectDir));
    }

    const cacheEntry: ValidationCacheEntry = {
      validator: validatorName,
      fileHashes,
      result: {
        ...result,
        cacheHit: false,
        timestamp: Date.now(),
      },
      cachedAt: Date.now(),
      expiresAt: Date.now() + config.validationCacheTtlMs,
    };

    validationCache.set(cacheKey, cacheEntry);

    results.push({
      ...result,
      cacheHit: false,
    });

    // If validator fails and it's a blocking stage, stop
    if (result.status === 'fail' && isBlockingStage(validatorName)) {
      onLog?.(validatorName, `Validation failed, stopping pipeline`);
      break;
    }
  }

  return results;
}

/**
 * Determines which validators need to run for given files
 */
function getValidatorsForFiles(
  changedFiles: string[],
  validationCache: ValidationCache
): string[] {
  const validators = new Set<string>();

  for (const stage of VALIDATION_HIERARCHY) {
    let shouldRun = false;

    for (const validator of stage.validators) {
      if (stage.runCondition === 'always') {
        shouldRun = true;
      } else if (stage.runCondition === 'on-change') {
        // Check if any changed file is relevant to this validator
        shouldRun = isValidatorRelevant(validator, changedFiles);
      } else if (stage.runCondition === 'on-failure') {
        // Only run if previous stage failed
        const prevStageFailed = stage.dependsOn.some(dep =>
          validationCache.has(`${dep}:${changedFiles.sort().join(',')}`)
        );
        shouldRun = prevStageFailed;
      }

      if (shouldRun) {
        validators.add(validator);
      }
    }

    // If a blocking stage would fail, we still run it to get errors
    if (stage.runCondition === 'always') {
      for (const validator of stage.validators) {
        validators.add(validator);
      }
    }
  }

  return Array.from(validators);
}

/**
 * Checks if a validator is relevant for changed files
 */
function isValidatorRelevant(validator: string, changedFiles: string[]): boolean {
  const relevanceMap: Record<string, string[]> = {
    'Type Check': ['.ts', '.tsx', '.js', '.jsx'],
    'Lint': ['.ts', '.tsx', '.js', '.jsx', '.json'],
    'Formatting': ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md'],
    'Static Analysis': ['.ts', '.tsx', '.js', '.jsx'],
    'Build': ['.ts', '.tsx', '.js', '.jsx', '.json', 'package.json', 'tsconfig.json', 'next.config.js'],
    'Dev Server': ['package.json', 'next.config.js', '.env'],
    'Runtime Validation': ['.tsx', '.jsx'],
    'Project Structure': [],
    'Dependencies': ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
    'Environment': ['.env', '.env.local', '.env.example'],
  };

  const relevantExtensions = relevanceMap[validator] || [];

  if (relevantExtensions.length === 0) return true; // Always relevant

  return changedFiles.some(file =>
    relevantExtensions.some(ext => file.endsWith(ext) || file.includes(ext))
  );
}

/**
 * Runs a single validator
 */
async function runValidator(
  validatorName: string,
  files: string[],
  projectDir: string,
  config: { timeout: number; incremental: boolean }
): Promise<IncrementalValidationResult> {
  const start = Date.now();
  const errors: ValidationError[] = [];

  try {
    switch (validatorName) {
      case 'Project Structure': {
        await validateProjectStructure(files, projectDir, errors);
        break;
      }
      case 'Dependencies': {
        await validateDependencies(projectDir, errors);
        break;
      }
      case 'Environment': {
        await validateEnvironment(files, projectDir, errors);
        break;
      }
      case 'Type Check': {
        await validateTypeCheck(files, projectDir, errors);
        break;
      }
      case 'Lint': {
        await validateLint(files, projectDir, errors);
        break;
      }
      case 'Formatting': {
        await validateFormatting(files, projectDir, errors);
        break;
      }
      case 'Static Analysis': {
        await validateStaticAnalysis(files, projectDir, errors);
        break;
      }
      case 'Build': {
        await validateBuild(projectDir, errors);
        break;
      }
      case 'Dev Server': {
        await validateDevServer(projectDir, errors);
        break;
      }
      case 'Runtime Validation': {
        await validateRuntime(files, projectDir, errors);
        break;
      }
    }
  } catch (error) {
    errors.push({
      stage: validatorName,
      file: files[0] || 'unknown',
      message: `Validator error: ${error}`,
      severity: 'error',
    });
  }

  return {
    validator: validatorName,
    status: errors.length > 0 ? 'fail' : 'pass',
    errors,
    duration: Date.now() - start,
    filesValidated: files,
    cacheHit: false,
    timestamp: Date.now(),
  };
}

/**
 * Validator implementations (simplified - real ones in validation.ts)
 */
async function validateProjectStructure(
  files: string[],
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  // Check required files exist
  const required = ['package.json', 'tsconfig.json'];
  for (const file of required) {
    try {
      await fs.access(path.join(projectDir, file));
    } catch {
      errors.push({
        stage: 'Project Structure',
        file,
        message: `Missing required file: ${file}`,
        severity: 'error',
      });
    }
  }
}

async function validateDependencies(
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  try {
    await execPromise('npm install', { cwd: projectDir, timeout: 60000 });
  } catch (err: any) {
    errors.push({
      stage: 'Dependencies',
      file: 'package.json',
      message: `npm install failed: ${err.message}`,
      severity: 'error',
    });
  }
}

async function validateEnvironment(
  files: string[],
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  // Check .env files
  for (const file of files) {
    if (file.endsWith('.env') || file.endsWith('.env.local')) {
      try {
        const content = await fs.readFile(path.join(projectDir, file), 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && !line.startsWith('#') && !line.includes('=')) {
            errors.push({
              stage: 'Environment',
              file,
              line: i + 1,
              message: `Invalid format: "${line}"`,
              severity: 'warning',
            });
          }
        }
      } catch {
        // File might not exist
      }
    }
  }
}

async function validateTypeCheck(
  files: string[],
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  try {
    await execPromise('npx tsc --noEmit', { cwd: projectDir, timeout: 45000 });
  } catch (err: any) {
    const output = err.stdout + '\n' + err.stderr;
    parseTypeScriptErrors(output, errors, files);
  }
}

function parseTypeScriptErrors(
  output: string,
  errors: ValidationError[],
  relevantFiles: string[]
): void {
  const lines = output.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^(]+)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.*)$/);
    if (match) {
      const file = match[1].trim();
      if (relevantFiles.length === 0 || relevantFiles.some(f => file.includes(f) || f.includes(file))) {
        errors.push({
          stage: 'Type Check',
          file,
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: `${match[4]}: ${match[5]}`,
          severity: 'error',
        });
      }
    }
  }
}

async function validateLint(
  files: string[],
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  try {
    await execPromise('npm run lint', { cwd: projectDir, timeout: 30000 });
  } catch (err: any) {
    const output = err.stdout + '\n' + err.stderr;
    // Parse eslint output
    for (const file of files) {
      if (output.includes(file)) {
        errors.push({
          stage: 'Lint',
          file,
          message: `Lint errors in ${file}: ${output.substring(0, 200)}`,
          severity: 'error',
        });
      }
    }
  }
}

async function validateFormatting(
  files: string[],
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  // Basic formatting check - would use prettier in reality
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(projectDir, file), 'utf-8');
      // Check for basic issues
      if (content.includes('\t') && !file.endsWith('.json')) {
        errors.push({
          stage: 'Formatting',
          file,
          message: 'Tabs detected (use spaces)',
          severity: 'warning',
        });
      }
    } catch {
      // File might not exist
    }
  }
}

async function validateStaticAnalysis(
  files: string[],
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(projectDir, file), 'utf-8');
      // Check imports
      const importRegex = /import\s+[\s\S]*?\s+from\s+['"](\.\.?[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const resolved = path.resolve(path.dirname(path.join(projectDir, file)), importPath);
        let found = false;
        for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
          try {
            await fs.access(resolved + ext);
            found = true;
            break;
          } catch {}
        }
        if (!found) {
          errors.push({
            stage: 'Static Analysis',
            file,
            message: `Broken import: "${importPath}"`,
            severity: 'error',
          });
        }
      }
    } catch {
      // File might not exist
    }
  }
}

async function validateBuild(
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  try {
    await execPromise('npm run build', { cwd: projectDir, timeout: 120000 });
  } catch (err: any) {
    errors.push({
      stage: 'Build',
      file: 'Build',
      message: `Build failed: ${err.message}`,
      severity: 'error',
    });
  }
}

async function validateDevServer(
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  // Quick dev server check - just verify it can start
  const { exec } = await import('child_process');
  const child = exec('npm run dev', { cwd: projectDir });

  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        child.kill();
        resolve(); // Assume OK if it runs for 15s
      }
    }, 15000);

    child.stdout?.on('data', (data: string) => {
      if (data.includes('ready') || data.includes('started') || data.includes('localhost:')) {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          child.kill();
          resolve();
        }
      }
    });

    child.stderr?.on('data', (data: string) => {
      if (data.toLowerCase().includes('error') && !finished) {
        finished = true;
        clearTimeout(timeout);
        child.kill();
        reject(new Error(data));
      }
    });

    child.on('exit', (code) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          reject(new Error(`Exited with code ${code}`));
        } else {
          resolve();
        }
      }
    });
  });
}

async function validateRuntime(
  files: string[],
  projectDir: string,
  errors: ValidationError[]
): Promise<void> {
  // Placeholder for runtime validation (e.g., Playwright)
  // Would check for console errors, hydration mismatches, etc.
}

/**
 * Checks if a validator stage is blocking
 */
function isBlockingStage(validatorName: string): boolean {
  const blockingStages = [
    'Project Structure',
    'Dependencies',
    'Type Check',
    'Build',
  ];
  return blockingStages.includes(validatorName);
}

/**
 * Checks if cache is expired
 */
function isCacheExpired(entry: ValidationCacheEntry, ttlMs: number): boolean {
  return Date.now() > entry.expiresAt;
}

/**
 * Hashes a file
 */
function hashFile(file: string, projectDir: string): string {
  // Simplified hash
  let hash = 0;
  for (let i = 0; i < file.length; i++) {
    hash = ((hash << 5) - hash) + file.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Clears validation cache for specific files
 */
export function invalidateValidationCache(
  files: string[],
  validationCache: ValidationCache
): void {
  for (const [key, entry] of validationCache) {
    for (const file of files) {
      if (entry.fileHashes.has(file)) {
        validationCache.delete(key);
        break;
      }
    }
  }
}

/**
 * Gets cache statistics
 */
export function getCacheStats(validationCache: ValidationCache): {
  totalEntries: number;
  expiredEntries: number;
  hitRate: number;
} {
  let hits = 0;
  let misses = 0;
  let expired = 0;

  for (const [, entry] of validationCache) {
    if (Date.now() > entry.expiresAt) {
      expired++;
    } else if (entry.result.cacheHit) {
      hits++;
    } else {
      misses++;
    }
  }

  return {
    totalEntries: validationCache.size,
    expiredEntries: expired,
    hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
  };
}

/**
 * Persists validation cache to disk
 */
export async function persistValidationCache(
  projectId: string,
  validationCache: ValidationCache
): Promise<void> {
  const { writeFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');

  const dir = join(process.cwd(), 'cache', 'validation', projectId);
  await mkdir(dir, { recursive: true });

  const data = {
    entries: Array.from(validationCache.entries()).map(([key, entry]) => ({
      key,
      ...entry,
      fileHashes: Array.from(entry.fileHashes.entries()),
    })),
    persistedAt: Date.now(),
  };

  await writeFile(join(dir, 'validation-cache.json'), JSON.stringify(data, null, 2));
}

/**
 * Loads validation cache from disk
 */
export async function loadValidationCache(projectId: string): Promise<ValidationCache> {
  const { readFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');

  const dir = join(process.cwd(), 'cache', 'validation', projectId);
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, 'validation-cache.json');

  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const cache = new Map<string, ValidationCacheEntry>();

    for (const entry of data.entries) {
      cache.set(entry.key, {
        ...entry,
        fileHashes: new Map(entry.fileHashes),
      });
    }

    return cache;
  } catch {
    return createValidationCache();
  }
}

// Re-export for convenience
export { VALIDATION_HIERARCHY, DEFAULT_VALIDATOR_CONFIG };