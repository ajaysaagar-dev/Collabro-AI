// ─── Patch Generator ───────────────────────────────────────────────────────────
// Generates minimal atomic patches for fixing errors

import { ValidationError } from '@/orchestrator/validation';
import { AgentRole } from '@/types/Agent';
import {
  AtomicPatch,
  PatchDiff,
  PatchHunk,
  PatchLine,
  FixStrategy,
  RepairStrategy,
  RootCauseCandidate,
  ErrorDependencyGraph,
  ErrorNode,
} from './types';

/**
 * Generates a minimal atomic patch for a root cause
 */
export async function generatePatch(
  rootCause: RootCauseCandidate,
  fixStrategy: FixStrategy,
  graph: ErrorDependencyGraph,
  fileContent: string
): Promise<AtomicPatch> {
  const patchId = `patch-${rootCause.nodeId}-${Date.now()}`;
  const diff = await generatePatchDiff(rootCause, fixStrategy, fileContent, graph);

  return {
    id: patchId,
    rootCauseId: rootCause.nodeId,
    file: rootCause.error.file,
    strategy: fixStrategy.type,
    description: fixStrategy.description,
    diff,
    confidence: fixStrategy.confidence ?? 0.5,
    risk: assessRisk(rootCause, fixStrategy, graph),
    affectedFiles: fixStrategy.estimatedFiles ?? [],
    requiredValidators: getValidatorsForStrategy(fixStrategy.type),
    prerequisites: findPrerequisites(rootCause, graph),
    createdAt: Date.now(),
    createdBy: determineAgentForStrategy(fixStrategy.type),
    status: 'pending',
  };
}

/**
 * Generates the actual diff for a patch
 */
async function generatePatchDiff(
  rootCause: RootCauseCandidate,
  fixStrategy: FixStrategy,
  fileContent: string,
  graph: ErrorDependencyGraph
): Promise<PatchDiff> {
  // In a real implementation, this would use AST parsing and LLM to generate precise diffs
  // For now, we generate a template based on the strategy

  const lines = fileContent.split('\n');
  const errorLine = rootCause.error.line || 1;

  switch (fixStrategy.type) {
    case 'config-fix':
      return generateConfigFixDiff(rootCause, lines);
    case 'import-fix':
      return generateImportFixDiff(rootCause, lines);
    case 'type-fix':
      return generateTypeFixDiff(rootCause, lines);
    case 'lint-fix':
      return generateLintFixDiff(rootCause, lines);
    case 'build-fix':
      return generateBuildFixDiff(rootCause, lines);
    case 'dependency-fix':
      return generateDependencyFixDiff(rootCause, lines);
    case 'minimal-patch':
    default:
      return generateMinimalPatchDiff(rootCause, lines);
  }
}

/**
 * Generates diff for config file fixes
 */
function generateConfigFixDiff(rootCause: RootCauseCandidate, lines: string[]): PatchDiff {
  // Find the problematic line and fix it
  const errorLine = Math.min(rootCause.error.line || 1, lines.length) - 1;
  const oldLine = lines[errorLine] || '';
  const newLine = fixConfigLine(oldLine, rootCause.error.message);

  return createDiff(lines, errorLine, oldLine, newLine);
}

/**
 * Generates diff for import fixes
 */
function generateImportFixDiff(rootCause: RootCauseCandidate, lines: string[]): PatchDiff {
  const errorLine = Math.min(rootCause.error.line || 1, lines.length) - 1;
  const oldLine = lines[errorLine] || '';
  const newLine = fixImportLine(oldLine, rootCause.error.message);

  return createDiff(lines, errorLine, oldLine, newLine);
}

/**
 * Generates diff for type fixes
 */
function generateTypeFixDiff(rootCause: RootCauseCandidate, lines: string[]): PatchDiff {
  const errorLine = Math.min(rootCause.error.line || 1, lines.length) - 1;
  const oldLine = lines[errorLine] || '';
  const newLine = fixTypeLine(oldLine, rootCause.error.message);

  return createDiff(lines, errorLine, oldLine, newLine);
}

