// ─── memory/semantic/index.ts ─────────────────────────────────────────────────
// Semantic memory tier — vector store client + embedding utils (§5 of target.md).
// Stores embeddings of (errorSignature → fix diff, success rate) pairs.
// Backed by pgvector (via episodic DB), with optional Qdrant support.
//
// This is the highest-leverage addition: it turns the repair loop into a
// self-improving system instead of stateless reasoning every time.

import type { DbClient } from '../episodic';
import { MemoryHint } from '@/types/agents';

let _db: DbClient | null = null;
let _openaiKey: string | null = null;

export function configureSemanticMemory(client: DbClient, openaiApiKey: string): void {
  _db = client;
  _openaiKey = openaiApiKey;
}

// ─── Embedding ────────────────────────────────────────────────────────────────

/**
 * Embed a text string using OpenAI text-embedding-3-small (1536-dim).
 * Falls back to a zero vector if the API key is not configured.
 */
export async function embed(text: string): Promise<number[]> {
  if (!_openaiKey) {
    // Return a deterministic hash-based pseudo-vector for offline use
    return pseudoEmbed(text);
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${_openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8192), // token limit safety
    }),
  });

  if (!response.ok) {
    throw new Error(`[SemanticMemory] Embedding API error: ${response.status}`);
  }

  const data = (await response.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

/** Deterministic pseudo-embedding for offline/test use (NOT for semantic similarity) */
function pseudoEmbed(text: string): number[] {
  const vec = new Array<number>(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % 1536] = (vec[i % 1536] + text.charCodeAt(i)) / 256;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

// ─── Error signature normalization ───────────────────────────────────────────

/**
 * Normalize an error string for deduplication.
 * Strips line numbers, file paths, and memory addresses.
 */
export function normalizeErrorSignature(error: string): string {
  return error
    .replace(/\/[^\s:]+:\d+:\d+/g, '<path>')  // file paths + line numbers
    .replace(/0x[0-9a-f]+/gi, '<addr>')          // memory addresses
    .replace(/\d{4,}/g, '<N>')                   // large numbers
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 512);
}

// ─── Store a fix result ───────────────────────────────────────────────────────

export async function storeFix(params: {
  failureReportId: string;
  error: string;
  fixDiff: string;
  succeeded: boolean;
}): Promise<void> {
  if (!_db) return;

  const errorSignature = normalizeErrorSignature(params.error);
  const embedding = await embed(errorSignature);
  const vectorLiteral = `[${embedding.join(',')}]`;

  // Upsert: if same error signature exists, update success rate
  await _db.query(
    `INSERT INTO fix_embeddings (failure_report_id, embedding, error_signature, fix_diff, success_rate, total_attempts)
     VALUES ($1, $2::vector, $3, $4, $5, 1)
     ON CONFLICT (error_signature) DO UPDATE
       SET total_attempts = fix_embeddings.total_attempts + 1,
           success_rate = (
             fix_embeddings.success_rate * fix_embeddings.total_attempts + $5
           ) / (fix_embeddings.total_attempts + 1),
           fix_diff = CASE WHEN $5 > fix_embeddings.success_rate THEN $4 ELSE fix_embeddings.fix_diff END,
           updated_at = NOW()`,
    [params.failureReportId, vectorLiteral, errorSignature, params.fixDiff, params.succeeded ? 1 : 0],
  );
}

// ─── Query similar past fixes ─────────────────────────────────────────────────

/**
 * Given an error string, find the k most similar past (error → fix) pairs.
 * Returns MemoryHints ready to be injected into Coder/Repair agent prompts.
 */
export async function queryFixes(error: string, k = 3): Promise<MemoryHint[]> {
  if (!_db) return [];

  const errorSignature = normalizeErrorSignature(error);
  const embedding = await embed(errorSignature);
  const vectorLiteral = `[${embedding.join(',')}]`;

  const { rows } = await _db.query<{ error_signature: string; fix_diff: string; success_rate: number }>(
    `SELECT error_signature, fix_diff, success_rate
     FROM fix_embeddings
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, k],
  );

  return rows.map((r) => ({
    pastErrorPattern: r.error_signature,
    fix: r.fix_diff,
    successRate: Number(r.success_rate),
  }));
}
