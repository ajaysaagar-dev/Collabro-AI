// ─── Patch Reviewer ─────────────────────────────────────────────────────────────
// Reviews patches for correctness, safety, and confidence before application

import { ValidationError } from '@/orchestrator/validation';
import { AgentRole } from '@/types/Agent';
import { FileLockManager } from './file-lock-manager';
import {
  AtomicPatch,
  PatchReview,
  PatchDiff,
  PatchChange,
  RiskAssessment,
  RepairStrategy,
  PatchConfidenceThresholds,
  RepairOrchestratorConfig,
} from './types';

const DEFAULT_THRESHOLDS: PatchConfidenceThresholds = {
  autoApply: 0.85,
  reviewRequired: 0.60,
  reject: 0.40,
};

const DEFAULT_REVIEW_CONFIG = {
  maxRiskForAutoApply: 'medium' as const,
  requireHumanForHighRisk: true,
  enableSecurityReview: true,
  enablePerformanceReview: true,
  maxPatchSizeLines: 500,
};

/**
 * Reviews a patch and returns approval decision
 */
export async function reviewPatch(
  patch: AtomicPatch,
  fileContent: string,
  lockManager: FileLockManager,
  thresholds: PatchConfidenceThresholds = DEFAULT_THRESHOLDS,
  config = DEFAULT_REVIEW_CONFIG
): Promise<PatchReview> {
  const concerns: string[] = [];
  const suggestedChanges: PatchChange[] = [];

  // 1. Check confidence threshold
  const confidenceCheck = checkConfidence(patch, thresholds);
  if (!confidenceCheck.passed) {
    concerns.push(confidenceCheck.message);
  }

  // 2. Check risk level
  const riskCheck = checkRisk(patch, config);
  if (!riskCheck.passed) {
    concerns.push(riskCheck.message);
  }

  // 3. Check file lock status
  const lockCheck = checkFileLock(patch, lockManager);
  if (!lockCheck.passed) {
    concerns.push(lockCheck.message);
  }

  // 4. Check patch size
  const sizeCheck = checkPatchSize(patch, config);
  if (!sizeCheck.passed) {
    concerns.push(sizeCheck.message);
  }

  // 5. Check for dangerous patterns
  const securityCheck = checkSecurityPatterns(patch, fileContent);
  if (!securityCheck.passed) {
    concerns.push(...securityCheck.messages);
  }

  // 6. Check for performance anti-patterns
  const perfCheck = checkPerformancePatterns(patch, fileContent);
  if (!perfCheck.passed) {
    concerns.push(...perfCheck.messages);
  }

  // 7. Validate diff correctness
  const diffCheck = validateDiff(patch, fileContent);
  if (!diffCheck.passed) {
    concerns.push(...diffCheck.messages);
  }

  // Determine overall approval
  const approved = concerns.length === 0;
  const confidence = calculateReviewConfidence(patch, concerns);

  // Generate risk assessment
  const riskAssessment = generateRiskAssessment(patch, concerns);

  // Generate suggested changes if concerns exist
  if (concerns.length > 0) {
    suggestedChanges.push(...generateSuggestedChanges(patch, concerns));
  }

  return {
    patchId: patch.id,
    reviewer: 'patch-reviewer',
    approved,
    confidence,
    concerns,
    suggestedChanges: suggestedChanges.length > 0 ? suggestedChanges : undefined,
    riskAssessment,
    reviewedAt: Date.now(),
  };
}

/**
 * Checks patch confidence against thresholds
 */
function checkConfidence(
  patch: AtomicPatch,
  thresholds: PatchConfidenceThresholds
): { passed: boolean; message: string } {
  if (patch.confidence >= thresholds.autoApply) {
    return { passed: true, message: '' };
  }
  if (patch.confidence < thresholds.reject) {
    return {
      passed: false,
      message: `Patch confidence ${(patch.confidence * 100).toFixed(0)}% below reject threshold ${(thresholds.reject * 100).toFixed(0)}%`,
    };
  }
  return {
    passed: true, // Not a blocker, but will require review
    message: `Patch confidence ${(patch.confidence * 100).toFixed(0)}% requires review (below auto-apply ${(thresholds.autoApply * 100).toFixed(0)}%)`,
  };
}

/**
 * Checks patch risk level
 */
function checkRisk(
  patch: AtomicPatch,
  config: typeof DEFAULT_REVIEW_CONFIG
): { passed: boolean; message: string } {
  const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const maxRisk = riskOrder[config.maxRiskForAutoApply];
  const patchRisk = riskOrder[patch.risk];

  if (patchRisk > maxRisk) {
    return {
      passed: false,
      message: `Patch risk level "${patch.risk}" exceeds maximum "${config.maxRiskForAutoApply}" for auto-apply`,
    };
  }

  if (config.requireHumanForHighRisk && patchRisk >= riskOrder.high) {
    return {
      passed: true, // Not a blocker but requires human
      message: `High-risk patch requires human review`,
    };
  }

  return { passed: true, message: '' };
}

/**
 * Checks if file is locked
 */
