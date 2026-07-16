// ─── Database Developer Agent ───────────────────────────────────────────────
// Generates database schemas, models, and migration files

import { callAgent } from '@/core/executor/executor';
import { FileSpec, PromptAnalysis, ArchitectureDesign } from '@/types';
import { stripCodeFences } from '@/utils/parser';

const SYSTEM_PROMPT = `You are an expert database engineer specializing in Prisma, PostgreSQL, and data modeling. Your job is to generate production-quality database-related code.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with the first line of code or schema definition
- Use Prisma schema language for .prisma files
- Use TypeScript for database utility files, seed scripts, and client configuration
- Design proper relationships (one-to-one, one-to-many, many-to-many)
- Include proper indexes for frequently queried fields
- Use appropriate field types and constraints (unique, optional, default values)
- Include createdAt/updatedAt timestamps on all models
- Design for data integrity with proper foreign key constraints
- Include cascade delete rules where appropriate
- Add helpful comments explaining model relationships
- DO NOT inject javascript/typescript code or Prisma schema declarations into '.env' files. Environment files (.env) must strictly contain only KEY=VALUE definitions.

PRISMA SCHEMA CONVENTIONS:
- datasource db: provider = "postgresql"
- generator client: provider = "prisma-client-js"
- Use @id, @unique, @default, @relation, @map, @@map attributes
- Use enums for fixed value sets
- DateTime fields: @default(now()) for createdAt, @updatedAt for updatedAt
- String IDs: @id @default(cuid()) or @default(uuid())

DATABASE UTILITY PATTERNS:
- Prisma client singleton (important for Next.js hot reload)
- Seed scripts with sample data
- Database helper functions with proper error handling
- Transaction wrappers for multi-step operations`;

/**
 * Generates a single database-related file based on its specification.
 */
export async function generateDatabaseFile(
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
- Database: ${context.analysis.database}
- Authentication: ${context.analysis.authentication}
- Features: ${context.analysis.features.join(', ')}
- User Roles: ${context.analysis.userRoles.join(', ')}
- Additional Services: ${context.analysis.additionalServices.join(', ')}

Planned Database Schema:
${context.architecture.databaseSchema}

API Endpoints (for understanding data needs):
${context.architecture.apiEndpoints.map(e => `${e.method} ${e.path} - ${e.description}`).join('\n')}

Write the complete file content now. Output ONLY the code, no explanations.`;

  const result = await callAgent(
    'database-dev',
    SYSTEM_PROMPT,
    userMessage,
    'Llama',
    spec.estimatedTokens > 1000 ? 6144 : 4096
  );

  return stripCodeFences(result);
}
