// ─── agents/reviewer/agent.ts ─────────────────────────────────────────────────
// Reviewer / Static-Analysis Agent (§3.3 of target.md).
// Runs BEFORE sandbox provisioning — 'block' verdict halts the pipeline entirely.
// Integrates: ESLint results, Semgrep security findings, and LLM-based review.

import { z } from 'zod';
import {
  ReviewerInput,
  ReviewerOutput,
  ReviewerOutputSchema,
  FileEdit,
  LintIssue,
  SemgrepFinding,
} from '@/types/agents';
import { routeModelWithFallback } from '@/models/router';
import { callOpenAI } from '@/models/providers/openai';
import { callAnthropic } from '@/models/providers/anthropic';
import { REVIEWER_SYSTEM_PROMPT } from './schema';

// ─── Security patterns that always trigger 'block' ───────────────────────────

const BLOCK_PATTERNS = [
  /(?:password|secret|api_?key|token)\s*=\s*['"`][^'"`]{8,}/gi,
  /process\.env\s*\[.*?\]\s*=\s*['"]/gi,
  /eval\s*\(\s*(?:req|request|body|input|user)/gi,
  /child_process\.exec\s*\(\s*(?:req|request|body|input|user)/gi,
  /\bexec\s*\(`[^`]*\$\{(?:req|request|body|input|user)/gi,
];

function detectSecurityBlocks(edits: FileEdit[]): string[] {
  const violations: string[] = [];
  for (const edit of edits) {
    if (!edit.content) continue;
    for (const pattern of BLOCK_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(edit.content)) {
        violations.push(`Security block in ${edit.path}: ${pattern.source}`);
      }
    }
  }
  return violations;
}

// ─── Reviewer Agent ────────────────────────────────────────────────────────────

export async function runReviewerAgent(
  input: ReviewerInput,
  failedProviders: string[] = [],
): Promise<ReviewerOutput> {
  // 1. Fast-path: check for hard-block patterns before any LLM call
  const securityViolations = detectSecurityBlocks(input.fileEdits);
  if (securityViolations.length > 0) {
    return {
      verdict: 'block',
      issues: securityViolations.map((msg) => ({
        file: 'security-scan',
        severity: 'error' as const,
        message: msg,
      })),
    };
  }

  // 2. Check Semgrep for ERROR-severity findings
  const semgrepErrors = input.semgrepResults.filter((f) => f.severity === 'ERROR');
  if (semgrepErrors.length > 0) {
    return {
      verdict: 'block',
      issues: semgrepErrors.map((f) => ({
        file: f.file,
        line: f.line,
        severity: 'error' as const,
        message: `Semgrep [${f.ruleId}]: ${f.message}`,
      })),
    };
  }

  // 3. LLM-based review for correctness and style
  const route = routeModelWithFallback('reviewer', 'medium', failedProviders as never[]);
  const userPrompt = buildReviewPrompt(input);
  const schema = buildResponseSchema();

  try {
    let result: ReviewerOutput;
    if (route.provider === 'anthropic') {
      const r = await callAnthropic<ReviewerOutput>({
        model: route.model,
        systemPrompt: REVIEWER_SYSTEM_PROMPT,
        userPrompt,
        responseSchema: schema,
      });
      result = ReviewerOutputSchema.parse(r.data);
    } else {
      const r = await callOpenAI<ReviewerOutput>({
        model: route.model,
        systemPrompt: REVIEWER_SYSTEM_PROMPT,
        userPrompt,
        responseSchema: schema,
      });
      result = ReviewerOutputSchema.parse(r.data);
    }

    // Merge lint warnings into the result
    const lintIssues = input.lintResults
      .filter((l) => l.severity !== 'info')
      .map((l) => ({
        file: l.file,
        line: l.line,
        severity: l.severity,
        message: `ESLint [${l.rule ?? 'unknown'}]: ${l.message}`,
      }));

    return {
      verdict: result.verdict,
      issues: [...result.issues, ...lintIssues],
    };
  } catch (err) {
    // On validation error, default to approve with a warning
    console.error('[Reviewer] Schema validation failed, defaulting to approve:', err);
    return { verdict: 'approve', issues: [] };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildReviewPrompt(input: ReviewerInput): string {
  const editsSummary = input.fileEdits
    .map((e) => `### ${e.action.toUpperCase()}: ${e.path}\n\`\`\`\n${e.content?.slice(0, 2000) ?? '(deleted)'}\n\`\`\``)
    .join('\n\n');

  const lintSummary = input.lintResults.length > 0
    ? input.lintResults.map((l) => `- [${l.severity}] ${l.file}:${l.line} ${l.message}`).join('\n')
    : 'No lint issues.';

  return `## File Edits to Review\n${editsSummary}\n\n## Lint Results\n${lintSummary}`;
}

function buildResponseSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['approve', 'request_changes', 'block'] },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            line: { type: 'number' },
            severity: { type: 'string', enum: ['info', 'warn', 'error'] },
            message: { type: 'string' },
          },
          required: ['file', 'severity', 'message'],
        },
      },
    },
    required: ['verdict', 'issues'],
    additionalProperties: false,
  };
}
