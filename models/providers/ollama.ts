// ─── models/providers/ollama.ts ───────────────────────────────────────────────
// Ollama local model adapter — offline/dev-cost option (§6 of target.md).
// Falls back gracefully if Ollama is not running.

export interface OllamaCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  /** Ollama host, defaults to http://localhost:11434 */
  host?: string;
}

export interface OllamaCallResult<T = string> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function callOllama<T = string>(
  opts: OllamaCallOptions,
): Promise<OllamaCallResult<T>> {
  const host = opts.host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434';

  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user',   content: opts.userPrompt   },
      ],
      options: {
        num_predict: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.3,
      },
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000), // 2 min timeout
  });

  if (!response.ok) {
    throw new Error(`[Ollama] Request failed: ${response.status} — is Ollama running at ${host}?`);
  }

  const json = (await response.json()) as {
    message: { content: string };
    prompt_eval_count?: number;
    eval_count?: number;
    model: string;
  };

  return {
    data: json.message.content as unknown as T,
    inputTokens: json.prompt_eval_count ?? 0,
    outputTokens: json.eval_count ?? 0,
    model: json.model,
  };
}

/** Check if Ollama is running and the model is available */
export async function isOllamaAvailable(model: string, host?: string): Promise<boolean> {
  const baseUrl = host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  try {
    const r = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return false;
    const { models } = (await r.json()) as { models: { name: string }[] };
    return models.some((m) => m.name.startsWith(model));
  } catch {
    return false;
  }
}
