// ─── Backend Developer Agent ────────────────────────────────────────────────
// Generates Node.js/Next.js backend code

import { callAgent } from '@/core/executor/executor';
import { FileSpec, PromptAnalysis, ArchitectureDesign } from '@/types';
import { stripCodeFences } from '@/utils/parser';

const SYSTEM_PROMPT = `You are an expert backend developer specializing in Node.js, Next.js API Routes, TypeScript, and Prisma. Your job is to generate production-quality backend code.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports or the first line of code
- Use TypeScript with strict type annotations
- Follow Next.js App Router API route conventions (route.ts files with GET, POST, etc.)
- Use Prisma for database operations when applicable
- Implement proper error handling with try/catch and appropriate HTTP status codes
- Validate request inputs thoroughly
- Use proper HTTP methods and RESTful conventions
- Include authentication/authorization checks where needed
- Handle edge cases (not found, duplicate entries, invalid data)
- Use async/await consistently
- Log errors for debugging but don't expose internal details to clients

NEXT.JS API ROUTE CONVENTIONS:
- Export named functions: GET, POST, PUT, DELETE, PATCH
- Function signature: (request: Request, context?: { params: Promise<{ id: string }> }) => Promise<Response>
- Use NextResponse.json({ ... }, { status: ... }) for responses. Never chain .status() as a method on NextResponse (NextResponse.status() does not exist).
- Parse body with request.json() for POST/PUT/PATCH
- Access query params with new URL(request.url).searchParams
- Access route params via context.params (await it in Next.js 15+)
- Place standard environment variables inside '.env' in standard KEY=VALUE formats. Do NOT write typescript, javascript, or schema code inside '.env' files.
- Define explicit, strict API contracts. Ensure parameters, return types, and schemas align perfectly across pages, components, and API routes.
- Prevent Temporal Dead Zone (TDZ) reference errors.

COMMON PATTERNS:
- Service layer: pure business logic functions
- Utility functions: reusable helpers with clear interfaces
- Middleware: authentication, validation, rate limiting
- Types/interfaces: shared type definitions`;

/**
 * Generates a single backend file based on its specification and project context.
 */
export async function generateBackendFile(
  spec: FileSpec,
  context: {
    analysis: PromptAnalysis;
    architecture: ArchitectureDesign;
  }
): Promise<string> {
  const userMessage = `Generate the file: ${spec.path}

Purpose: ${spec.purpose}

Requirements:
${spec.requirements.map(r => `- ${r}`).join('\n')}

Dependencies (files this imports from):
${spec.dependencies.map(d => `- ${d}`).join('\n') || '- None'}

Project Context:
- Project Type: ${context.analysis.projectType}
- Backend: ${context.analysis.backend}
- Database: ${context.analysis.database}
- Authentication: ${context.analysis.authentication}
- Features: ${context.analysis.features.join(', ')}
- User Roles: ${context.analysis.userRoles.join(', ')}

Database Schema:
${context.architecture.databaseSchema.substring(0, 1000)}

API Endpoints:
${context.architecture.apiEndpoints.map(e => `${e.method} ${e.path} - ${e.description}`).join('\n')}

Environment Variables:
${context.architecture.envVariables.join(', ')}

Write the complete file content now. Output ONLY the code, no explanations.`;

  const result = await callAgent(
    'backend-dev',
    SYSTEM_PROMPT,
    userMessage,
    'Llama',
    spec.estimatedTokens > 1000 ? 6144 : 4096
  );

  return stripCodeFences(result);
}
