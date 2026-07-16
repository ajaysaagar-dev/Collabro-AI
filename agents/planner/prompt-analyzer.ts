// ─── Prompt Analyzer Agent ──────────────────────────────────────────────────
// Analyzes user prompts to extract structured project requirements

import { callAgentJSON } from '@/core/executor/executor';
import { PromptAnalysis } from '@/types';

const SYSTEM_PROMPT = `You are an expert software project analyst. Your job is to deeply analyze a user's project description and extract structured information about what they want to build.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with the following structure:

{
  "projectType": "string - The type of project (e.g., 'web-app', 'mobile-app', 'api', 'e-commerce', 'saas', 'dashboard', 'cms', 'social-platform')",
  "frontend": "string - The frontend framework/technology to use (e.g., 'Next.js', 'React', 'Vue.js', 'none')",
  "backend": "string - The backend framework/technology (e.g., 'Node.js/Express', 'Next.js API Routes', 'Django', 'none')",
  "database": "string - The database technology (e.g., 'PostgreSQL', 'MongoDB', 'SQLite', 'Prisma + PostgreSQL')",
  "authentication": "string - The authentication method (e.g., 'NextAuth.js', 'JWT', 'OAuth', 'Firebase Auth', 'none')",
  "features": ["array of strings - List ALL features the user described or that are implied by the project type"],
  "userRoles": ["array of strings - List all user roles/personas (e.g., 'admin', 'user', 'moderator', 'guest')"],
  "additionalServices": ["array of strings - Any additional services needed (e.g., 'email', 'file-upload', 'payment', 'search', 'caching', 'websockets')"],
  "summary": "string - A concise 2-3 sentence summary of the project"
}

Guidelines:
- If the user doesn't specify a technology, infer the best choice based on the project type
- Default to Next.js + TypeScript for web apps unless otherwise specified
- Default to Prisma + PostgreSQL for databases unless otherwise specified
- Default to NextAuth.js for authentication unless otherwise specified
- Always include implied features (e.g., a social platform implies user profiles, feeds, etc.)
- Be thorough - extract every feature mentioned or implied
- If a feature seems ambiguous, include it with your best interpretation`;

/**
 * Analyzes a user prompt and extracts structured project requirements.
 */
export async function analyzePrompt(userPrompt: string): Promise<PromptAnalysis> {
  try {
    const result = await callAgentJSON<PromptAnalysis>(
      'prompt-analyzer',
      SYSTEM_PROMPT,
      `Analyze this project request and extract all requirements:\n\n${userPrompt}`,
      'Llama',
      4096
    );

    // Validate required fields with defaults
    return {
      projectType: result.projectType || 'web-app',
      frontend: result.frontend || 'Next.js',
      backend: result.backend || 'Next.js API Routes',
      database: result.database || 'Prisma + PostgreSQL',
      authentication: result.authentication || 'NextAuth.js',
      features: Array.isArray(result.features) ? result.features : [],
      userRoles: Array.isArray(result.userRoles) ? result.userRoles : ['user', 'admin'],
      additionalServices: Array.isArray(result.additionalServices) ? result.additionalServices : [],
      summary: result.summary || 'A web application project.',
    };
  } catch (error) {
    // Fallback: return a minimal analysis if LLM fails
    console.error('[prompt-analyzer] Failed to analyze prompt:', error);
    return {
      projectType: 'web-app',
      frontend: 'Next.js',
      backend: 'Next.js API Routes',
      database: 'Prisma + PostgreSQL',
      authentication: 'NextAuth.js',
      features: ['user-authentication', 'dashboard', 'CRUD-operations'],
      userRoles: ['user', 'admin'],
      additionalServices: [],
      summary: `Project based on: ${userPrompt.substring(0, 200)}`,
    };
  }
}
