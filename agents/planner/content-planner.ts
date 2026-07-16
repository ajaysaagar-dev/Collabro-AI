// ─── Content Planner Agent ──────────────────────────────────────────────────
// Creates detailed file specifications and dependency graphs

import { callAgentJSON } from '@/core/executor/executor';
import { ArchitectureDesign, PromptAnalysis, ContentPlan, FileSpec } from '@/types';
import { normalizeNextJsPath } from '@/utils/validator';

const SYSTEM_PROMPT = `You are a content planning specialist for software projects. Your job is to take an architecture design and create a detailed content plan with file specifications and a dependency graph.

You will receive an architecture design with its file list. Your task is to:
1. Refine each file specification with precise requirements
2. Build an accurate dependency graph showing which files depend on which
3. Calculate totals

Respond with ONLY a valid JSON object (no markdown, no explanation):

{
  "fileSpecs": [
    {
      "path": "string - file path",
      "purpose": "string - detailed description of what this file implements",
      "requirements": ["array of strings - specific implementation requirements"],
      "dependencies": ["array of strings - paths of files this depends on"],
      "estimatedTokens": number,
      "priority": "critical | high | medium | low",
      "assignedAgent": "frontend-dev | backend-dev | database-dev"
    }
  ],
  "dependencyGraph": {
    "file-path": ["array of file paths this depends on"]
  },
  "totalFiles": number,
  "estimatedTotalTokens": number
}

Guidelines:
- Configuration and type files have no dependencies and should be "critical" priority
- Database schemas/models should be "critical" priority since most files depend on them
- API routes depend on database models and utility files
- UI components depend on types, utilities, and API route definitions
- Page files depend on their child components
- Be precise about dependency ordering - no circular dependencies
- estimatedTokens should reflect file complexity (config: 200-400, components: 400-800, complex pages: 800-1500)`;

/**
 * Creates a detailed content plan from an architecture design.
 */
export async function planContent(
  architecture: ArchitectureDesign,
  analysis: PromptAnalysis
): Promise<ContentPlan> {
  try {
    const result = await callAgentJSON<ContentPlan>(
      'content-planner',
      SYSTEM_PROMPT,
      `Create a content plan for this project:\n\nArchitecture:\n${JSON.stringify(architecture, null, 2)}\n\nProject Type: ${analysis.projectType}\nFrontend: ${analysis.frontend}\nBackend: ${analysis.backend}\nDatabase: ${analysis.database}`,
      'Llama',
      8192
    );

    const rawFileSpecs = Array.isArray(result.fileSpecs)
      ? result.fileSpecs.map(normalizeSpec)
      : architecture.fileList;

    // Filter duplicates by path
    const fileSpecs: FileSpec[] = [];
    const seenPaths = new Set<string>();
    for (const spec of rawFileSpecs) {
      if (!seenPaths.has(spec.path)) {
        seenPaths.add(spec.path);
        fileSpecs.push(spec);
      }
    }

    return {
      fileSpecs,
      dependencyGraph: result.dependencyGraph && typeof result.dependencyGraph === 'object'
        ? result.dependencyGraph
        : buildDependencyGraph(fileSpecs),
      totalFiles: fileSpecs.length,
      estimatedTotalTokens: fileSpecs.reduce((sum, f) => sum + (f.estimatedTokens || 500), 0),
    };
  } catch (error) {
    console.error('[content-planner] Failed to plan content:', error);
    // Fallback: use the architecture file list directly
    const fileSpecs = architecture.fileList;
    return {
      fileSpecs,
      dependencyGraph: buildDependencyGraph(fileSpecs),
      totalFiles: fileSpecs.length,
      estimatedTotalTokens: fileSpecs.reduce((sum, f) => sum + (f.estimatedTokens || 500), 0),
    };
  }
}

function normalizeSpec(spec: Partial<FileSpec>): FileSpec {
  const normalizedPath = normalizeNextJsPath(spec.path || 'unknown.ts');
  const normalizedDeps = Array.isArray(spec.dependencies)
    ? spec.dependencies.map(normalizeNextJsPath)
    : [];

  return {
    path: normalizedPath,
    purpose: spec.purpose || '',
    requirements: Array.isArray(spec.requirements) ? spec.requirements : [],
    dependencies: normalizedDeps,
    estimatedTokens: spec.estimatedTokens || 500,
    priority: (['critical', 'high', 'medium', 'low'].includes(spec.priority || ''))
      ? spec.priority!
      : 'medium',
    assignedAgent: (['frontend-dev', 'backend-dev', 'database-dev'].includes(spec.assignedAgent || ''))
      ? spec.assignedAgent!
      : 'backend-dev',
  };
}

function buildDependencyGraph(fileSpecs: FileSpec[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const spec of fileSpecs) {
    graph[spec.path] = spec.dependencies;
  }
  return graph;
}
