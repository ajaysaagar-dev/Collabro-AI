// ─── models/router.ts ─────────────────────────────────────────────────────────
// Intelligent model router (§6 of target.md).
// Selects provider + model based on agent type and task complexity.
// Cheap/fast model for log parsing/classification; strongest for Coder/Repair/Planner.
// Supports automatic fallback on rate-limit/5xx before failing the run.
// Uses JSON-schema-constrained tool calling for structured outputs — no regex parsing.

export type AgentType =
  | 'planner'
  | 'coder'
  | 'reviewer'
  | 'tester'
  | 'classifier'  // cheap: log parsing, failure categorization
  | 'repair'
  | 'deployer'
  | 'embedder';

export type TaskComplexity = 'low' | 'medium' | 'high';

export type Provider = 'openai' | 'anthropic' | 'ollama';

export interface ModelSpec {
  provider: Provider;
  model: string;
  /** Maximum tokens in the context window */
  contextWindow: number;
  /** Rough cost per 1K output tokens in USD */
  costPer1kOut: number;
  /** Whether this model supports JSON-schema tool calling (structured output) */
  supportsStructuredOutput: boolean;
}

export const MODEL_CATALOG: ModelSpec[] = [
  // OpenAI — strongest models for reasoning-heavy tasks
  { provider: 'openai', model: 'gpt-4o',             contextWindow: 128_000, costPer1kOut: 0.015, supportsStructuredOutput: true  },
  { provider: 'openai', model: 'gpt-4o-mini',        contextWindow: 128_000, costPer1kOut: 0.0006, supportsStructuredOutput: true },
  { provider: 'openai', model: 'o3-mini',             contextWindow: 200_000, costPer1kOut: 0.0044, supportsStructuredOutput: true },
  // Anthropic — secondary provider, auto-fallback
  { provider: 'anthropic', model: 'claude-opus-4-5',  contextWindow: 200_000, costPer1kOut: 0.075, supportsStructuredOutput: true  },
  { provider: 'anthropic', model: 'claude-sonnet-4-5',contextWindow: 200_000, costPer1kOut: 0.015, supportsStructuredOutput: true  },
  { provider: 'anthropic', model: 'claude-haiku-3-5', contextWindow: 200_000, costPer1kOut: 0.00125, supportsStructuredOutput: true },
  // Ollama — local/offline option, no cost
  { provider: 'ollama', model: 'llama3.2',            contextWindow: 128_000, costPer1kOut: 0, supportsStructuredOutput: false },
  { provider: 'ollama', model: 'qwen2.5-coder',       contextWindow: 128_000, costPer1kOut: 0, supportsStructuredOutput: false },
];

// ─── Routing table ────────────────────────────────────────────────────────────

type RoutingEntry = {
  primary: { provider: Provider; model: string };
  fallback: { provider: Provider; model: string };
};

const ROUTING_TABLE: Record<AgentType, Record<TaskComplexity, RoutingEntry>> = {
  planner: {
    low:    { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    medium: { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
    high:   { primary: { provider: 'anthropic', model: 'claude-opus-4-5'  }, fallback: { provider: 'openai',    model: 'gpt-4o'            } },
  },
  coder: {
    low:    { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    medium: { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
    high:   { primary: { provider: 'anthropic', model: 'claude-opus-4-5'  }, fallback: { provider: 'openai',    model: 'gpt-4o'            } },
  },
  reviewer: {
    low:    { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    medium: { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
    high:   { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
  },
  tester: {
    low:    { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    medium: { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    high:   { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
  },
  classifier: {
    // Log parsing / failure categorization — always use the cheapest/fastest
    low:    { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    medium: { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    high:   { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
  },
  repair: {
    low:    { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
    medium: { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
    high:   { primary: { provider: 'anthropic', model: 'claude-opus-4-5'  }, fallback: { provider: 'openai',    model: 'gpt-4o'            } },
  },
  deployer: {
    low:    { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    medium: { primary: { provider: 'openai',    model: 'gpt-4o-mini'      }, fallback: { provider: 'anthropic', model: 'claude-haiku-3-5' } },
    high:   { primary: { provider: 'openai',    model: 'gpt-4o'           }, fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' } },
  },
  embedder: {
    // Always use OpenAI's embedding endpoint regardless of complexity
    low:    { primary: { provider: 'openai', model: 'text-embedding-3-small' }, fallback: { provider: 'openai', model: 'text-embedding-3-small' } },
    medium: { primary: { provider: 'openai', model: 'text-embedding-3-small' }, fallback: { provider: 'openai', model: 'text-embedding-3-small' } },
    high:   { primary: { provider: 'openai', model: 'text-embedding-3-large' }, fallback: { provider: 'openai', model: 'text-embedding-3-small' } },
  },
};

// ─── Public router ─────────────────────────────────────────────────────────────

export interface RouteResult {
  provider: Provider;
  model: string;
  spec: ModelSpec;
  isFallback: boolean;
}

export function routeModel(
  agent: AgentType,
  complexity: TaskComplexity = 'medium',
  preferredProvider?: Provider,
): RouteResult {
  const entry = ROUTING_TABLE[agent]?.[complexity] ?? ROUTING_TABLE.coder.medium;
  const target = preferredProvider
    ? (entry.primary.provider === preferredProvider ? entry.primary : entry.fallback)
    : entry.primary;

  const spec = MODEL_CATALOG.find(
    (m) => m.provider === target.provider && m.model === target.model,
  ) ?? MODEL_CATALOG[0];

  return { provider: target.provider, model: target.model, spec, isFallback: false };
}

export function routeModelWithFallback(
  agent: AgentType,
  complexity: TaskComplexity = 'medium',
  failedProviders: Provider[] = [],
): RouteResult {
  const entry = ROUTING_TABLE[agent]?.[complexity] ?? ROUTING_TABLE.coder.medium;

  for (const candidate of [entry.primary, entry.fallback]) {
    if (!failedProviders.includes(candidate.provider)) {
      const spec = MODEL_CATALOG.find(
        (m) => m.provider === candidate.provider && m.model === candidate.model,
      ) ?? MODEL_CATALOG[0];
      return {
        provider: candidate.provider,
        model: candidate.model,
        spec,
        isFallback: candidate === entry.fallback,
      };
    }
  }

  // Last resort: any Ollama model (local, no rate limits)
  const ollamaSpec = MODEL_CATALOG.find((m) => m.provider === 'ollama')!;
  return { provider: 'ollama', model: ollamaSpec.model, spec: ollamaSpec, isFallback: true };
}