/**
 * Generates diff for lint fixes
 */
function generateLintFixDiff(rootCause: RootCauseCandidate, lines: string[]): PatchDiff {
  const errorLine = Math.min(rootCause.error.line || 1, lines.length) - 1;
  const oldLine = lines[errorLine] || '';
  const newLine = fixLintLine(oldLine, rootCause.error.message);

  return createDiff(lines, errorLine, oldLine, newLine);
}

/**
 * Generates diff for build fixes
 */
function generateBuildFixDiff(rootCause: RootCauseCandidate, lines: string[]): PatchDiff {
  const errorLine = Math.min(rootCause.error.line || 1, lines.length) - 1;
  const oldLine = lines[errorLine] || '';
  const newLine = fixBuildLine(oldLine, rootCause.error.message);

  return createDiff(lines, errorLine, oldLine, newLine);
}

/**
 * Generates diff for dependency fixes
 */
function generateDependencyFixDiff(rootCause: RootCauseCandidate, lines: string[]): PatchDiff {
  // For package.json fixes
  const errorLine = Math.min(rootCause.error.line || 1, lines.length) - 1;
  const oldLine = lines[errorLine] || '';
  const newLine = fixDependencyLine(oldLine, rootCause.error.message);

  return createDiff(lines, errorLine, oldLine, newLine);
}

/**
 * Generates minimal patch diff
 */
function generateMinimalPatchDiff(rootCause: RootCauseCandidate, lines: string[]): PatchDiff {
  const errorLine = Math.min(rootCause.error.line || 1, lines.length) - 1;
  const oldLine = lines[errorLine] || '';
  const newLine = generateFixForLine(oldLine, rootCause.error.message);

  return createDiff(lines, errorLine, oldLine, newLine);
}

/**
 * Creates a diff from old/new lines
 */
function createDiff(lines: string[], lineIndex: number, oldLine: string, newLine: string): PatchDiff {
  const contextLines = 3;
  const start = Math.max(0, lineIndex - contextLines);
  const end = Math.min(lines.length, lineIndex + contextLines + 1);

  const hunkLines: PatchLine[] = [];

  // Context before
  for (let i = start; i < lineIndex; i++) {
    hunkLines.push({ type: 'context', content: lines[i], lineNumber: i + 1 });
  }

  // Removed line
  hunkLines.push({ type: 'remove', content: oldLine, lineNumber: lineIndex + 1 });

  // Added line
  hunkLines.push({ type: 'add', content: newLine, lineNumber: lineIndex + 1 });

  // Context after
  for (let i = lineIndex + 1; i < end; i++) {
    hunkLines.push({ type: 'context', content: lines[i], lineNumber: i + 1 });
  }

  const hunk: PatchHunk = {
    oldStart: start + 1,
    oldLines: end - start,
    newStart: start + 1,
    newLines: end - start + 1, // +1 for added line
    lines: hunkLines,
  };

  return {
    oldContent: lines.join('\n'),
    newContent: [
      ...lines.slice(0, lineIndex),
      newLine,
      ...lines.slice(lineIndex + 1),
    ].join('\n'),
    hunks: [hunk],
    linesAdded: 1,
    linesRemoved: 1,
    linesChanged: 1,
  };
}

// ─── Fix Generators (simplified - would use LLM in production) ────────────────

