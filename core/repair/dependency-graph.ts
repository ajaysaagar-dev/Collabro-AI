// ─── Error Dependency Graph ────────────────────────────────────────────────────
// Builds and manages the dependency graph of errors to identify root causes

import path from 'path';
import fs from 'fs/promises';
import { ValidationError } from '@/orchestrator/validation';
import {
  ErrorDependencyGraph,
  ErrorNode,
  ErrorEdge,
  RootCauseAnalysis,
  RootCauseCandidate,
  FileDependencyGraph,
  FileNode,
  FileEdge,
  DependencyGraphConfig,
  ErrorCluster,
  ClusterType
} from './types';

const DEFAULT_CONFIG: DependencyGraphConfig = {
  maxDepth: 10,
  includeTransitive: true,
  clusterByModule: true,
  minClusterSize: 2,
};

/**
 * Builds an error dependency graph from validation errors
 */
export function buildErrorDependencyGraph(
  errors: ValidationError[],
  fileDependencyGraph: FileDependencyGraph,
  config: DependencyGraphConfig = DEFAULT_CONFIG
): ErrorDependencyGraph {
  const nodes = new Map<string, ErrorNode>();
  const edges: ErrorEdge[] = [];

  // Create nodes for each error
  for (const error of errors) {
    const nodeId = createErrorNodeId(error);
    const node: ErrorNode = {
      id: nodeId,
      error,
      fingerprint: generateErrorNodeFingerprint(error),
      dependents: [],
      dependencies: [],
      clusterId: '',
      rootCauseScore: 0,
      isRootCause: false,
      validated: false,
    };
    nodes.set(nodeId, node);
  }

  // Build edges based on file dependencies
  for (const [nodeId, node] of nodes) {
    const dependentErrors = findDependentErrors(node, nodes, fileDependencyGraph);
    for (const dep of dependentErrors) {
      const edge: ErrorEdge = {
        from: nodeId,
        to: dep.id,
        type: 'file-dependency',
        strength: calculateEdgeStrength(node, dep),
      };
      edges.push(edge);
      node.dependents.push(dep.id);
      dep.dependencies.push(nodeId);
    }
  }

  // Build reverse edges for dependencies
  for (const edge of edges) {
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (fromNode && toNode) {
      // Already added above
    }
  }

  // Cluster errors
  const clusters = clusterErrors(nodes, edges, config);

  // Assign cluster IDs
  for (const cluster of clusters) {
    for (const nodeId of cluster.nodeIds) {
      const node = nodes.get(nodeId);
      if (node) node.clusterId = cluster.id;
    }
  }

  // Calculate root cause scores
  calculateRootCauseScores(nodes, edges);

  return {
    nodes,
    edges,
    clusters,
    fileDependencyGraph,
    rootCauses: [],
    analyzedAt: Date.now(),
  };
}

/**
 * Creates a unique node ID for an error
 */
function createErrorNodeId(error: ValidationError): string {
  return `${error.stage}|${error.file}|${error.line || 0}|${error.column || 0}|${hashString(error.message).substring(0, 8)}`;
}

/**
 * Generates a fingerprint for an error node
 */
function generateErrorNodeFingerprint(error: ValidationError): string {
  return hashString(`${error.stage}|${error.file}|${error.message}`);
}

/**
 * Finds errors that depend on this error (i.e., errors in files that import this file)
 */
function findDependentErrors(
  node: ErrorNode,
  allNodes: Map<string, ErrorNode>,
  fileGraph: FileDependencyGraph
): ErrorNode[] {
  const dependents: ErrorNode[] = [];
  const nodeFile = node.error.file;

  // Find files that depend on this file
  const dependentFiles = findDependentFiles(nodeFile, fileGraph);

  for (const [, otherNode] of allNodes) {
    if (otherNode.id === node.id) continue;
    if (dependentFiles.has(otherNode.error.file)) {
      dependents.push(otherNode);
    }
  }

  return dependents;
}

/**
 * Finds all files that transitively depend on a given file
 */
function findDependentFiles(file: string, fileGraph: FileDependencyGraph): Set<string> {
  const dependents = new Set<string>();
  const visited = new Set<string>();

  function traverse(f: string) {
    if (visited.has(f)) return;
    visited.add(f);

    const node = fileGraph.nodes.get(f);
    if (!node) return;

    for (const edge of node.outgoing) {
      dependents.add(edge.to);
      traverse(edge.to);
    }
  }

  traverse(file);
  return dependents;
}

