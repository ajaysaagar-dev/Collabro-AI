// ─── models/providers/openai.ts ───────────────────────────────────────────────
// OpenAI provider adapter with structured output (JSON-schema tool calling).
// Uses json_schema response format for constrained outputs — never regex-parses completions.

import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Zod schema exported as JSON Schema for constrained output */
  responseSchema?: Record<string, unknown>;
  /** Max output tokens */
  maxTokens?: number;
  temperature?: number;
}

export interface CallResult<T = unknown> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function callOpenAI<T = unknown>(opts: CallOptions): Promise<CallResult<T>> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: opts.systemPrompt },
    { role: 'user',   content: opts.userPrompt   },
  ];

  if (opts.responseSchema) {
    // Use structured output (JSON schema constrained)
    const response = await client.chat.completions.create({
      model: opts.model,
      messages,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'agent_response',
          strict: true,
          schema: opts.responseSchema,
        },
      },
    });

    const content = response.choices[0].message.content ?? '{}';
    return {
      data: JSON.parse(content) as T,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
    };
  }

  // Unstructured (text) call
  const response = await client.chat.completions.create({
    model: opts.model,
    messages,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.3,
  });

  return {
    data: (response.choices[0].message.content ?? '') as unknown as T,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    model: response.model,
  };
}