function fixConfigLine(line: string, error: string): string {
  // Common config fixes
  if (error.includes('missing') && error.includes('script')) {
    return line.replace(/("scripts":\s*\{)/, '$1\n    "build": "next build",');
  }
  if (error.includes('typescript') || error.includes('tsconfig')) {
    return line.replace(/("compilerOptions":\s*\{)/, '$1\n    "strict": true,');
  }
  if (error.includes('tailwind')) {
    return line.replace(/module\.exports\s*=/, 'module.exports = {\n  content: ["./src/**/*.{js,ts,jsx,tsx}"],\n');
  }
  // Generic: add missing property
  return line + '  // FIXED: ' + error.substring(0, 50);
}

function fixImportLine(line: string, error: string): string {
  if (error.includes('Cannot find module')) {
    const match = error.match(/['"]([^'"]+)['"]/);
    if (match) {
      const missingModule = match[1];
      // Try to fix relative import
      if (missingModule.startsWith('.')) {
        return line.replace(missingModule, './' + missingModule);
      }
    }
  }
  if (error.includes('has no exported member')) {
    const match = error.match(/['"]([^'"]+)['"]/);
    if (match) {
      return line.replace(`from '${match[1]}'`, `from '${match[1]}' // TODO: check exports`);
    }
  }
  return line + '  // FIXED IMPORT: ' + error.substring(0, 50);
}

function fixTypeLine(line: string, error: string): string {
  if (error.includes('Property') && error.includes('does not exist')) {
    const match = error.match(/Property '(\w+)'/);
    if (match) {
      const prop = match[1];
      return line + `  // @ts-ignore // TODO: add type for ${prop}`;
    }
  }
  if (error.includes('Type') && error.includes('is not assignable')) {
    return line + '  // @ts-ignore // Type mismatch';
  }
  if (error.includes('Cannot find name')) {
    const match = error.match(/name '(\w+)'/);
    if (match) {
      return line + `  // TODO: import ${match[1]}`;
    }
  }
  return line + '  // FIXED TYPE: ' + error.substring(0, 50);
}

function fixLintLine(line: string, error: string): string {
  if (error.includes('no-unused-vars')) {
    const match = error.match(/['"]([^'"]+)['"]/);
    if (match) {
      const varName = match[1];
      return line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    }
  }
  if (error.includes('prefer-const')) {
    return line.replace(/\blet\b/, 'const');
  }
  if (error.includes('no-console')) {
    return line.replace(/console\.\w+\(/, '// console.log(');
  }
  return line + '  // FIXED LINT: ' + error.substring(0, 50);
}

function fixBuildLine(line: string, error: string): string {
  if (error.includes('Module not found')) {
    return line + '  // FIXED BUILD: ' + error.substring(0, 50);
  }
  return line + '  // FIXED BUILD: ' + error.substring(0, 50);
}

function fixDependencyLine(line: string, error: string): string {
  if (error.includes('missing') || error.includes('not found')) {
    const match = error.match(/['"]([^'"]+)['"]/);
    if (match) {
      const dep = match[1];
      return line + `, "${dep}": "latest"`;
    }
  }
  return line + '  // FIXED DEP: ' + error.substring(0, 50);
}

function generateFixForLine(line: string, error: string): string {
  // Generic fix - in production this would use an LLM
  return line + '  // AUTO-FIX: ' + error.substring(0, 60);
}

/**
 * Finds prerequisite patches
 */
function findPrerequisites(rootCause: RootCauseCandidate, graph: ErrorDependencyGraph): string[] {
  const prerequisites: string[] = [];
  const node = graph.nodes.get(rootCause.nodeId);
  if (!node) return prerequisites;

  for (const depId of node.dependencies) {
    const depNode = graph.nodes.get(depId);
    if (depNode && depNode.isRootCause) {
      prerequisites.push(depNode.error.file);
    }
  }

  return prerequisites;
}

/**
 * Gets validators for a strategy
 */
function getValidatorsForStrategy(strategy: RepairStrategy): string[] {
  const validatorMap: Record<RepairStrategy, string[]> = {
    'config-fix': ['Project Structure', 'Dependencies', 'Type Check', 'Build'],
    'import-fix': ['Type Check', 'Static Analysis', 'Build'],
    'type-fix': ['Type Check', 'Build'],
    'lint-fix': ['Lint', 'Formatting'],
    'build-fix': ['Build', 'Type Check'],
    'dependency-fix': ['Dependencies', 'Build'],
    'minimal-patch': ['Type Check', 'Lint', 'Build'],
    'ast-transform': ['Type Check', 'Build'],
    'function-rewrite': ['Type Check', 'Lint', 'Build'],
    'module-rewrite': ['Type Check', 'Lint', 'Build', 'Static Analysis'],
    'architecture-review': ['Project Structure', 'Dependencies', 'Type Check', 'Build'],
    'architecture-fix': ['Project Structure', 'Dependencies', 'Type Check', 'Build'],
  };
  return validatorMap[strategy] || ['Type Check', 'Build'];
}

/**
 * Determines which agent should handle a strategy
 */
function determineAgentForStrategy(strategy: RepairStrategy): AgentRole {
  const agentMap: Record<RepairStrategy, AgentRole> = {
    'config-fix': 'architect',
    'import-fix': 'backend-dev',
    'type-fix': 'frontend-dev',
    'lint-fix': 'frontend-dev',
    'build-fix': 'backend-dev',
    'dependency-fix': 'architect',
    'minimal-patch': 'debugger',
    'ast-transform': 'debugger',
    'function-rewrite': 'debugger',
    'module-rewrite': 'backend-dev',
    'architecture-review': 'architect',
    'architecture-fix': 'architect',
  };
  return agentMap[strategy] || 'debugger';
}

/**
 * Assesses risk of a patch
 */
function assessRisk(
  rootCause: RootCauseCandidate,
  fixStrategy: FixStrategy,
  graph: ErrorDependencyGraph
): AtomicPatch['risk'] {
  let riskScore = 0;

  riskScore += (1 - (fixStrategy.confidence ?? 0.5)) * 0.5;
  riskScore += Math.min((fixStrategy.estimatedFiles ?? []).length * 0.1, 0.3);

  const validatorOrder = getValidatorOrder(rootCause.error.stage);
  if (validatorOrder <= 3) riskScore += 0.2;

  const node = graph.nodes.get(rootCause.nodeId);
  if (node && node.dependents.length > 5) riskScore += 0.2;

  if (riskScore >= 0.6) return 'high';
  if (riskScore >= 0.3) return 'medium';
  return 'low';
}

function getValidatorOrder(validator: string): number {
  const order: Record<string, number> = {
    'Project Structure': 1,
    'Dependencies': 2,
    'Environment': 3,
    'Type Check': 4,
    'Lint': 5,
    'Formatting': 6,
    'Static Analysis': 7,
    'Build': 8,
    'Dev Server': 9,
    'Runtime Validation': 10,
  };
  return order[validator] || 99;
}

/**
 * Generates multiple patch options for a root cause (for strategy rotation)
 */
export async function generatePatchOptions(
  rootCause: RootCauseCandidate,
  graph: ErrorDependencyGraph,
  fileContent: string,
  strategy: RepairStrategy
): Promise<AtomicPatch[]> {
  const patches: AtomicPatch[] = [];

  // Generate patch for the requested strategy
  const fixStrategy = generateFixStrategyForType(rootCause, strategy, graph);
  const patch = await generatePatch(rootCause, fixStrategy, graph, fileContent);
  patches.push(patch);

  return patches;
}

/**
 * Generates fix strategy for a specific type
 */
function generateFixStrategyForType(
  rootCause: RootCauseCandidate,
  strategy: RepairStrategy,
  graph: ErrorDependencyGraph
): FixStrategy {
  const error = rootCause.error;

  const strategies: Record<RepairStrategy, FixStrategy> = {
    'config-fix': {
      type: 'config-fix',
      description: `Fix configuration in ${error.file}`,
      approach: 'Modify configuration file to resolve cascading errors',
      steps: ['Analyze config', 'Apply minimal fix', 'Validate'],
      estimatedFiles: [error.file],
      confidence: 0.9,
    },
    'import-fix': {
      type: 'import-fix',
      description: `Fix import in ${error.file}`,
      approach: 'Correct import paths or add missing exports',
      steps: ['Identify broken imports', 'Fix paths', 'Verify'],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.85,
    },
    'type-fix': {
      type: 'type-fix',
      description: `Fix TypeScript errors in ${error.file}`,
      approach: 'Add missing types or fix type mismatches',
      steps: ['Analyze type errors', 'Add annotations', 'Verify'],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.8,
    },
    'lint-fix': {
      type: 'lint-fix',
      description: `Fix linting in ${error.file}`,
      approach: 'Apply eslint fixes',
      steps: ['Run eslint --fix', 'Manual fixes', 'Verify'],
      estimatedFiles: [error.file],
      confidence: 0.95,
    },
    'build-fix': {
      type: 'build-fix',
      description: `Fix build errors in ${error.file}`,
      approach: 'Resolve compilation errors',
      steps: ['Identify build errors', 'Fix syntax/types', 'Build'],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.75,
    },
    'dependency-fix': {
      type: 'dependency-fix',
      description: 'Fix dependency issues',
      approach: 'Install missing packages, resolve conflicts',
      steps: ['Analyze deps', 'Install', 'Verify'],
      estimatedFiles: ['package.json', 'package-lock.json'],
      confidence: 0.9,
    },
    'minimal-patch': {
      type: 'minimal-patch',
      description: `Minimal fix for ${error.file}`,
      approach: 'Smallest possible change',
      steps: ['Analyze error', 'Generate fix', 'Validate'],
      estimatedFiles: [error.file],
      confidence: 0.7,
    },
    'ast-transform': {
      type: 'ast-transform',
      description: `AST transform on ${error.file}`,
      approach: 'Use AST for precise transformation',
      steps: ['Parse AST', 'Transform', 'Regenerate'],
      estimatedFiles: [error.file],
      confidence: 0.8,
    },
    'function-rewrite': {
      type: 'function-rewrite',
      description: `Rewrite function in ${error.file}`,
      approach: 'Rewrite problematic function',
      steps: ['Identify function', 'Rewrite', 'Test'],
      estimatedFiles: [error.file],
      confidence: 0.6,
    },
    'module-rewrite': {
      type: 'module-rewrite',
      description: `Rewrite module ${error.file}`,
      approach: 'Complete module rewrite',
      steps: ['Analyze', 'Design', 'Implement', 'Replace'],
      estimatedFiles: [error.file, ...findRelatedFiles(error.file, graph)],
      confidence: 0.5,
    },
    'architecture-review': {
      type: 'architecture-review',
      description: 'Architecture review needed',
      approach: 'Fundamental redesign',
      steps: ['Review', 'Identify flaws', 'Redesign', 'Migrate'],
      estimatedFiles: Array.from(graph.nodes.keys()).map(n => graph.nodes.get(n)!.error.file).slice(0, 10),
      confidence: 0.4,
    },
    'architecture-fix': {
      type: 'architecture-fix',
      description: `Architectural fix for ${error.file}`,
      approach: 'Fundamental redesign of architectural relations',
      steps: ['Review design', 'Refactor modules', 'Migrate'],
      estimatedFiles: [error.file],
      confidence: 0.5,
    },
  };

  return strategies[strategy] || strategies['minimal-patch'];
}

/**
 * Finds related files
 */
function findRelatedFiles(file: string, graph: ErrorDependencyGraph): string[] {
  const node = Array.from(graph.nodes.values()).find(n => n.error.file === file);
  if (!node) return [];

  const related = new Set<string>();
  for (const depId of node.dependents) {
    const depNode = graph.nodes.get(depId);
    if (depNode) related.add(depNode.error.file);
  }
  for (const depId of node.dependencies) {
    const depNode = graph.nodes.get(depId);
    if (depNode) related.add(depNode.error.file);
  }

  return Array.from(related).slice(0, 5);
}