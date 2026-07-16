// ─── Architect Agent ────────────────────────────────────────────────────────
// Designs the complete project architecture including folder structure and file list

import { callAgentJSON } from '@/core/executor/executor';
import {
  PromptAnalysis,
  RequirementsValidation,
  ArchitectureDesign,
  FileSpec,
  ApiEndpoint,
} from '@/types';
import { normalizeNextJsPath } from '@/utils/validator';

const SYSTEM_PROMPT = `You are a senior software architect with deep expertise in modern web application design. Your job is to design a complete, production-ready project architecture.

You will receive a project analysis and validated requirements. Design the full architecture and respond with ONLY a valid JSON object (no markdown, no explanation) with this structure:

{
  "folderStructure": "string - A text tree showing the complete folder structure using tree notation (├── and └── characters)",
  "fileList": [
    {
      "path": "string - Relative file path from project root (e.g., 'src/app/page.tsx')",
      "purpose": "string - What this file does",
      "requirements": ["array of strings - What this file must implement"],
      "dependencies": ["array of strings - Other file paths this depends on"],
      "estimatedTokens": number - Estimated tokens to generate this file (200-2000),
      "priority": "critical | high | medium | low",
      "assignedAgent": "frontend-dev | backend-dev | database-dev"
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET | POST | PUT | DELETE | PATCH",
      "path": "string - API route path (e.g., '/api/users')",
      "description": "string - What this endpoint does",
      "requestBody": "string - JSON schema or description of request body (optional)",
      "responseBody": "string - JSON schema or description of response (optional)"
    }
  ],
  "databaseSchema": "string - Complete database schema in Prisma format or SQL DDL",
  "envVariables": ["array of strings - Required environment variables (e.g., 'DATABASE_URL', 'NEXTAUTH_SECRET')"],
  "dependencies": { "package-name": "version" },
  "buildConfig": "string - Build configuration notes and commands"
}

Architecture Guidelines:
- Use Next.js App Router (app/ directory) for Next.js projects
- Place the root layout exactly at 'src/app/layout.tsx' and the root page exactly at 'src/app/page.tsx'. Do NOT use subfolders like 'src/app/layout/Layout.tsx' or 'src/app/page/_app.tsx'.
- Do NOT use Pages Router files (like '_app.tsx', '_document.tsx', 'index.tsx') inside an App Router setup.
- Organize by feature/domain, not by file type
- Include all necessary config files (tsconfig, eslint, tailwind, etc.)
- Plan for proper separation of concerns
- Include middleware, utilities, and shared types
- Database files should use Prisma schema format
- API routes should follow RESTful conventions
- Include loading states, error boundaries, and layout files
- Plan for both server and client components appropriately
- assignedAgent should be: 'frontend-dev' for UI components/pages, 'backend-dev' for API routes/services/utils, 'database-dev' for schema/models/migrations
- Keep file list focused on core application files (15-40 files typically)
- Dependencies between files should reference paths from the fileList
- Define explicit, strict API contracts. Ensure parameters, return types, and schemas align perfectly across pages, components, and API routes.
- Component designs must use passing and getting React props. They should be modular, isolated, and communicate via explicit inputs and outputs (like props, states, and callbacks).
- Config files like next.config.js and .env must never contain markdown or code implementation.
`;

/**
 * Designs the complete project architecture based on analysis and validated requirements.
 */
export async function designArchitecture(
  analysis: PromptAnalysis,
  requirements: RequirementsValidation
): Promise<ArchitectureDesign> {
  try {
    const result = await callAgentJSON<ArchitectureDesign>(
      'architect',
      SYSTEM_PROMPT,
      `Design the architecture for this project:\n\nProject Analysis:\n${JSON.stringify(analysis, null, 2)}\n\nValidated Requirements:\n${JSON.stringify(requirements, null, 2)}`,
      'Llama',
      8192
    );

    // Validate and normalize the result
    const rawFileList = Array.isArray(result.fileList)
      ? result.fileList.map(normalizeFileSpec)
      : [];

    const fileList: FileSpec[] = [];
    const seenPaths = new Set<string>();
    for (const spec of rawFileList) {
      if (!seenPaths.has(spec.path)) {
        seenPaths.add(spec.path);
        fileList.push(spec);
      }
    }

    return {
      folderStructure: result.folderStructure || '',
      fileList,
      apiEndpoints: Array.isArray(result.apiEndpoints)
        ? result.apiEndpoints.map(normalizeEndpoint)
        : [],
      databaseSchema: result.databaseSchema || '',
      envVariables: Array.isArray(result.envVariables) ? result.envVariables : [],
      dependencies: result.dependencies && typeof result.dependencies === 'object'
        ? result.dependencies
        : {},
      buildConfig: result.buildConfig || '',
    };
  } catch (error) {
    console.error('[architect] Failed to design architecture:', error);
    throw new Error(`Architecture design failed: ${error}`);
  }
}

function normalizeFileSpec(spec: Partial<FileSpec>): FileSpec {
  const normalizedPath = normalizeNextJsPath(spec.path || 'unknown-file.ts');
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

function normalizeEndpoint(ep: Partial<ApiEndpoint>): ApiEndpoint {
  return {
    method: ep.method || 'GET',
    path: ep.path || '/api/unknown',
    description: ep.description || '',
    requestBody: ep.requestBody,
    responseBody: ep.responseBody,
  };
}
