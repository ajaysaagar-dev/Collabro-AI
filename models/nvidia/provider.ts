import OpenAI from 'openai';
import { ModelOptions } from './types';
import { ModelChoice } from '@/types';

// API Keys extracted from Models.md
const KEY_POOL = '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';
const KEY_MAIN = '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';

const clientPool = new OpenAI({
  apiKey: KEY_POOL,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const clientMain = new OpenAI({
  apiKey: KEY_MAIN,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export const MODELS_CONFIG = {
  'poolside-laguna': { name: 'poolside/laguna-xs-2.1', client: clientPool },
  'z-ai-glm':        { name: 'z-ai/glm-5.2',           client: clientMain },
  'minimax-m3':      { name: 'minimaxai/minimax-m3',   client: clientMain },
  'nemotron-3':      { name: 'nvidia/nemotron-3-ultra-550b-a55b', client: clientMain },
  'mixtral-8x7b':    { name: 'mistralai/mixtral-8x7b-instruct-v0.1', client: clientMain },
  'llama-3.1-8b':    { name: 'meta/llama-3.1-8b-instruct',  client: clientMain },
  'llama-3.1-70b':   { name: 'meta/llama-3.1-70b-instruct', client: clientMain },
  'gemma-2-2b':      { name: 'google/gemma-2-2b-it',        client: clientMain },
  'llama-3.2-1b':    { name: 'meta/llama-3.2-1b-instruct',  client: clientMain },
  'llama-3.2-3b':    { name: 'meta/llama-3.2-3b-instruct',  client: clientMain },
  'llama-3.3-70b':   { name: 'meta/llama-3.3-70b-instruct', client: clientMain },
  'phi-4-mini':      { name: 'microsoft/phi-4-mini-instruct', client: clientMain },
  'Llama':           { name: 'meta/llama-3.3-70b-instruct', client: clientMain },
  'Mixtral':         { name: 'mistralai/mixtral-8x7b-instruct-v0.1', client: clientMain },
  'Phi':             { name: 'microsoft/phi-4-mini-instruct', client: clientMain },
};

export type AvailableModelKey = keyof typeof MODELS_CONFIG;

const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 40;

/**
 * Enforces a strict rate limit of 40 requests per minute (RPM).
 * Uses a sliding window and suspends requests until a slot opens up.
 */
async function throttleRequest(): Promise<void> {
  while (true) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps outside of the 1-minute window
    while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length < MAX_REQUESTS_PER_MINUTE) {
      requestTimestamps.push(now);
      return;
    }

    // Wait until the oldest request expires to free up a slot
    const timeToWait = requestTimestamps[0] - oneMinuteAgo + 100; // 100ms safety buffer
    await new Promise((resolve) => setTimeout(resolve, Math.max(timeToWait, 100)));
  }
}

export async function callModel(
  modelKey: ModelChoice,
  prompt: string,
  options?: ModelOptions
): Promise<string> {
  const config = MODELS_CONFIG[modelKey as AvailableModelKey];
  if (!config) throw new Error(`Model ${modelKey} is not configured.`);

  // Rate limit throttle
  await throttleRequest();

  const isStream = options?.stream ?? false;

  const payload: OpenAI.Chat.Completions.ChatCompletionCreateParams & {
    seed?: number;
    reasoning_budget?: number;
    chat_template_kwargs?: Record<string, unknown>;
  } = {
    model: config.name,
    messages: [{ role: 'user', content: prompt }],
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.max_tokens ?? 1024,
    top_p: options?.top_p ?? 0.7,
    stream: isStream,
  };

  // Add model-specific parameters from Models.md
  if (modelKey === 'z-ai-glm') {
    payload.seed = 42;
  } else if (modelKey === 'nemotron-3') {
    payload.reasoning_budget = 16384;
    payload.chat_template_kwargs = { enable_thinking: true };
  }

  const completion = await config.client.chat.completions.create(payload);

  if (isStream) {
    let fullContent = '';
    for await (const chunk of completion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
      const text = chunk.choices[0]?.delta?.content || '';
      fullContent += text;
      if (options?.onChunk) {
        options.onChunk(text);
      }
    }
    return fullContent;
  } else {
    return (completion as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content || '';
  }
}

// Keep AI_Models exported for backward compatibility
export const AI_Models = {
  Llama: (content: string, opts?: ModelOptions) => callModel('llama-3.3-70b', content, opts),
  Mixtral: (content: string, opts?: ModelOptions) => callModel('mixtral-8x7b', content, opts),
  Phi: (content: string, opts?: ModelOptions) => callModel('phi-4-mini', content, opts),
  OpenAI: (content: string, opts?: ModelOptions) => callModel('llama-3.3-70b', content, opts),
};

export default async function defaultModel(content: string, parameters?: ModelOptions) {
  return callModel('llama-3.3-70b', content, parameters);
}