/**
 * Calculates edge strength based on error relationship
 */
function calculateEdgeStrength(from: ErrorNode, to: ErrorNode): number {
  let strength = 0.5; // base

  // Same validator = stronger
  if (from.error.stage === to.error.stage) strength += 0.2;

  // Same file = strongest
  if (from.error.file === to.error.file) strength += 0.3;

  // Severity match
  if (from.error.severity === to.error.severity) strength += 0.1;

  return Math.min(1.0, strength);
}

/**
 * Clusters errors using the dependency graph
 */
function clusterErrors(
  nodes: Map<string, ErrorNode>,
  edges: ErrorEdge[],
  config: DependencyGraphConfig
): ErrorCluster[] {
  const clusters: ErrorCluster[] = [];
  const visited = new Set<string>();

  for (const [nodeId, node] of nodes) {
    if (visited.has(nodeId)) continue;

    const clusterNodes = findConnectedComponent(nodeId, nodes, edges);
    if (clusterNodes.size < config.minClusterSize) {
      // Mark as singleton
      for (const nId of clusterNodes) {
        visited.add(nId);
      }
      continue;
    }

    // Determine cluster type
    const type = determineClusterType(clusterNodes, nodes);

    const cluster: ErrorCluster = {
      id: hashString([...clusterNodes].join(',')).substring(0, 12),
      type,
      validator: [...clusterNodes].map(id => nodes.get(id)!.error)[0]?.stage || 'unknown',
      files: [...new Set([...clusterNodes].map(id => nodes.get(id)!.error.file))],
      nodeIds: [...clusterNodes],
      errors: [...clusterNodes].map(id => nodes.get(id)!.error),
      rootCauseCandidates: findClusterRootCauses(clusterNodes, nodes, edges),
      severity: calculateClusterSeverity(clusterNodes, nodes),
      fileCount: new Set([...clusterNodes].map(id => nodes.get(id)!.error.file)).size,
      validatorCount: new Set([...clusterNodes].map(id => nodes.get(id)!.error.stage)).size,
    };

    clusters.push(cluster);
    for (const nId of clusterNodes) visited.add(nId);
  }

  return clusters.sort((a, b) => b.errors.length - a.errors.length);
}

/**
 * Finds connected component in the error graph
 */
function findConnectedComponent(
  startId: string,
  nodes: Map<string, ErrorNode>,
  edges: ErrorEdge[]
): Set<string> {
  const component = new Set<string>();
  const queue = [startId];

  // Build adjacency
  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, new Set());
    if (!adj.has(edge.to)) adj.set(edge.to, new Set());
    adj.get(edge.from)!.add(edge.to);
    adj.get(edge.to)!.add(edge.from);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (component.has(current)) continue;
    component.add(current);

    const neighbors = adj.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!component.has(neighbor)) queue.push(neighbor);
      }
    }
  }

  return component;
}

/**
 * Determines the type of an error cluster
 */
function determineClusterType(
  nodeIds: Set<string>,
  nodes: Map<string, ErrorNode>
): ClusterType {
  const errors = [...nodeIds].map(id => nodes.get(id)!.error);
  const validators = new Set(errors.map(e => e.stage));
  const files = new Set(errors.map(e => e.file));

  if (validators.size === 1) return 'validator';
  if (files.size === 1) return 'file';
  if (errors.some(e => e.message.includes('import') || e.message.includes('module'))) return 'dependency';

  return 'mixed';
}

/**
 * Finds root cause candidates within a cluster
 */
