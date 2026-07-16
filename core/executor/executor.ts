import { AsyncLocalStorage } from 'async_hooks';
import { callModel } from '@/models/nvidia/provider';
import { AgentRole, ModelChoice } from '@/types';

export const modelContext = new AsyncLocalStorage<ModelChoice>();

/**
 * Calls the LLM with a structured system + user prompt.
 * Races all 12 models concurrently and uses the fastest successful response.
 */
export async function callAgent(
  role: AgentRole,
  systemPrompt: string,
  userMessage: string,
  _model: ModelChoice = 'llama-3.3-70b',
  maxTokens: number = 4096,
  requireJSON: boolean = false
): Promise<string> {
  const fullPrompt = `SYSTEM: ${systemPrompt}\n\nUSER: ${userMessage}`;
  void _model;
  
  // Use the full requested maxTokens to prevent truncated generated files
  const cappedMaxTokens = maxTokens;

  const modelsToRace: ModelChoice[] = [
    'poolside-laguna',
    'z-ai-glm',
    'minimax-m3',
    'nemotron-3',
    'mixtral-8x7b',
    'llama-3.1-8b',
    'llama-3.1-70b',
    'gemma-2-2b',
    'llama-3.2-1b',
    'llama-3.2-3b',
    'llama-3.3-70b',
    'phi-4-mini',
  ];

  const promises = modelsToRace.map(async (m) => {
    try {
      const result = await callModel(m, fullPrompt, {
        temperature: 0.2,
        max_tokens: cappedMaxTokens,
      });

      if (!result || result.trim().length === 0) {
        throw new Error(`Empty response from model ${m}`);
      }

      // If JSON is required, pre-validate it so we don't resolve with malformed JSON
      if (requireJSON) {
        parseJSONResponse(result);
      }

      // Output to terminal in green color showing the winning model
      console.log(`\x1b[32m[race] Model ${m} won the race for agent ${role}!\x1b[0m`);
      return result;
    } catch (err) {
      throw err;
    }
  });

  try {
    return await Promise.any(promises);
  } catch {
    throw new Error(`All models failed to respond for agent ${role}.`);
  }
}

/**
 * Calls the LLM and attempts to parse the response as JSON.
 * Strips markdown code fences and handles common formatting issues.
 */
export async function callAgentJSON<T>(
  role: AgentRole,
  systemPrompt: string,
  userMessage: string,
  model: ModelChoice = 'llama-3.3-70b',
  maxTokens: number = 4096
): Promise<T> {
  const raw = await callAgent(role, systemPrompt, userMessage, model, maxTokens, true);
  return parseJSONResponse<T>(raw);
}

/**
 * Extracts and parses JSON from an LLM response, handling
 * markdown code fences, trailing commas, and other quirks.
 */
export function parseJSONResponse<T>(raw: string): T {
  // Strip markdown code fences if present
  let cleaned = raw.trim();

  // Handle ```json ... ``` blocks
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // If the response starts/ends with non-JSON text, try to extract the JSON object/array
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const objectMatch = cleaned.match(/(\{[\s\S]*\})/);
    const arrayMatch = cleaned.match(/(\[[\s\S]*\])/);
    if (objectMatch) {
      cleaned = objectMatch[1];
    } else if (arrayMatch) {
      cleaned = arrayMatch[1];
    }
  }

  // Remove trailing commas before closing braces/brackets (common LLM mistake)
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(cleaned) as T;
  } catch (firstError) {
    // Second attempt: try to fix common issues
    try {
      // Replace single quotes with double quotes (another common LLM mistake)
      const singleQuoteFixed = cleaned
          .replace(/'/g, '"')
          .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(singleQuoteFixed) as T;
    } catch {
      throw new Error(
          `Failed to parse LLM response as JSON.\nOriginal error: ${firstError}\nRaw response:\n${raw.substring(0, 500)}`
      );
    }
  }
}
