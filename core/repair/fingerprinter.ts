// ─── Error Fingerprinter ──────────────────────────────────────────────────────
// Generates unique fingerprints for errors to detect recurrence, oscillation, and regressions

import { createHash } from 'crypto';
import { ValidationError } from '@/orchestrator/validation';
import {
  ErrorFingerprint,
  ErrorFingerprintCluster,
  ErrorFingerprintStats,
  OscillationPattern,
  ErrorFingerprintConfig,
  RepairPattern,
  ErrorMemory
} from './types';

/**
 * Default configuration for fingerprinting
 */
const DEFAULT_CONFIG: ErrorFingerprintConfig = {
  includeValidator: true,
  includeFile: true,
  includeLine: true,
  includeColumn: true,
  includeMessage: true,
  messageSimilarityThreshold: 0.85,
  clusterBy: ['validator', 'file', 'dependency'],
  maxClusterSize: 50,
};

/**
 * Generates a unique fingerprint for a validation error
 * Format: hash(validator + file + line + column + normalized_message)
 */
export function generateErrorFingerprint(
  error: ValidationError,
  config: ErrorFingerprintConfig = DEFAULT_CONFIG
): ErrorFingerprint {
  const parts: string[] = [];

  if (config.includeValidator) {
    parts.push(error.stage);
  }
  if (config.includeFile) {
    parts.push(error.file);
  }
  if (config.includeLine && error.line !== undefined) {
    parts.push(String(error.line));
  }
  if (config.includeColumn && error.column !== undefined) {
    parts.push(String(error.column));
  }
  if (config.includeMessage) {
    // Normalize message for similarity detection
    parts.push(normalizeMessageForHash(error.message));
  }

  const combined = parts.join('|');
  const hash = createHash('sha256').update(combined).digest('hex').substring(0, 16);

  return {
    hash,
    validator: error.stage,
    file: error.file,
    line: error.line,
    column: error.column,
    message: error.message,
    normalizedMessage: normalizeMessage(error.message),
    severity: error.severity,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    occurrenceCount: 1,
    cycles: [],
    resolved: false, // Ensure resolved property is initialized
  };
}

/**
 * Normalizes error message for similarity comparison
 * Removes variable parts like line numbers, specific identifiers, paths
 */
