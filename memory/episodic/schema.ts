// ─── memory/episodic/schema.ts ────────────────────────────────────────────────
// Postgres schema definitions for episodic memory (§5 of target.md).
// Stores every run, FailureReport, and RepairAttempt for permanent querying.
// Uses raw SQL compatible with pg / postgres.js / Drizzle.

export const EPISODIC_SCHEMA_SQL = `
-- Enable uuid-ossp if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Runs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS episodic_runs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_text      TEXT NOT NULL,
  template          TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  outcome           TEXT,            -- 'SUCCEEDED' | 'FAILED_BUDGET' | 'FAILED_FATAL'
  total_repair_loops INT DEFAULT 0,
  total_tokens      BIGINT DEFAULT 0,
  total_cost_usd    NUMERIC(12, 6) DEFAULT 0
);

-- ─── Failure Reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS failure_reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id            UUID REFERENCES episodic_runs(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  severity          TEXT NOT NULL,   -- 'low' | 'medium' | 'high' | 'critical'
  page              TEXT,
  url               TEXT,
  component         TEXT,
  error             TEXT NOT NULL,
  stack_trace       TEXT,
  screenshot_url    TEXT,
  html_snapshot_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Repair Attempts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repair_attempts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  failure_report_id UUID REFERENCES failure_reports(id) ON DELETE CASCADE,
  run_id            UUID REFERENCES episodic_runs(id) ON DELETE CASCADE,
  diff              TEXT,
  explanation       TEXT,
  succeeded         BOOLEAN,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Fix Embeddings (semantic memory bridge) ─────────────────────────────────
-- Requires pgvector extension: CREATE EXTENSION vector;
CREATE TABLE IF NOT EXISTS fix_embeddings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  failure_report_id UUID REFERENCES failure_reports(id),
  embedding         VECTOR(1536),   -- text-embedding-3-small
  error_signature   TEXT NOT NULL,   -- normalized error string for dedup
  fix_diff          TEXT NOT NULL,
  success_rate      NUMERIC(4, 3) DEFAULT 0,
  total_attempts    INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fix_embeddings_vector_idx
  ON fix_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
`;

// ─── TypeScript mirror of DB rows ─────────────────────────────────────────────

export interface EpisodicRun {
  id: string;
  requestText: string;
  template?: string;
  startedAt: Date;
  endedAt?: Date;
  outcome?: 'SUCCEEDED' | 'FAILED_BUDGET' | 'FAILED_FATAL';
  totalRepairLoops: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface EpisodicFailureReport {
  id: string;
  runId: string;
  category: string;
  severity: string;
  page?: string;
  url?: string;
  component?: string;
  error: string;
  stackTrace?: string;
  screenshotUrl?: string;
  htmlSnapshotUrl?: string;
  createdAt: Date;
}

export interface EpisodicRepairAttempt {
  id: string;
  failureReportId: string;
  runId: string;
  diff?: string;
  explanation?: string;
  succeeded?: boolean;
  createdAt: Date;
}

export interface FixEmbedding {
  id: string;
  failureReportId: string;
  embedding: number[];
  errorSignature: string;
  fixDiff: string;
  successRate: number;
  totalAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}
