// ─── memory/episodic/index.ts ─────────────────────────────────────────────────
// Episodic memory data access layer (§5 of target.md).
// Provides typed wrappers around the Postgres tables defined in schema.ts.
// Falls back gracefully (no-op) when DB_URL is not configured, so the
// system works in dev/test without a Postgres instance.

import { EpisodicRun, EpisodicFailureReport, EpisodicRepairAttempt, EPISODIC_SCHEMA_SQL } from './schema';

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// ─── Database client abstraction ───────────────────────────────────────────────
// We use a minimal interface so the real pg client can be injected later.

export interface DbClient {
  query<R = unknown>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

let _db: DbClient | null = null;

/** Call this once at startup with a configured pg.Client or postgres.js instance */
export function configureEpisodicDb(client: DbClient): void {
  _db = client;
}

async function db(): Promise<DbClient | null> {
  if (!_db) return null; // no-op fallback
  return _db;
}

/** Initialize the schema (idempotent — uses IF NOT EXISTS) */
export async function initEpisodicSchema(): Promise<void> {
  const client = await db();
  if (!client) return;
  await client.query(EPISODIC_SCHEMA_SQL);
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export async function createRun(
  id: string,
  requestText: string,
  template?: string,
): Promise<void> {
  const client = await db();
  if (!client) return;
  await client.query(
    `INSERT INTO episodic_runs (id, request_text, template, started_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [id, requestText, template],
  );
}

export async function completeRun(
  id: string,
  outcome: EpisodicRun['outcome'],
  totalRepairLoops: number,
  totalTokens: number,
  totalCostUsd: number,
): Promise<void> {
  const client = await db();
  if (!client) return;
  await client.query(
    `UPDATE episodic_runs
     SET ended_at = NOW(), outcome = $2, total_repair_loops = $3,
         total_tokens = $4, total_cost_usd = $5
     WHERE id = $1`,
    [id, outcome, totalRepairLoops, totalTokens, totalCostUsd],
  );
}

export async function getRecentRuns(limit = 20): Promise<EpisodicRun[]> {
  const client = await db();
  if (!client) return [];
  const { rows } = await client.query<EpisodicRun>(
    `SELECT id, request_text AS "requestText", template, started_at AS "startedAt",
            ended_at AS "endedAt", outcome, total_repair_loops AS "totalRepairLoops",
            total_tokens AS "totalTokens", total_cost_usd AS "totalCostUsd"
     FROM episodic_runs
     ORDER BY started_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

// ─── Failure Reports ──────────────────────────────────────────────────────────

export async function insertFailureReport(
  report: Omit<EpisodicFailureReport, 'id' | 'createdAt'>,
): Promise<string> {
  const client = await db();
  if (!client) return uuid();
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO failure_reports
       (run_id, category, severity, page, url, component, error, stack_trace,
        screenshot_url, html_snapshot_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      report.runId, report.category, report.severity, report.page, report.url,
      report.component, report.error, report.stackTrace,
      report.screenshotUrl, report.htmlSnapshotUrl,
    ],
  );
  return rows[0].id;
}

export async function getFailureReportsByRun(runId: string): Promise<EpisodicFailureReport[]> {
  const client = await db();
  if (!client) return [];
  const { rows } = await client.query<EpisodicFailureReport>(
    `SELECT id, run_id AS "runId", category, severity, page, url, component,
            error, stack_trace AS "stackTrace", screenshot_url AS "screenshotUrl",
            html_snapshot_url AS "htmlSnapshotUrl", created_at AS "createdAt"
     FROM failure_reports WHERE run_id = $1 ORDER BY created_at`,
    [runId],
  );
  return rows;
}

// ─── Repair Attempts ──────────────────────────────────────────────────────────

export async function insertRepairAttempt(
  attempt: Omit<EpisodicRepairAttempt, 'id' | 'createdAt'>,
): Promise<string> {
  const client = await db();
  if (!client) return uuid();
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO repair_attempts (failure_report_id, run_id, diff, explanation, succeeded)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [attempt.failureReportId, attempt.runId, attempt.diff, attempt.explanation, attempt.succeeded],
  );
  return rows[0].id;
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export async function getSuccessRate(): Promise<number> {
  const client = await db();
  if (!client) return 0;
  const { rows } = await client.query<{ rate: number }>(
    `SELECT ROUND(
       COUNT(*) FILTER (WHERE outcome = 'SUCCEEDED')::numeric / NULLIF(COUNT(*), 0), 3
     ) AS rate FROM episodic_runs WHERE ended_at IS NOT NULL`,
  );
  return rows[0]?.rate ?? 0;
}

export async function getTopFailureCategories(
  limit = 10,
): Promise<{ category: string; count: number }[]> {
  const client = await db();
  if (!client) return [];
  const { rows } = await client.query<{ category: string; count: number }>(
    `SELECT category, COUNT(*) AS count FROM failure_reports
     GROUP BY category ORDER BY count DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
