// ─── Requirements Validator Agent ───────────────────────────────────────────
// Validates and enhances requirements from the prompt analysis

import { callAgentJSON } from '@/core/executor/executor';
import { PromptAnalysis, RequirementsValidation } from '@/types';

const SYSTEM_PROMPT = `You are a senior software requirements engineer. Your job is to review a project analysis and identify any missing, incomplete, or risky requirements.

You will receive a structured project analysis. Review it thoroughly and respond with ONLY a valid JSON object (no markdown, no explanation) with this structure:

{
  "missingRequirements": ["array of strings - Requirements that are missing but needed for a production-ready project"],
  "suggestedAdditions": ["array of strings - Nice-to-have features or improvements to suggest"],
  "confirmedRequirements": ["array of strings - Requirements from the analysis that are well-defined and confirmed"],
  "riskAreas": ["array of strings - Potential risks, technical challenges, or areas that need special attention"],
  "isComplete": boolean - Whether the requirements are sufficient to begin architecture design
}

Guidelines:
- Always check for: error handling, input validation, security, performance, accessibility, responsive design
- Check if authentication/authorization flows are fully specified
- Verify database relationships and data models are implied
- Check for missing CRUD operations
- Identify any ambiguous requirements
- Consider edge cases and error states
- Check for deployment and DevOps requirements
- Consider scalability implications
- isComplete should be true if basic requirements exist (we fill in gaps), false only if the prompt is too vague to build anything`;

/**
 * Validates requirements from prompt analysis and identifies gaps.
 */
export async function validateRequirements(
  analysis: PromptAnalysis
): Promise<RequirementsValidation> {
  try {
    const result = await callAgentJSON<RequirementsValidation>(
      'requirements-validator',
      SYSTEM_PROMPT,
      `Review and validate this project analysis:\n\n${JSON.stringify(analysis, null, 2)}`,
      'Llama',
      4096
    );

    return {
      missingRequirements: Array.isArray(result.missingRequirements) ? result.missingRequirements : [],
      suggestedAdditions: Array.isArray(result.suggestedAdditions) ? result.suggestedAdditions : [],
      confirmedRequirements: Array.isArray(result.confirmedRequirements) ? result.confirmedRequirements : [],
      riskAreas: Array.isArray(result.riskAreas) ? result.riskAreas : [],
      isComplete: typeof result.isComplete === 'boolean' ? result.isComplete : true,
    };
  } catch (error) {
    console.error('[requirements-validator] Failed to validate requirements:', error);
    return {
      missingRequirements: ['Error handling strategy', 'Input validation'],
      suggestedAdditions: ['Rate limiting', 'Logging and monitoring'],
      confirmedRequirements: analysis.features,
      riskAreas: ['Requirements could not be fully validated due to an error'],
      isComplete: true,
    };
  }
}
