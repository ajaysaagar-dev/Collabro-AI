// ─── Scheduler Core Module ──────────────────────────────────────────────────
// Resolves dependency order and groups tasks for parallel execution
// This is primarily algorithmic - no LLM needed.

import { ContentPlan, ScheduledTasks, TaskItem, FileSpec } from '@/types';

/**
 * Performs topological sort on file specs based on their dependency graph.
 * Groups independent tasks together for parallel execution.
 */
export async function scheduleTasks(contentPlan: ContentPlan): Promise<ScheduledTasks> {
  const { fileSpecs, dependencyGraph } = contentPlan;

  // Build lookup maps
  const specByPath = new Map<string, FileSpec>();
  for (const spec of fileSpecs) {
    specByPath.set(spec.path, spec);
  }

  // Create tasks with unique IDs
  const tasks: TaskItem[] = fileSpecs.map((spec, idx) => ({
    id: `task-${idx}-${spec.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
    fileSpec: spec,
    status: 'pending' as const,
    dependsOn: resolveDependencyIds(spec, fileSpecs, dependencyGraph),
  }));

  // Build task ID lookup
  const taskByPath = new Map<string, string>();
  for (const task of tasks) {
    taskByPath.set(task.fileSpec.path, task.id);
  }

  // Remap dependsOn to use task IDs
  for (const task of tasks) {
    task.dependsOn = task.dependsOn
      .map(depPath => taskByPath.get(depPath) || depPath)
      .filter(depId => tasks.some(t => t.id === depId));
  }

  // Topological sort using Kahn's algorithm
  const executionOrder = topologicalSort(tasks);

  // Group into parallel batches
  const parallelGroups = buildParallelGroups(tasks, executionOrder);

  return {
    tasks,
    executionOrder,
    parallelGroups,
  };
}

/**
 * Resolves file path dependencies to actual paths that exist in the file list.
 */
function resolveDependencyIds(
  spec: FileSpec,
  allSpecs: FileSpec[],
  dependencyGraph: Record<string, string[]>
): string[] {
  const allPaths = new Set(allSpecs.map(s => s.path));

  // Get dependencies from both the spec and the graph
  const deps = new Set<string>();

  for (const dep of spec.dependencies) {
    if (allPaths.has(dep)) {
      deps.add(dep);
    }
  }

  const graphDeps = dependencyGraph[spec.path];
  if (Array.isArray(graphDeps)) {
    for (const dep of graphDeps) {
      if (allPaths.has(dep)) {
        deps.add(dep);
      }
    }
  }

  return Array.from(deps);
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns task IDs in execution order. Falls back to priority-based sort if cycles exist.
 */
function topologicalSort(tasks: TaskItem[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const task of tasks) {
    inDegree.set(task.id, 0);
    adjacency.set(task.id, []);
  }

  // Build graph
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (adjacency.has(dep)) {
        adjacency.get(dep)!.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const queue: string[] = [];

  for (const task of tasks) {
    if ((inDegree.get(task.id) || 0) === 0) {
      queue.push(task.id);
    }
  }

  // Sort the initial queue by priority
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  queue.sort((a, b) => {
    const pa = priorityOrder[taskMap.get(a)!.fileSpec.priority] ?? 2;
    const pb = priorityOrder[taskMap.get(b)!.fileSpec.priority] ?? 2;
    return pa - pb;
  });

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }

    // Re-sort queue by priority after each iteration
    queue.sort((a, b) => {
      const pa = priorityOrder[taskMap.get(a)!.fileSpec.priority] ?? 2;
      const pb = priorityOrder[taskMap.get(b)!.fileSpec.priority] ?? 2;
      return pa - pb;
    });
  }

  // If we have cycles (not all tasks sorted), append remaining tasks sorted by priority
  if (sorted.length < tasks.length) {
    console.warn('[scheduler] Dependency cycle detected, falling back to priority sort for remaining tasks');
    const sortedSet = new Set(sorted);
    const remaining = tasks
      .filter(t => !sortedSet.has(t.id))
      .sort((a, b) => (priorityOrder[a.fileSpec.priority] ?? 2) - (priorityOrder[b.fileSpec.priority] ?? 2))
      .map(t => t.id);
    sorted.push(...remaining);
  }

  return sorted;
}

/**
 * Groups tasks into parallel execution batches.
 * Tasks in the same group have no dependencies on each other.
 */
function buildParallelGroups(tasks: TaskItem[], executionOrder: string[]): string[][] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const completed = new Set<string>();
  const groups: string[][] = [];
  const remaining = new Set(executionOrder);

  while (remaining.size > 0) {
    const currentGroup: string[] = [];

    for (const taskId of executionOrder) {
      if (!remaining.has(taskId)) continue;

      const task = taskMap.get(taskId)!;
      const depsResolved = task.dependsOn.every(dep => completed.has(dep));

      if (depsResolved) {
        currentGroup.push(taskId);
      }
    }

    // If no tasks can be scheduled (shouldn't happen after topo sort), break to avoid infinite loop
    if (currentGroup.length === 0) {
      // Force add remaining tasks
      groups.push(Array.from(remaining));
      break;
    }

    for (const id of currentGroup) {
      remaining.delete(id);
      completed.add(id);
    }

    groups.push(currentGroup);
  }

  return groups;
}
