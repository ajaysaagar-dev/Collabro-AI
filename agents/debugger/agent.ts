// ─── Debugger Agent ──────────────────────────────────────────────────────────
// Fixes compilation, linting, and testing errors in generated code

import { callAgent } from '@/core/executor/executor';
import { PromptAnalysis, ArchitectureDesign } from '@/types';
import { stripCodeFences } from '@/utils/parser';

const SYSTEM_PROMPT = `You are an expert debugger and software repair engineer. Your job is to fix errors, compilation issues, lint errors, or test failures in a code file.

IMPORTANT RULES:
- Write ONLY the corrected, full file content - no markdown code fences, no explanations, no comments about what you're doing
- Start directly with imports or the first line of code
- Do NOT truncate the file or leave placeholders (like '// rest of code stays the same'). You MUST output the entire corrected file.
- Ensure all imports are correct, type-safe, and do not use invalid aliases.
- Fix all syntax errors, type mismatches, missing props, and temporal dead zone (TDZ) references.`;

export async function debugCodeFile(context: {
  path: string;
  content: string;
  errorLog: string;
  analysis: PromptAnalysis;
  architecture: ArchitectureDesign;
}): Promise<string> {
  const userMessage = `Fix the following file to resolve the errors listed below.

File Path: ${context.path}

Original File Content:
\`\`\`typescript
${context.content}
\`\`\`

Error / Build Logs:
${context.errorLog}

Project Context:
- Project Type: ${context.analysis.projectType}
- Frontend: ${context.analysis.frontend}
- Backend: ${context.analysis.backend}
- Database: ${context.analysis.database}

Architecture:
- Folder Structure: ${context.architecture.folderStructure.substring(0, 500)}

Output the entire corrected code file now. Output ONLY the code, no explanations, no markdown fences.`;

  const result = await callAgent(
    'tester',
    SYSTEM_PROMPT,
    userMessage,
    'Llama',
    6144
  );

  return stripCodeFences(result);
}
