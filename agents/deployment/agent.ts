// ─── Deployer Agent ─────────────────────────────────────────────────────────
// Generates deployment configuration files (Docker, CI/CD, env templates)

import { callAgent } from '@/core/executor/executor';
import { PromptAnalysis, ArchitectureDesign } from '@/types';
import { stripCodeFences } from '@/utils/parser';

const DOCKERFILE_PROMPT = `You are a DevOps engineer. Generate a production-ready Dockerfile for a Next.js application.

IMPORTANT RULES:
- Write ONLY the raw Dockerfile content - no markdown code fences, no explanations
- Use multi-stage build (deps, builder, runner stages)
- Use node:20-alpine as base image
- Leverage Next.js standalone output mode
- Copy only necessary files in the final stage
- Set proper environment variables
- Use non-root user for security
- Expose port 3000
- Include proper .dockerignore considerations in comments`;

const DOCKER_COMPOSE_PROMPT = `You are a DevOps engineer. Generate a production-ready docker-compose.yml.

IMPORTANT RULES:
- Write ONLY the raw YAML content - no markdown code fences, no explanations
- Include services for: the app, the database, and any required services
- Use proper networking between services
- Include volume mounts for data persistence
- Set environment variables with .env file reference
- Include health checks
- Use proper restart policies`;

const GITHUB_ACTIONS_PROMPT = `You are a DevOps engineer. Generate a GitHub Actions CI/CD workflow.

IMPORTANT RULES:
- Write ONLY the raw YAML content - no markdown code fences, no explanations
- Trigger on push to main and pull requests
- Include jobs for: lint, type-check, test, build, and optionally deploy
- Use Node.js 20
- Cache node_modules and Next.js build cache
- Use proper environment variable handling for secrets
- Include database service container for tests if needed`;

const ENV_TEMPLATE_PROMPT = `You are a DevOps engineer. Generate a .env.example template.

IMPORTANT RULES:
- Write ONLY the raw env file content - no markdown code fences, no explanations
- Include ALL required environment variables with placeholder values
- Group variables by category with comments
- Include descriptions for each variable
- Use realistic placeholder formats (e.g., postgresql://user:password@localhost:5432/dbname)
- Environment files (.env) must strictly contain only KEY=VALUE definitions. Never write typescript, javascript, or schema code inside environment files.`;

/**
 * Generates all deployment configuration files for the project.
 */
export async function generateDeploymentConfig(project: {
  analysis: PromptAnalysis;
  architecture: ArchitectureDesign;
}): Promise<{
  dockerfile: string;
  dockerCompose: string;
  githubActions: string;
  envTemplate: string;
}> {
  const { analysis, architecture } = project;

  const projectContext = `
Project Type: ${analysis.projectType}
Frontend: ${analysis.frontend}
Backend: ${analysis.backend}
Database: ${analysis.database}
Authentication: ${analysis.authentication}
Additional Services: ${analysis.additionalServices.join(', ')}
Environment Variables: ${architecture.envVariables.join(', ')}
Dependencies: ${Object.keys(architecture.dependencies).join(', ')}`;

  // Generate all configs in parallel for speed
  const [dockerfile, dockerCompose, githubActions, envTemplate] = await Promise.all([
    callAgent(
      'deployer',
      DOCKERFILE_PROMPT,
      `Generate a Dockerfile for:\n${projectContext}`,
      'Phi',
      2048
    ).then(stripCodeFences),

    callAgent(
      'deployer',
      DOCKER_COMPOSE_PROMPT,
      `Generate docker-compose.yml for:\n${projectContext}`,
      'Phi',
      2048
    ).then(stripCodeFences),

    callAgent(
      'deployer',
      GITHUB_ACTIONS_PROMPT,
      `Generate .github/workflows/ci.yml for:\n${projectContext}`,
      'Phi',
      2048
    ).then(stripCodeFences),

    callAgent(
      'deployer',
      ENV_TEMPLATE_PROMPT,
      `Generate .env.example for:\n${projectContext}\n\nRequired variables:\n${architecture.envVariables.map(v => `- ${v}`).join('\n')}`,
      'Phi',
      1024
    ).then(stripCodeFences),
  ]);

  return {
    dockerfile,
    dockerCompose,
    githubActions,
    envTemplate,
  };
}
