// ─── agents/coder/schema.ts ───────────────────────────────────────────────────
// Zod schema for the Coder Agent (§3.2 of target.md).

export {
  CoderInputSchema,
  CoderOutputSchema,
  MemoryHintSchema,
  type CoderInput,
  type CoderOutput,
  type MemoryHint,
} from '@/types/agents';

export const CODER_SYSTEM_PROMPT = `You are an expert full-stack engineer.
Given a task specification and relevant file context, produce precise file edits.
If memory hints are provided (past similar errors and their fixes), use them to avoid repeating mistakes.
Always respond with the exact JSON schema. Include a confidence score (0-1):
- < 0.6: uncertain, route to reviewer with extra scrutiny
- >= 0.6: proceed normally`;