function normalizeMessage(message: string): string {
  return message
    // Remove file paths
    .replace(/[a-zA-Z]:[\\/][\w\\/.-]+/g, '<PATH>')
    .replace(/\/[\w/.-]+\.[\w]+/g, '<PATH>')
    // Remove line/column references
    .replace(/\((\d+),(\d+)\)/g, '(<LINE>,<COL>)')
    .replace(/at line \d+/gi, 'at line <LINE>')
    .replace(/line \d+/gi, 'line <LINE>')
    // Remove specific identifiers (but keep structure)
    .replace(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g, (match) => {
      // Keep common keywords
      const keywords = [
        'error', 'warning', 'type', 'undefined', 'null', 'string', 'number',
        'boolean', 'object', 'function', 'class', 'interface', 'import', 'export',
        'from', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
        'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends',
        'implements', 'public', 'private', 'protected', 'static', 'readonly',
        'async', 'await', 'Promise', 'Array', 'Object', 'Map', 'Set', 'Date',
        'RegExp', 'Error', 'TypeError', 'ReferenceError', 'SyntaxError',
        'TS', 'cannot', 'find', 'name', 'module', 'property', 'method',
        'argument', 'parameter', 'expected', 'got', 'missing', 'required',
        'optional', 'default', 'constructor', 'prototype', 'instanceof',
        'typeof', 'keyof', 'typeof', 'in', 'of', 'as', 'is', 'satisfies',
      ];
      return keywords.includes(match.toLowerCase()) ? match : '<IDENT>';
    })
    // Remove quotes around identifiers
    .replace(/'<IDENT>'/g, '<IDENT>')
    .replace(/"<IDENT>"/g, '<IDENT>')
    // Remove numeric literals
    .replace(/\b\d+\b/g, '<NUM>')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes message for fingerprint hash (keeps more detail than similarity)
 */
function normalizeMessageForHash(message: string): string {
  return message
    .replace(/[a-zA-Z]:[\\/][\w\\/.-]+/g, '<PATH>')
    .replace(/\/[\w/.-]+\.[\w]+/g, '<PATH>')
    .replace(/\((\d+),(\d+)\)/g, '(<LINE>,<COL>)')
    .replace(/at line \d+/gi, 'at line <LINE>')
    .replace(/line \d+/gi, 'line <LINE>')
    .replace(/\b\d+\b/g, '<NUM>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates similarity between two normalized messages
 * Uses Jaccard similarity on word tokens
 */
export function calculateMessageSimilarity(msg1: string, msg2: string): number {
  const tokens1 = new Set(msg1.toLowerCase().split(/\s+/).filter(t => t.length > 1));
  const tokens2 = new Set(msg2.toLowerCase().split(/\s+/).filter(t => t.length > 1));

  if (tokens1.size === 0 && tokens2.size === 0) return 1;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) intersection++;
  }

  const union = tokens1.size + tokens2.size - intersection;
  return intersection / union;
}

/**
 * Clusters errors by fingerprint similarity
 */
export function clusterErrors(
  fingerprints: ErrorFingerprint[],
  config: ErrorFingerprintConfig = DEFAULT_CONFIG
): ErrorFingerprintCluster[] {
  const clusters: ErrorFingerprintCluster[] = [];
  const processed = new Set<string>();

  for (const fp of fingerprints) {
    if (processed.has(fp.hash)) continue;

    // Find similar fingerprints
    const cluster: ErrorFingerprint[] = [fp];
    processed.add(fp.hash);

    for (const other of fingerprints) {
      if (processed.has(other.hash)) continue;
      if (cluster.length >= config.maxClusterSize) break;

      // Check if they belong to same cluster
      if (areFingerprintsSimilar(fp, other, config)) {
        cluster.push(other);
        processed.add(other.hash);
      }
    }

    if (cluster.length > 0) {
      clusters.push(createCluster(cluster));
    }
  }

  // Sort clusters by size (largest first)
  return clusters.sort((a, b) => b.fingerprints.length - a.fingerprints.length);
}

/**
 * Checks if two fingerprints are similar enough to cluster
 */
function areFingerprintsSimilar(
  fp1: ErrorFingerprint,
  fp2: ErrorFingerprint,
  config: ErrorFingerprintConfig
): boolean {
  // Same validator and file = likely same cluster
  if (fp1.validator === fp2.validator && fp1.file === fp2.file) {
    return true;
  }

  // Check message similarity
  const similarity = calculateMessageSimilarity(fp1.normalizedMessage, fp2.normalizedMessage);
  if (similarity >= config.messageSimilarityThreshold) {
    return true;
  }

  return false;
}

/**
 * Creates a cluster from a group of fingerprints
 */
function createCluster(fingerprints: ErrorFingerprint[]): ErrorFingerprintCluster {
  const validator = fingerprints[0].validator;
  const files = [...new Set(fingerprints.map(f => f.file))];
  const totalOccurrences = fingerprints.reduce((sum, f) => sum + f.occurrenceCount, 0);
  const firstSeen = Math.min(...fingerprints.map(f => f.firstSeen));
  const lastSeen = Math.max(...fingerprints.map(f => f.lastSeen));

  // Determine cluster type
  let type: ErrorFingerprintCluster['type'] = 'mixed';
  if (files.length === 1) type = 'file';
  else if (fingerprints.every(f => f.validator === validator)) type = 'validator';
  else if (hasDependencyRelationship(fingerprints)) type = 'dependency';

  return {
    id: createHash('sha256').update(fingerprints.map(f => f.hash).sort().join(',')).digest('hex').substring(0, 12),
    type,
    validator,
    files,
    fingerprints,
    totalOccurrences,
    firstSeen,
    lastSeen,
    rootCauseCandidate: findRootCauseCandidate(fingerprints),
  };
}

/**
 * Checks if fingerprints have a dependency relationship
 */
function hasDependencyRelationship(fingerprints: ErrorFingerprint[]): boolean {
  // Simple heuristic: if files import each other
  // In practice, this would use the dependency graph
  return false;
}

/**
 * Finds the most likely root cause candidate in a cluster
 */
function findRootCauseCandidate(fingerprints: ErrorFingerprint[]): ErrorFingerprint | null {
  // Prefer errors that:
  // 1. Appear earliest
  // 2. Are in config/files that others depend on
  // 3. Have highest occurrence count

  return fingerprints.reduce((best, current) => {
    if (!best) return current;

    // Earlier first seen = more likely root cause
    if (current.firstSeen < best.firstSeen) return current;

    // Higher occurrence count = more likely root cause
    if (current.occurrenceCount > best.occurrenceCount) return current;

    return best;
  }, null as ErrorFingerprint | null);
}

/**
 * Updates fingerprint with new occurrence
 */
export function updateFingerprint(
  fingerprint: ErrorFingerprint,
  cycle: number
): ErrorFingerprint {
  return {
    ...fingerprint,
    lastSeen: Date.now(),
    occurrenceCount: fingerprint.occurrenceCount + 1,
    cycles: [...fingerprint.cycles, cycle],
  };
}

/**
 * Detects oscillation patterns in error fingerprints
 * Oscillation = error appears, disappears, reappears in cycles
 */
export function detectOscillation(
  fingerprint: ErrorFingerprint,
  minCycles: number = 3
): OscillationPattern | null {
  const cycles = fingerprint.cycles;
  if (cycles.length < minCycles) return null;

  // Check for pattern: present, absent, present, absent...
  let oscillations = 0;
  for (let i = 1; i < cycles.length; i++) {
    if (cycles[i] !== cycles[i - 1] + 1) {
      // Gap indicates error disappeared and reappeared
      oscillations++;
    }
  }

  if (oscillations >= 2) {
    return {
      fingerprintHash: fingerprint.hash,
      pattern: 'oscillation',
      cyclesAffected: cycles,
      oscillationCount: oscillations,
      severity: oscillations >= 4 ? 'high' : 'medium',
      detectedAt: Date.now(),
    };
  }

  return null;
}

/**
 * Detects regression - error that was fixed but reappeared
 */
export function detectRegression(
  previousFingerprints: Map<string, ErrorFingerprint>,
  currentFingerprints: Map<string, ErrorFingerprint>
): ErrorFingerprint[] {
  const regressions: ErrorFingerprint[] = [];

  for (const [hash, current] of currentFingerprints) {
    const previous = previousFingerprints.get(hash);
    if (previous && previous.occurrenceCount > 0 && current.occurrenceCount === 1) {
      // Error was seen before, now appearing again after being "fixed"
      // Check if it was absent in intermediate cycles
      const lastSeenCycle = Math.max(...previous.cycles);
      const currentCycle = current.cycles[0];

      if (currentCycle > lastSeenCycle + 1) {
        regressions.push(current);
      }
    }
  }

  return regressions;
}

/**
 * Generates statistics for error fingerprints
 */
export function generateFingerprintStats(
  fingerprints: Map<string, ErrorFingerprint>,
  cycles: number
): ErrorFingerprintStats {
  const totalFingerprints = fingerprints.size;
  const totalOccurrences = Array.from(fingerprints.values()).reduce((sum, f) => sum + f.occurrenceCount, 0);
  const uniqueFiles = new Set(Array.from(fingerprints.values()).map(f => f.file)).size;
  const uniqueValidators = new Set(Array.from(fingerprints.values()).map(f => f.validator)).size;

  const byValidator = new Map<string, number>();
  const byFile = new Map<string, number>();
  const bySeverity = new Map<string, number>();

  for (const fp of fingerprints.values()) {
    byValidator.set(fp.validator, (byValidator.get(fp.validator) || 0) + fp.occurrenceCount);
    byFile.set(fp.file, (byFile.get(fp.file) || 0) + fp.occurrenceCount);
    bySeverity.set(fp.severity, (bySeverity.get(fp.severity) || 0) + fp.occurrenceCount);
  }

  // Find recurring errors (seen in multiple cycles)
  const recurringErrors = Array.from(fingerprints.values())
    .filter(f => f.cycles.length > 1)
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  // Find oscillating errors
  const oscillatingErrors = Array.from(fingerprints.values())
    .map(f => detectOscillation(f))
    .filter((o): o is OscillationPattern => o !== null);

  return {
    totalFingerprints,
    totalOccurrences,
    uniqueFiles,
    uniqueValidators,
    cycles,
    byValidator: Object.fromEntries(byValidator),
    byFile: Object.fromEntries(byFile),
    bySeverity: Object.fromEntries(bySeverity),
    recurringErrors: recurringErrors.map(f => f.hash),
    oscillatingErrors: oscillatingErrors.map(o => o.fingerprintHash),
    topErrors: Array.from(fingerprints.values())
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(f => f.hash),
  };
}

/**
 * Matches current errors against known repair patterns
 */
export function matchRepairPatterns(
  fingerprint: ErrorFingerprint,
  errorMemory: ErrorMemory
): RepairPattern | null {
  for (const pattern of errorMemory.patterns.values()) {
    // Check if fingerprint matches pattern
    if (pattern.errorFingerprint.validator === fingerprint.validator &&
        pattern.errorFingerprint.normalizedMessage === fingerprint.normalizedMessage) {
      // Check file pattern match
      const fileMatches = pattern.applicableFilePatterns.some(p =>
        fingerprint.file.match(new RegExp(p.replace(/\*/g, '.*')))
      );
      if (fileMatches || pattern.applicableFilePatterns.length === 0) {
        return pattern;
      }
    }
  }
  return null;
}

/**
 * Adds a successful repair to error memory
 */
export function recordSuccessfulRepair(
  errorMemory: ErrorMemory,
  fingerprint: ErrorFingerprint,
  fixStrategy: RepairPattern['fixStrategy'],
  patchTemplate: RepairPattern['patchTemplate'],
  applicableValidators: string[],
  applicableFilePatterns: string[]
): RepairPattern {
  const existingKey = findExistingPatternKey(errorMemory, fingerprint);

  if (existingKey) {
    const pattern = errorMemory.patterns.get(existingKey)!;
    pattern.timesApplied++;
    pattern.lastApplied = Date.now();
    pattern.successRate = (pattern.successRate * (pattern.timesApplied - 1) + 1) / pattern.timesApplied;
    return pattern;
  }

  const pattern: RepairPattern = {
    id: createHash('sha256').update(`${fingerprint.hash}-${Date.now()}`).digest('hex').substring(0, 16),
    errorFingerprint: fingerprint,
    rootCauseDescription: '',
    fixStrategy,
    patchTemplate,
    successRate: 1.0,
    timesApplied: 1,
    lastApplied: Date.now(),
    applicableValidators,
    applicableFilePatterns,
    confidence: 0.9,
  };

  errorMemory.patterns.set(pattern.id, pattern);
  errorMemory.totalPatterns++;
  errorMemory.lastUpdated = Date.now();

  return pattern;
}

/**
 * Finds existing pattern key for a fingerprint
 */
function findExistingPatternKey(
  errorMemory: ErrorMemory,
  fingerprint: ErrorFingerprint
): string | null {
  for (const [key, pattern] of errorMemory.patterns) {
    if (pattern.errorFingerprint.validator === fingerprint.validator &&
        pattern.errorFingerprint.normalizedMessage === fingerprint.normalizedMessage) {
      return key;
    }
  }
  return null;
}

/**
 * Creates a new empty error memory
 */
export function createErrorMemory(): ErrorMemory {
  return {
    patterns: new Map(),
    totalPatterns: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Persists error memory to disk
 */
export async function persistErrorMemory(
  projectId: string,
  errorMemory: ErrorMemory
): Promise<void> {
  const { writeFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');

  const dir = join(process.cwd(), 'memory', 'repair', projectId);
  await mkdir(dir, { recursive: true });

  const data = {
    patterns: Array.from(errorMemory.patterns.entries()),
    totalPatterns: errorMemory.totalPatterns,
    lastUpdated: errorMemory.lastUpdated,
  };

  await writeFile(join(dir, 'error-memory.json'), JSON.stringify(data, null, 2));
}

/**
 * Loads error memory from disk
 */
export async function loadErrorMemory(projectId: string): Promise<ErrorMemory> {
  const { readFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');

  const dir = join(process.cwd(), 'memory', 'repair', projectId);
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, 'error-memory.json');

  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return {
      patterns: new Map(data.patterns),
      totalPatterns: data.totalPatterns,
      lastUpdated: data.lastUpdated,
    };
  } catch {
    return createErrorMemory();
  }
}