function checkFileLock(
  patch: AtomicPatch,
  lockManager: FileLockManager
): { passed: boolean; message: string } {
  const check = lockManager.canEdit(patch.file, patch.id);
  if (!check.allowed) {
    return { passed: false, message: `File locked: ${check.reason}` };
  }
  return { passed: true, message: '' };
}

/**
 * Checks patch size
 */
function checkPatchSize(
  patch: AtomicPatch,
  config: typeof DEFAULT_REVIEW_CONFIG
): { passed: boolean; message: string } {
  const totalLines = patch.diff.linesAdded + patch.diff.linesRemoved + patch.diff.linesChanged;
  if (totalLines > config.maxPatchSizeLines) {
    return {
      passed: false,
      message: `Patch size (${totalLines} lines) exceeds maximum (${config.maxPatchSizeLines} lines)`,
    };
  }
  return { passed: true, message: '' };
}

/**
 * Checks for dangerous security patterns
 */
function checkSecurityPatterns(
  patch: AtomicPatch,
  fileContent: string
): { passed: boolean; messages: string[] } {
  const messages: string[] = [];
  const newContent = patch.diff.newContent;

  // Check for eval, Function constructor
  if (/\beval\s*\(/.test(newContent)) {
    messages.push('Security: eval() usage detected');
  }
  if (/new Function\s*\(/.test(newContent)) {
    messages.push('Security: Function constructor usage detected');
  }

  // Check for innerHTML with user input
  if (/\.innerHTML\s*=/.test(newContent) && !/\.textContent/.test(newContent)) {
    messages.push('Security: innerHTML assignment without sanitization');
  }

  // Check for dangerouslySetInnerHTML
  if (/dangerouslySetInnerHTML/.test(newContent)) {
    messages.push('Security: dangerouslySetInnerHTML usage detected');
  }

  // Check for SQL injection patterns
  if (/query\s*\(\s*[`"']/.test(newContent)) {
    messages.push('Security: Potential SQL injection - template literal in query');
  }

  // Check for exposed secrets
  if (/(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']+["']/i.test(newContent)) {
    messages.push('Security: Potential hardcoded secret detected');
  }

  return { passed: messages.length === 0, messages };
}

/**
 * Checks for performance anti-patterns
 */
function checkPerformancePatterns(
  patch: AtomicPatch,
  fileContent: string
): { passed: boolean; messages: string[] } {
  const messages: string[] = [];
  const newContent = patch.diff.newContent;

  // Check for nested loops in added code
  const addedLines = patch.diff.hunks.flatMap(h =>
    h.lines.filter(l => l.type === 'add').map(l => l.content)
  );
  const addedCode = addedLines.join('\n');

  if (addedCode.match(/for\s*\([^)]*\)\s*\{[^}]*for\s*\(/)) {
    messages.push('Performance: Nested loops detected in added code');
  }

  // Check for synchronous I/O in async context
  if (/\.readFileSync\s*\(/.test(addedCode) || /\.writeFileSync\s*\(/.test(addedCode)) {
    messages.push('Performance: Synchronous file I/O in added code');
  }

  // Check for large array operations without optimization
  if (/\.map\([^)]*\)\.filter\([^)]*\)/.test(addedCode)) {
    messages.push('Performance: Consider combining map/filter');
  }

  // Check for console.log in production code
  if (/console\.(log|warn|error)\s*\(/.test(addedCode)) {
    messages.push('Performance: Console logging in added code (consider removing)');
  }

  return { passed: messages.length === 0, messages };
}

/**
 * Validates diff correctness
 */
function validateDiff(
  patch: AtomicPatch,
  fileContent: string
): { passed: boolean; messages: string[] } {
  const messages: string[] = [];

  // Check that old content matches
  if (patch.diff.oldContent !== fileContent) {
    messages.push('Diff validation: oldContent does not match current file content');
  }

  // Check hunks are valid
  for (const hunk of patch.diff.hunks) {
    if (hunk.oldStart < 1) {
      messages.push('Diff validation: invalid oldStart line number');
    }
    if (hunk.newStart < 1) {
      messages.push('Diff validation: invalid newStart line number');
    }
    if (hunk.lines.length === 0) {
      messages.push('Diff validation: empty hunk');
    }

    // Check line types
    let hasAdd = false, hasRemove = false;
    for (const line of hunk.lines) {
      if (line.type === 'add') hasAdd = true;
      if (line.type === 'remove') hasRemove = true;
    }
    if (!hasAdd && !hasRemove) {
      messages.push('Diff validation: hunk has no changes');
    }
  }

  return { passed: messages.length === 0, messages };
}

/**
 * Calculates review confidence
 */
function calculateReviewConfidence(patch: AtomicPatch, concerns: string[]): number {
  let confidence = patch.confidence;

  // Reduce for each concern
  confidence -= concerns.length * 0.1;

  // Reduce for high risk
  if (patch.risk === 'high') confidence -= 0.15;
  if (patch.risk === 'critical') confidence -= 0.3;

  // Reduce for many affected files
  if (patch.affectedFiles.length > 5) confidence -= 0.1;
  if (patch.affectedFiles.length > 10) confidence -= 0.2;

  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Generates risk assessment
 */
function generateRiskAssessment(patch: AtomicPatch, concerns: string[]): RiskAssessment {
  const regressionRisk = calculateRegressionRisk(patch, concerns);
  const complexityRisk = calculateComplexityRisk(patch);
  const dependencyRisk = calculateDependencyRisk(patch);

  const overallRisk = Math.max(regressionRisk, complexityRisk, dependencyRisk);

  let riskLevel: RiskAssessment['overallRisk'] = 'low';
  if (overallRisk > 0.7) riskLevel = 'critical';
  else if (overallRisk > 0.5) riskLevel = 'high';
  else if (overallRisk > 0.3) riskLevel = 'medium';

  const mitigation: string[] = [];
  if (regressionRisk > 0.5) mitigation.push('Run full test suite after applying');
  if (complexityRisk > 0.5) mitigation.push('Manual code review recommended');
  if (dependencyRisk > 0.5) mitigation.push('Validate dependent modules');
  if (patch.risk === 'high' || patch.risk === 'critical') mitigation.push('Require human approval');
  if (patch.affectedFiles.length > 3) mitigation.push('Apply incrementally with validation between each');

  return {
    regressionRisk,
    complexityRisk,
    dependencyRisk,
    overallRisk: riskLevel,
    mitigation,
  };
}

function calculateRegressionRisk(patch: AtomicPatch, concerns: string[]): number {
  let risk = 0;
  risk += concerns.length * 0.1;
  risk += (1 - patch.confidence) * 0.3;
  if (patch.risk === 'high') risk += 0.2;
  if (patch.risk === 'critical') risk += 0.4;
  return Math.min(1.0, risk);
}

function calculateComplexityRisk(patch: AtomicPatch): number {
  let risk = 0;
  const totalChanges = patch.diff.linesAdded + patch.diff.linesRemoved + patch.diff.linesChanged;
  risk += Math.min(totalChanges / 100, 0.3);
  risk += patch.diff.hunks.length * 0.05;
  if (patch.strategy === 'module-rewrite' || patch.strategy === 'architecture-review') {
    risk += 0.4;
  }
  return Math.min(1.0, risk);
}

function calculateDependencyRisk(patch: AtomicPatch): number {
  return Math.min(patch.affectedFiles.length * 0.1, 0.5);
}

/**
 * Generates suggested changes for concerns
 */
function generateSuggestedChanges(patch: AtomicPatch, concerns: string[]): PatchChange[] {
  const changes: PatchChange[] = [];

  for (const concern of concerns) {
    if (concern.includes('confidence')) {
      changes.push({
        type: 'review',
        description: 'Patch confidence below threshold - requires human review',
      });
    } else if (concern.includes('risk')) {
      changes.push({
        type: 'defer',
        description: 'High risk patch - defer to architecture review',
      });
    } else if (concern.includes('locked')) {
      changes.push({
        type: 'defer',
        description: 'Wait for file lock to be released',
      });
    } else if (concern.includes('size')) {
      changes.push({
        type: 'split',
        description: 'Split large patch into smaller atomic patches',
      });
    } else if (concern.includes('Security')) {
      changes.push({
        type: 'reject',
        description: 'Security concern detected - reject and redesign',
      });
    } else if (concern.includes('Performance')) {
      changes.push({
        type: 'modify',
        description: 'Optimize performance anti-patterns in patch',
      });
    }
  }

  return changes;
}

/**
 * Reviews multiple patches as a batch
 */
export async function reviewPatchBatch(
  patches: AtomicPatch[],
  fileContents: Map<string, string>,
  lockManager: FileLockManager,
  thresholds: PatchConfidenceThresholds = DEFAULT_THRESHOLDS
): Promise<PatchReview[]> {
  const reviews: PatchReview[] = [];

  for (const patch of patches) {
    const fileContent = fileContents.get(patch.file) || '';
    const review = await reviewPatch(patch, fileContent, lockManager, thresholds);
    reviews.push(review);
  }

  return reviews;
}

/**
 * Gets patches that are approved for auto-apply
 */
export function getAutoApplyPatches(reviews: PatchReview[]): PatchReview[] {
  return reviews.filter(r => r.approved && r.confidence >= DEFAULT_THRESHOLDS.autoApply);
}

/**
 * Gets patches that need human review
 */
export function getReviewRequiredPatches(reviews: PatchReview[]): PatchReview[] {
  return reviews.filter(r =>
    !r.approved ||
    r.confidence < DEFAULT_THRESHOLDS.autoApply ||
    r.riskAssessment.overallRisk === 'high' ||
    r.riskAssessment.overallRisk === 'critical'
  );
}

/**
 * Gets patches that should be rejected
 */
export function getRejectedPatches(reviews: PatchReview[]): PatchReview[] {
  return reviews.filter(r =>
    r.confidence < DEFAULT_THRESHOLDS.reject ||
    r.riskAssessment.overallRisk === 'critical' ||
    r.concerns.some(c => c.includes('Security'))
  );
}