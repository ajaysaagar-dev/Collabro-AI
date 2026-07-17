// ─── agents/planner/schema.ts ─────────────────────────────────────────────────
// Zod schema for the Planner / Architect Agent (§3.1 of target.md).
// Re-exports from canonical types/agents.ts for agent-local convenience.

export {
  PlannerInputSchema,
  PlannerOutputSchema,
  TaskGraphNodeSchema,
  ProjectMetaSchema,
  type PlannerInput,
  type PlannerOutput,
  type TaskGraphNode,
  type ProjectMeta,
} from '@/types/agents';

export const PLANNER_SYSTEM_PROMPT = `You are a senior software architect.
Given a user request, produce a structured task graph where each node targets specific files
and specifies which agent (coder or reviewer) should handle it.
Always respond with the exact JSON schema — no extra prose.
Prefer small, composable tasks that can be parallelized where dependencies allow.`;
