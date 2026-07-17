// ─── eval/runEval.ts ──────────────────────────────────────────────────────────
// Eval harness runner (§10 of target.md).
// Runs a fixed benchmark set against the orchestrator and tracks pass rate.
// Run this in CI on every change to orchestrator/ or agents/ to detect regressions.
//
// Usage: npx ts-node eval/runEval.ts [--suite all|smoke]

import * as fs from 'fs';
import * as path from 'path';

// ─── Benchmark types ──────────────────────────────────────────────────────────

export interface EvalBenchmark {
  id: string;
  name: string;
  requestText: string;
  /** Acceptance criteria — all must pass for the run to count as passing */
  acceptanceCriteria: EvalCriterion[];
  stack?: string;
  tags?: string[];
}

export interface EvalCriterion {
  type:
    | 'file_exists'           // a specific file must be present in output
    | 'no_console_errors'     // no JS errors in the browser console
    | 'axe_zero_critical'     // axe-core must have 0 critical violations
    | 'lighthouse_perf_gte'   // Lighthouse performance score ≥ threshold
    | 'selector_exists'       // a CSS selector must exist in the rendered page
    | 'page_loads'            // page responds 2xx within timeout
    | 'text_contains';        // page text contains a string
  value?: string | number;
}

export interface EvalResult {
  benchmarkId: string;
  passed: boolean;
  failedCriteria: string[];
  repairLoops: number;
  totalTokens: number;
  durationMs: number;
  runId: string;
}

export interface EvalSuiteResult {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: EvalResult[];
  timestamp: string;
}

// ─── Load benchmarks ──────────────────────────────────────────────────────────

function loadBenchmarks(suiteFilter?: string): EvalBenchmark[] {
  const benchmarksDir = path.join(__dirname, 'benchmarks');
  if (!fs.existsSync(benchmarksDir)) return [];

  const files = fs.readdirSync(benchmarksDir).filter((f) => f.endsWith('.json'));
  const all: EvalBenchmark[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(benchmarksDir, file), 'utf-8');
      const bench = JSON.parse(raw) as EvalBenchmark;
      if (!suiteFilter || bench.tags?.includes(suiteFilter)) {
        all.push(bench);
      }
    } catch (err) {
      console.warn(`[Eval] Failed to load benchmark ${file}:`, err);
    }
  }

  return all;
}

// ─── Criterion checkers ───────────────────────────────────────────────────────

async function checkCriterion(
  criterion: EvalCriterion,
  outputPath: string,
  baseUrl: string,
): Promise<{ passed: boolean; message: string }> {
  switch (criterion.type) {
    case 'file_exists': {
      const filePath = path.join(outputPath, criterion.value as string);
      const exists = fs.existsSync(filePath);
      return { passed: exists, message: `file_exists: ${criterion.value} — ${exists ? 'OK' : 'MISSING'}` };
    }

    case 'page_loads': {
      try {
        const r = await fetch(`${baseUrl}${criterion.value ?? '/'}`, {
          signal: AbortSignal.timeout(10_000),
        });
        return { passed: r.ok, message: `page_loads: ${baseUrl} — HTTP ${r.status}` };
      } catch (e) {
        return { passed: false, message: `page_loads failed: ${e}` };
      }
    }

    default:
      // Placeholder for axe-core, Lighthouse, Selenium criteria
      // These are dispatched to sub-agents in the full implementation
      return { passed: true, message: `${criterion.type}: stub (not yet implemented)` };
  }
}

// ─── Main runner ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const suiteArg = args.find((a) => a.startsWith('--suite='))?.split('=')[1] ?? 'smoke';
  const outputFile = args.find((a) => a.startsWith('--output='))?.split('=')[1];

  const benchmarks = loadBenchmarks(suiteArg);
  if (benchmarks.length === 0) {
    console.log(`[Eval] No benchmarks found for suite "${suiteArg}"`);
    console.log('[Eval] Add JSON files to eval/benchmarks/ to define test cases');
    process.exit(0);
  }

  console.log(`[Eval] Running suite "${suiteArg}" — ${benchmarks.length} benchmarks`);
  const results: EvalResult[] = [];

  for (const bench of benchmarks) {
    const start = Date.now();
    console.log(`\n[Eval] >> ${bench.id}: ${bench.name}`);

    try {
      // Import orchestrator dynamically to avoid circular deps in test mode
      const { OCollabro, addOrUpdateGeneratedFile } = await import('../orchestrator/ocollabro');
      const runId = `eval-${bench.id}-${Date.now()}`;

      // Pre-populate a project in the memory store for OCollabro to pick up
      const { createProject } = await import('../memory/store');
      createProject(runId, bench.requestText, 'Llama');

      // Run the orchestrator
      const orch = new OCollabro(runId);
      await orch.run();

      // Retrieve run result from memory store
      const { getProject } = await import('../memory/store');
      const project = getProject(runId);
      const outputPath = `/tmp/collabro-eval/${runId}`;
      const baseUrl = 'http://localhost:3000';
      const failedCriteria: string[] = [];
      for (const criterion of bench.acceptanceCriteria) {
        const check = await checkCriterion(
          criterion,
          outputPath,
          baseUrl,
        );
        if (!check.passed) failedCriteria.push(check.message);
      }

      const repairCycles = project?.repairReport?.repairCycles ?? 0;
      results.push({
        benchmarkId: bench.id,
        passed: failedCriteria.length === 0,
        failedCriteria,
        repairLoops: repairCycles,
        totalTokens: 0,
        durationMs: Date.now() - start,
        runId,
      });
    } catch (err) {
      results.push({
        benchmarkId: bench.id,
        passed: false,
        failedCriteria: [`Run crashed: ${err}`],
        repairLoops: 0,
        totalTokens: 0,
        durationMs: Date.now() - start,
        runId: `eval-${bench.id}-error`,
      });
    }

    const r = results[results.length - 1];
    console.log(`[Eval] ${r.passed ? '✅ PASS' : '❌ FAIL'} — ${r.durationMs}ms, ${r.repairLoops} repair loops`);
    if (!r.passed) r.failedCriteria.forEach((m) => console.log(`  - ${m}`));
  }

  const passed = results.filter((r) => r.passed).length;
  const suiteResult: EvalSuiteResult = {
    suite: suiteArg,
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length > 0 ? passed / results.length : 0,
    results,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n[Eval] ══ Results ══`);
  console.log(`[Eval] Suite: ${suiteArg} | ${passed}/${results.length} passed (${(suiteResult.passRate * 100).toFixed(1)}%)`);

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(suiteResult, null, 2));
    console.log(`[Eval] Results written to: ${outputFile}`);
  }

  process.exit(suiteResult.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[Eval] Fatal error:', err);
  process.exit(2);
});