function findClusterRootCauses(
  nodeIds: Set<string>,
  nodes: Map<string, ErrorNode>,
  edges: ErrorEdge[]
): RootCauseCandidate[] {
  const candidates: RootCauseCandidate[] = [];

  for (const nodeId of nodeIds) {
    const node = nodes.get(nodeId)!;
    let score = 0;
    const reasons: string[] = [];

    // Fewer dependencies = more likely root cause
    const depCount = node.dependencies.length;
    if (depCount === 0) {
      score += 0.4;
      reasons.push('No dependencies (independent error)');
    } else if (depCount <= 2) {
      score += 0.2;
      reasons.push('Few dependencies');
    }

    // Many dependents = more likely root cause
    const dependentCount = node.dependents.length;
    if (dependentCount > 5) {
      score += 0.3;
      reasons.push(`Many dependents (${dependentCount})`);
    } else if (dependentCount > 0) {
      score += 0.15;
      reasons.push(`Has ${dependentCount} dependents`);
    }

    // Early in validation hierarchy = more likely root cause
    const validatorOrder = getValidatorOrder(node.error.stage);
    if (validatorOrder <= 3) {
      score += 0.2;
      reasons.push('Early validation stage');
    }

    // Config/build files often root causes
    if (isConfigFile(node.error.file)) {
      score += 0.15;
      reasons.push('Configuration file');
    }

    if (score > 0) {
      candidates.push({
        nodeId,
        score: Math.min(1.0, score),
        reasons,
        error: node.error,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Calculates cluster severity
 */
function calculateClusterSeverity(
  nodeIds: Set<string>,
  nodes: Map<string, ErrorNode>
): 'error' | 'warning' | 'mixed' {
  let hasError = false;
  let hasWarning = false;

  for (const nodeId of nodeIds) {
    const node = nodes.get(nodeId)!;
    if (node.error.severity === 'error') hasError = true;
    if (node.error.severity === 'warning') hasWarning = true;
  }

  if (hasError && hasWarning) return 'mixed';
  if (hasError) return 'error';
  return 'warning';
}

/**
 * Calculates root cause scores for all nodes
 */
function calculateRootCauseScores(
  nodes: Map<string, ErrorNode>,
  edges: ErrorEdge[]
): void {
  // PageRank-like algorithm for root cause detection
  const scores = new Map<string, number>();

  // Initialize
  for (const [id, node] of nodes) {
    scores.set(id, 1.0 / nodes.size);
  }

  // Iterate
  for (let iter = 0; iter < 20; iter++) {
    const newScores = new Map<string, number>();

    for (const [id, node] of nodes) {
      let score = 0.15; // damping factor

      // Add score from dependencies (errors that cause this error)
      for (const depId of node.dependencies) {
        const depScore = scores.get(depId) || 0;
        const depNode = nodes.get(depId);
        if (depNode) {
          const outDegree = depNode.dependents.length || 1;
          score += 0.85 * depScore / outDegree;
        }
      }

      newScores.set(id, score);
    }

    // Check convergence
    let maxDiff = 0;
    for (const [id, score] of newScores) {
      maxDiff = Math.max(maxDiff, Math.abs(score - (scores.get(id) || 0)));
    }

    for (const [id, score] of newScores) {
      scores.set(id, score);
    }

    if (maxDiff < 0.001) break;
  }

  // Normalize and assign
  const maxScore = Math.max(...scores.values());
  for (const [id, node] of nodes) {
    node.rootCauseScore = scores.get(id)! / maxScore;
    node.isRootCause = node.rootCauseScore > 0.7;
  }
}

/**
 * Performs root cause analysis on the error graph
 */
export function analyzeRootCauses(graph: ErrorDependencyGraph): RootCauseAnalysis {
  const candidates: RootCauseCandidate[] = [];

  // Collect candidates from all clusters
  for (const cluster of graph.clusters) {
    candidates.push(...cluster.rootCauseCandidates);
  }

  // Also check singleton nodes with high root cause scores
  for (const [, node] of graph.nodes) {
    if (!node.clusterId && node.rootCauseScore > 0.5) {
      candidates.push({
        nodeId: node.id,
        score: node.rootCauseScore,
        reasons: ['High root cause score', 'Independent error'],
        error: node.error,
      });
    }
  }

  // Sort by score
  candidates.sort((a, b) => b.score - a.score);

  // Select top root causes
  const rootCauses = candidates
    .filter(c => c.score > 0.3)
    .slice(0, 5);

  // Build explanation
  const explanation = buildRootCauseExplanation(rootCauses, graph);

  return {
    rootCauses,
    allCandidates: candidates,
    explanation,
    confidence: calculateAnalysisConfidence(rootCauses, graph),
    analyzedAt: Date.now(),
  };
}

/**
 * Builds human-readable explanation of root causes
 */
function buildRootCauseExplanation(
  rootCauses: RootCauseCandidate[],
  graph: ErrorDependencyGraph
): string {
  if (rootCauses.length === 0) {
    return 'No clear root causes identified. Errors appear to be independent or circular.';
  }

  const lines = ['Root Cause Analysis:', ''];

  for (let i = 0; i < rootCauses.length; i++) {
    const rc = rootCauses[i];
    const node = graph.nodes.get(rc.nodeId);
    lines.push(`${i + 1}. ${rc.error.stage} in ${rc.error.file}${rc.error.line ? `:${rc.error.line}` : ''}`);
    lines.push(`   Score: ${(rc.score * 100).toFixed(0)}%`);
    lines.push(`   Reasons: ${rc.reasons.join(', ')}`);
    lines.push(`   Message: ${rc.error.message.substring(0, 100)}...`);
    lines.push('');
  }

  // Add dependency chain info
  const totalErrors = graph.nodes.size;
  const clusteredErrors = Array.from(graph.nodes.values()).filter(n => n.clusterId).length;
  lines.push(`Total Errors: ${totalErrors}`);
  lines.push(`Clustered Errors: ${clusteredErrors}`);
  lines.push(`Independent Errors: ${totalErrors - clusteredErrors}`);

  return lines.join('\n');
}

/**
 * Calculates confidence in root cause analysis
 */
function calculateAnalysisConfidence(
  rootCauses: RootCauseCandidate[],
  graph: ErrorDependencyGraph
): number {
  if (rootCauses.length === 0) return 0.1;

  const topScore = rootCauses[0].score;
  const scoreSpread = rootCauses.length > 1 ? rootCauses[0].score - rootCauses[1].score : topScore;
  const clusterCoverage = graph.clusters.reduce((sum, c) => sum + c.errors.length, 0) / graph.nodes.size;

  return Math.min(0.95, (topScore * 0.5) + (scoreSpread * 0.3) + (clusterCoverage * 0.2));
}

/**
 * Gets the order of a validator in the validation hierarchy
 */
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
 * Checks if a file is a configuration file
 */
function isConfigFile(file: string): boolean {
  const configPatterns = [
    'package.json', 'tsconfig.json', 'next.config.js', 'tailwind.config.js',
    '.eslintrc', 'prettier.config', 'jest.config', 'webpack.config',
    '.env', 'dockerfile', 'docker-compose', '.github/', '.gitlab/',
  ];
  return configPatterns.some(p => file.toLowerCase().includes(p.toLowerCase()));
}

/**
 * Simple hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Builds a file dependency graph from project files
 */
export async function buildFileDependencyGraph(projectDir: string): Promise<FileDependencyGraph> {
  const nodes = new Map<string, FileNode>();
  const edges: FileEdge[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(fullPath);
        }
      } else if (['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(entry.name))) {
        const relPath = path.relative(projectDir, fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');

        const node: FileNode = {
          path: relPath,
          content,
          imports: extractImports(content, relPath),
          exports: extractExports(content),
          dependents: new Set(),
          dependencies: new Set(),
          outgoing: [],
          incoming: [],
        };

        nodes.set(relPath, node);
      }
    }
  }

  await walk(projectDir);

  // Build edges
  for (const [filePath, node] of nodes) {
    for (const importPath of node.imports) {
      const resolved = resolveImport(importPath, filePath, nodes);
      if (resolved) {
        const edge: FileEdge = {
          from: filePath,
          to: resolved,
          type: 'import',
        };
        edges.push(edge);
        node.outgoing.push(edge);
        node.dependencies.add(resolved);

        const targetNode = nodes.get(resolved);
        if (targetNode) {
          targetNode.incoming.push(edge);
          targetNode.dependents.add(filePath);
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Extracts import statements from file content
 */
function extractImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Extracts export statements from file content
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

/**
 * Resolves an import path to a file in the graph
 */
function resolveImport(importPath: string, fromFile: string, nodes: Map<string, FileNode>): string | null {
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const baseDir = path.dirname(fromFile);
    let resolved = path.resolve(baseDir, importPath);

    // Try with extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (nodes.has(withExt)) return withExt;
    }

    // Try without extension
    if (nodes.has(resolved)) return resolved;
  }

  return null;
}

/**
 * Exports for testing
 */
export { DEFAULT_CONFIG };
export type { DependencyGraphConfig, ErrorCluster, ClusterType };