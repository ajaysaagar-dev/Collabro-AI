// ─── models/providers/anthropic.ts ───────────────────────────────────────────
// Anthropic Claude adapter with structured output via tool-use (JSON).
// Used as secondary provider / auto-fallback when OpenAI is rate-limited.

export interface AnthropicCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  responseSchema?: Record<string, unknown>;
  maxTokens?: number;
}

export interface AnthropicCallResult<T = unknown> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function callAnthropic<T = unknown>(
  opts: AnthropicCallOptions,
): Promise<AnthropicCallResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('[Anthropic] ANTHROPIC_API_KEY not set');

  const body: Record<string, unknown> = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.systemPrompt,
    messages: [{ role: 'user', content: opts.userPrompt }],
  };

  // Use tool-use for structured output when schema is provided
  if (opts.responseSchema) {
    body.tools = [
      {
        name: 'agent_response',
        description: 'Return the structured agent response',
        input_schema: { type: 'object', ...opts.responseSchema },
      },
    ];
    body.tool_choice = { type: 'tool', name: 'agent_response' };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[Anthropic] API error ${response.status}: ${err}`);
  }

  const json = (await response.json()) as {
    content: { type: string; text?: string; input?: T }[];
    usage: { input_tokens: number; output_tokens: number };
    model: string;
  };

  let data: T;
  if (opts.responseSchema) {
    const toolUse = json.content.find((b) => b.type === 'tool_use');
    data = (toolUse?.input ?? {}) as T;
  } else {
    const textBlock = json.content.find((b) => b.type === 'text');
    data = (textBlock?.text ?? '') as unknown as T;
  }

  return {
    data,
    inputTokens: json.usage.input_tokens,
    outputTokens: json.usage.output_tokens,
    model: json.model,
  };
}
