// ─── Tester Agent ───────────────────────────────────────────────────────────
// Generates test suites for generated project files

import { callAgent } from '@/core/executor/executor';
import { GeneratedFile, PromptAnalysis } from '@/types';
import { stripCodeFences } from '@/utils/parser';

const SYSTEM_PROMPT = `You are an expert software testing engineer specializing in TypeScript, Jest, React Testing Library, and Playwright. Your job is to generate comprehensive test suites.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports
- Generate a complete test file that covers the provided source files
- Use Jest as the test runner
- Do NOT use Vitest or its utility 'vi' (such as 'vi.mock' or 'vi.fn') because the test runner of this project is Jest. Use Jest's native globals ('jest.mock', 'jest.fn', etc.).
- Ensure all imports are exact, correct, and do not use unconfigured aliases.
- Use React Testing Library for component tests
- Use descriptive test names that explain what is being tested
- Group related tests with describe blocks
- Test both happy paths and error cases
- Mock external dependencies (API calls, database, etc.)
- Test component rendering, user interactions, and state changes
- For API routes, test request/response handling
- For utility functions, test edge cases and boundary conditions
- Include proper TypeScript types for mocks and test utilities
- Ensure tests are not 0-byte or empty. Always generate a complete, valid test suite.

TEST PATTERNS:
- Unit tests: individual functions and components
- Integration tests: component interactions and API flows
- Mock patterns: jest.mock(), jest.fn(), MSW for API mocking
- Assertions: expect().toBe(), .toEqual(), .toHaveBeenCalled(), .toBeInTheDocument()
- Async tests: async/await with waitFor(), findBy queries
- Setup/teardown: beforeEach, afterEach, beforeAll, afterAll`;

/**
 * Generates test files for the provided generated source files.
 */
export async function generateTests(
  files: GeneratedFile[],
  analysis: PromptAnalysis
): Promise<string> {
  // Group files by type for focused test generation
  const fileDescriptions = files.map(f => ({
    path: f.path,
    contentPreview: f.content.substring(0, 300),
    isComponent: f.path.includes('/components/') || f.path.endsWith('.tsx'),
    isApiRoute: f.path.includes('/api/') || f.path.includes('route.ts'),
    isUtility: f.path.includes('/lib/') || f.path.includes('/utils/'),
  }));

  const userMessage = `Generate a comprehensive test suite for this project.

Project Type: ${analysis.projectType}
Frontend: ${analysis.frontend}
Backend: ${analysis.backend}

Files to test:
${fileDescriptions.map(f => `
--- ${f.path} (${f.isComponent ? 'Component' : f.isApiRoute ? 'API Route' : f.isUtility ? 'Utility' : 'Other'}) ---
${f.contentPreview}
...
`).join('\n')}

Generate a single test file (__tests__/app.test.tsx) that covers:
1. Component rendering tests (if applicable)
2. API route handler tests (if applicable)
3. Utility function tests (if applicable)
4. Integration flow tests

Use proper mocking for:
- Prisma client
- NextAuth session
- fetch/API calls
- Next.js router

Write the complete test file now. Output ONLY the code, no explanations.`;

  const result = await callAgent(
    'tester',
    SYSTEM_PROMPT,
    userMessage,
    'Llama',
    6144
  );

  return stripCodeFences(result);
}
