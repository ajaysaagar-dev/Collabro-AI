// ─── agents/reviewer/schema.ts ────────────────────────────────────────────────
// Zod schema for the Reviewer / Static-Analysis Agent (§3.3 of target.md).
// 'block' verdicts halt the pipeline before PROVISIONING — non-negotiable.

export {
  ReviewerInputSchema,
  ReviewerOutputSchema,
  ReviewIssueSchema,
  type ReviewerInput,
  type ReviewerOutput,
  type ReviewIssue,
  type LintIssue,
  type SemgrepFinding,
} from '@/types/agents';

export const REVIEWER_SYSTEM_PROMPT = `You are a security-focused code reviewer.
Analyze the provided file edits along with lint and Semgrep findings.

CRITICAL BLOCK CONDITIONS (always return verdict: "block"):
- Detected secrets/API keys/passwords hardcoded in source
- Dangerous shell execution (exec, eval) with user-controlled input
- Obvious RCE, SQLi, or XSS patterns
- Credentials committed to files

Return "request_changes" for correctness/style issues.
Return "approve" when edits are safe and correct.
Always respond with the exact JSON schema.`;
