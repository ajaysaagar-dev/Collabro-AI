// ─── Tester Agent ───────────────────────────────────────────────────────────
// Generates test suites for generated project files utilizing sub-agents

import { callAgent } from '@/core/executor/executor';
import { GeneratedFile, PromptAnalysis } from '@/types';
import { stripCodeFences } from '@/utils/parser';

const UNIT_SYSTEM_PROMPT = `You are the Unit & Integration Testing Sub-Agent for COLLABRO. Your job is to generate a comprehensive Jest and React Testing Library test suite.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports
- Generate a complete test file that covers the provided source files
- Use Jest as the test runner
- Do NOT use Vitest or its utility 'vi' (such as 'vi.mock' or 'vi.fn') because the test runner of this project is Jest. Use Jest's native globals ('jest.mock', 'jest.fn', etc.).
- Ensure all imports are exact, correct, and do not use unconfigured aliases.
- Use React Testing Library for component tests
- Group related tests with describe blocks
- Test both happy paths and error cases
- Mock external dependencies (API calls, database, etc.)`;

const PLAYWRIGHT_PROMPT = `You are the Playwright E2E Sub-Agent for COLLABRO. Your job is to generate a Playwright end-to-end browser automation test suite.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports
- Use Playwright Test runner (@playwright/test)
- Cover critical E2E paths (navigation, form inputs, dynamic actions)
- Include hooks for capturing screenshots, videos, console logs, and monitoring network requests.`;

const PUPPETEER_CDP_PROMPT = `You are the Puppeteer & CDP Sub-Agent for COLLABRO. Your job is to generate a Puppeteer browser automation test script utilizing Chrome DevTools Protocol (CDP) for low-level page inspection.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports
- Utilize Puppeteer for page load, form submission, and CDP clients to intercept requests, read console logs, or inspect the DOM tree directly.`;

const LIGHTHOUSE_PROMPT = `You are the Lighthouse Audit Sub-Agent for COLLABRO. Your job is to generate a Lighthouse audit test script to measure Performance, SEO, and Accessibility baselines.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports
- Use lighthouse CLI or programmatic lighthouse node APIs to audit the application server port and verify scores are above 90.`;

const AXE_CORE_PROMPT = `You are the Axe-Core Accessibility Sub-Agent for COLLABRO. Your job is to generate an automated accessibility validation test suite using Axe-Core (such as @axe-core/playwright or jest-axe).

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports
- Validate that the rendered pages have no critical WCAG failures (contrast, aria attributes, document structure).`;

const SELENIUM_PROMPT = `You are the Selenium E2E & Runtime Validation Sub-Agent for COLLABRO. Your job is to generate a Selenium WebDriver test suite using 'selenium-webdriver'.

IMPORTANT RULES:
- Write ONLY the raw file content - no markdown code fences, no explanations
- Start directly with imports
- Use 'selenium-webdriver' (javascript bindings)
- Initialize a Chrome/Firefox/Edge Builder and perform browser startup validation.
- Capture browser console logs, page load success (HTTP/DOM check), DOM component presence (Navbar, Footer, Forms, etc.).
- Visit every route, fill/submit forms, and generate a structured JSON failure report if a verification fails.`;

/**
 * Generates automated testing suites using specialized sub-agents.
 */
export async function generateTests(
  files: GeneratedFile[],
  analysis: PromptAnalysis
): Promise<GeneratedFile[]> {
  const timestamp = Date.now();
  const fileDescriptions = files.map(f => ({
    path: f.path,
    contentPreview: f.content.substring(0, 300),
    isComponent: f.path.includes('/components/') || f.path.endsWith('.tsx'),
    isApiRoute: f.path.includes('/api/') || f.path.includes('route.ts'),
    isUtility: f.path.includes('/lib/') || f.path.includes('/utils/'),
  }));

  const userMessage = `Generate testing automation for this project.

Project Type: ${analysis.projectType}
Frontend: ${analysis.frontend}
Backend: ${analysis.backend}

Files to test:
${fileDescriptions.map(f => `
--- ${f.path} (${f.isComponent ? 'Component' : f.isApiRoute ? 'API Route' : f.isUtility ? 'Utility' : 'Other'}) ---
${f.contentPreview}
...
`).join('\n')}`;

  // 1. Playwright Sub-Agent
  const playwrightPromise = callAgent(
    'tester',
    PLAYWRIGHT_PROMPT,
    userMessage + '\nGenerate Playwright E2E browser automation tests, capturing screenshots, videos, and network logs.',
    'Llama',
    4096
  ).then(res => ({
    path: '__tests__/playwright-e2e.test.ts',
    content: stripCodeFences(res),
    agent: 'tester' as const,
    generatedAt: timestamp
  }));

  // 2. Puppeteer & CDP Sub-Agent
  const puppeteerPromise = callAgent(
    'tester',
    PUPPETEER_CDP_PROMPT,
    userMessage + '\nGenerate Puppeteer & Chrome DevTools Protocol (CDP) low-level inspection automation script.',
    'Llama',
    4096
  ).then(res => ({
    path: '__tests__/puppeteer-cdp.test.ts',
    content: stripCodeFences(res),
    agent: 'tester' as const,
    generatedAt: timestamp
  }));

  // 3. Lighthouse Sub-Agent
  const lighthousePromise = callAgent(
    'tester',
    LIGHTHOUSE_PROMPT,
    userMessage + '\nGenerate a Lighthouse performance and SEO audit runner.',
    'Llama',
    4096
  ).then(res => ({
    path: '__tests__/lighthouse.test.ts',
    content: stripCodeFences(res),
    agent: 'tester' as const,
    generatedAt: timestamp
  }));

  // 4. Axe-core Sub-Agent
  const axePromise = callAgent(
    'tester',
    AXE_CORE_PROMPT,
    userMessage + '\nGenerate axe-core accessibility compliance tests.',
    'Llama',
    4096
  ).then(res => ({
    path: '__tests__/accessibility.test.ts',
    content: stripCodeFences(res),
    agent: 'tester' as const,
    generatedAt: timestamp
  }));

  // 5. Unit & Integration Sub-Agent
  const unitTestPromise = callAgent(
    'tester',
    UNIT_SYSTEM_PROMPT,
    userMessage + '\nGenerate Jest / React Testing Library unit & integration tests.',
    'Llama',
    4096
  ).then(res => ({
    path: '__tests__/app.test.tsx',
    content: stripCodeFences(res),
    agent: 'tester' as const,
    generatedAt: timestamp
  }));

  // 6. Selenium E2E Sub-Agent
  const seleniumPromise = callAgent(
    'tester',
    SELENIUM_PROMPT,
    userMessage + '\nGenerate Selenium WebDriver E2E browser validation tests, including console log capture and form interactions.',
    'Llama',
    4096
  ).then(res => ({
    path: '__tests__/selenium-e2e.test.ts',
    content: stripCodeFences(res),
    agent: 'tester' as const,
    generatedAt: timestamp
  }));

  return Promise.all([
    unitTestPromise,
    playwrightPromise,
    puppeteerPromise,
    lighthousePromise,
    axePromise,
    seleniumPromise
  ]);
}
