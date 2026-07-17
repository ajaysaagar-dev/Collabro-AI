// ─── agents/deploy/schema.ts ──────────────────────────────────────────────────
// Zod schema for the Deployment Agent (§3.6 of target.md).

export {
  DeployInputSchema,
  DeployOutputSchema,
  type DeployInput,
  type DeployOutput,
} from '@/types/agents';

export const DEPLOY_SYSTEM_PROMPT = `You are a deployment specialist.
Given a project path and target environment, produce the necessary config files and
execute deployment commands. Support targets: vercel, docker, static-export.
Always respond with the exact JSON schema including build logs verbatim.`;

export const DEPLOY_TARGETS = ['vercel', 'docker', 'static-export'] as const;
export type DeployTarget = typeof DEPLOY_TARGETS[number];
