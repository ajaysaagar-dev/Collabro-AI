# Collabro-AI — Full Blueprint for an Extremely Advanced Autonomous Software Engineering Platform

Repo: https://github.com/ajaysaagar-dev/Collabro-AI
Detected stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · OpenAI SDK · adm-zip
Detected modules: `agents/` `orchestrator/` `core/` `memory/` `models/` `templates/nextjs/` `metadata/project/` `settings/` `types/` `utils/` `app/` `components/` `public/` `selenium.md`

This is a single-file, implementation-level blueprint. It goes beyond "what's missing" into concrete schemas, state machines, folder structures, and a phased build order you can hand directly to an engineering effort (or to Claude Code) to execute against the repo.

---

## 0. One-paragraph thesis

Collabro-AI's real value proposition — visible from `selenium.md` — is a **closed-loop generate → run → observe → repair** system, not a code generator. The thing that makes an agentic SWE platform "extremely advanced" is not more agents or a fancier UI; it's **tight feedback loops with bounded cost, typed contracts between agents, a sandbox that makes autonomous execution safe, and memory that makes repeated failures cheaper to fix over time.** Everything below is organized around those four pillars.

---

## 1. Target System Architecture

```
                         ┌─────────────────────────────┐
                         │        Next.js Dashboard      │
                         │   (app/, components/)         │
                         │  live pipeline view via SSE    │
                         └──────────────┬────────────────┘
                                        │
                         ┌──────────────▼────────────────┐
                         │         ORCHESTRATOR           │
                         │   (state machine + scheduler)   │
                         └───┬─────┬─────┬─────┬─────┬────┘
                             │     │     │     │     │
                 ┌───────────▼┐ ┌─▼───┐ ┌▼────┐ ┌▼────┐ ┌▼──────┐
                 │  Planner   │ │Coder│ │Rev.  │ │Test │ │Repair │
                 │  Agent     │ │Agent│ │Agent │ │Agent │ │Agent  │
                 └───────────┬┘ └─┬───┘ └┬─────┘ └┬────┘ └┬──────┘
                              │    │      │        │       │
                         ┌────▼────▼──────▼────────▼───────▼────┐
                         │            MODEL ROUTER                │
                         │  (OpenAI / Anthropic / local, per-agent)│
                         └──────────────────┬──────────────────────┘
                                            │
                         ┌──────────────────▼──────────────────────┐
                         │              MEMORY LAYER                 │
                         │  Working (Redis) · Episodic (Postgres)     │
                         │  Semantic (pgvector/Qdrant, error→fix)     │
                         └──────────────────┬──────────────────────┘
                                            │
                         ┌──────────────────▼──────────────────────┐
                         │        EXECUTION SANDBOX (per run)        │
                         │  Docker/Firecracker · Selenium+Playwright │
                         │  no host network · resource limits        │
                         └───────────────────────────────────────────┘
```

---

## 2. Orchestrator: explicit state machine

Currently implied narratively in `selenium.md`. Make it a real, typed state machine (XState or hand-rolled), so loops are bounded and every transition is logged.

```
States:
  IDLE
  PLANNING          -> task graph produced by Planner Agent
  GENERATING        -> Coder Agent writes/edits files
  STATIC_REVIEW     -> Reviewer Agent + linters/Semgrep before any execution
  PROVISIONING      -> sandbox container created, deps installed
  STARTING          -> dev server boot, health-check polling
  TESTING           -> Selenium/Playwright run against selenium.md contract
  CLASSIFYING       -> failures bucketed into categories (already defined in selenium.md)
  REPAIRING         -> Repair Agent patches code, bounded by retry budget
  RETESTING         -> back to TESTING with same sandbox generation
  SUCCEEDED
  FAILED_BUDGET     -> retry/time/cost budget exhausted, partial report returned
  FAILED_FATAL      -> unrecoverable (e.g. sandbox crash twice)

Guards (hard limits, config-driven, e.g. in settings/):
  MAX_REPAIR_LOOPS = 5
  MAX_WALL_CLOCK_MINUTES = 15
  MAX_TOKENS_PER_RUN = configurable
  MAX_SANDBOX_RESTARTS = 2

Transition rule: every REPAIRING -> RETESTING transition decrements a budget counter.
Hitting any guard forces FAILED_BUDGET with the full evidence trail attached,
never a silent infinite loop.
```

Deliverable: `orchestrator/stateMachine.ts` with typed states/events, `orchestrator/budgets.ts` for guard config, and structured transition logging emitted as SSE events to the dashboard.

---

## 3. Agent contracts (typed I/O, not free text)

Every agent should consume/produce a strict JSON object validated with Zod. Below is the minimum contract set. Treat `selenium.md`'s prose style as the *narrative* spec and pair it with a machine-checkable schema like these.

### 3.1 Planner / Architect Agent
```ts
Input: {
  requestText: string;
  existingProjectMeta?: ProjectMeta; // from metadata/project/
  constraints: { stack: string; maxFiles?: number; };
}
Output: {
  taskGraph: {
    id: string;
    description: string;
    dependsOn: string[];        // other task ids
    targetFiles: string[];
    agent: "coder" | "reviewer";
  }[];
  templateChoice: string;       // key into template registry (see §7)
}
```

### 3.2 Coder Agent
```ts
Input: {
  task: TaskGraphNode;
  fileContext: { path: string; content: string }[];
  memoryHints?: { pastErrorPattern: string; fix: string }[]; // pulled from semantic memory
}
Output: {
  fileEdits: { path: string; action: "create"|"modify"|"delete"; content?: string }[];
  rationale: string;
  confidence: number; // 0-1, low confidence routes to Reviewer with extra scrutiny
}
```

### 3.3 Reviewer / Static-Analysis Agent
```ts
Input: { fileEdits: FileEdit[]; lintResults: LintIssue[]; semgrepResults: SemgrepFinding[]; }
Output: {
  verdict: "approve" | "request_changes" | "block";
  issues: { file: string; line?: number; severity: "info"|"warn"|"error"; message: string }[];
}
```
`block` verdicts (e.g. detected secret, dangerous shell exec, obvious RCE pattern) must halt the pipeline before it ever reaches PROVISIONING.

### 3.4 Testing Agent — already the most mature spec (`selenium.md`)
Formalize its existing failure-report shape as the canonical schema:
```ts
type FailureReport = {
  category: "Dependency Failure" | "Runtime Failure" | "Browser Failure" | "UI Failure" |
             "API Failure" | "Network Failure" | "Configuration Failure" |
             "Environment Failure" | "Authentication Failure" | "Framework Failure" |
             "Database Failure" | "Performance Failure";
  severity: "low" | "medium" | "high" | "critical";
  page: string; url: string; component?: string;
  error: string; stackTrace?: string;
  consoleLogs: LogEntry[]; networkLogs: NetworkEntry[];
  screenshot: string;   // path/URL to captured artifact
  htmlSnapshot: string; // path/URL
  recommendedRepairAgent: string;
};
```
This exact schema (already implicit in `selenium.md`) should be the contract every downstream agent consumes — don't let it drift between prose and code.

### 3.5 Repair Agent
```ts
Input: { failureReports: FailureReport[]; fileContext: FileContext[]; priorAttempts: RepairAttempt[]; }
Output: {
  fileEdits: FileEdit[];
  targetedFailures: string[]; // which report ids this patch addresses
  explanation: string;
}
```

### 3.6 Deployment Agent (new — extends the pipeline past "runs locally")
```ts
Input: { projectPath: string; target: "vercel"|"docker"|"static-export"; }
Output: { deployUrl?: string; buildLogs: string; success: boolean; }
```

All six contracts live in `types/agents.ts`, imported by `agents/*` and validated at every orchestrator boundary — this alone eliminates most silent-failure classes.

---

## 4. Execution Sandbox (non-negotiable before any autonomy)

The current design (implied) runs `npm install && npm run dev` and Selenium directly. This must move to per-run isolation:

- **Runtime**: Docker container per run, or a microVM service (Firecracker/E2B/Modal) for stronger isolation and faster cold-start than full VMs.
- **Network**: default-deny egress; allow only npm/package registry domains during install, block everything during TESTING unless the app explicitly needs an API the user provided.
- **Resource caps**: CPU/memory/pids limits; kill switch on the orchestrator's `MAX_WALL_CLOCK_MINUTES`.
- **Filesystem**: ephemeral overlay, snapshotted before each repair attempt so a bad repair can be diffed/rolled back cleanly.
- **Browser**: run Selenium/Playwright *inside* the same isolated network namespace as the app under test — never point an external browser at a container with open ports on the host.
- **Secrets**: sandbox gets a scoped, single-purpose credentials set (if any) — never the platform's own OpenAI/DB keys.

Deliverable: `core/sandbox/` with `SandboxProvider` interface, a `DockerSandboxProvider` implementation, and a mockable interface so orchestrator logic is unit-testable without spinning real containers.

---

## 5. Memory Layer — three tiers

| Tier | Store | Contents | Lifetime |
|---|---|---|---|
| Working | Redis / in-process | current run's task graph, live state | duration of one run |
| Episodic | Postgres | every run, every FailureReport, every RepairAttempt, outcomes | permanent, queryable |
| Semantic | pgvector / Qdrant / LanceDB | embeddings of `(errorSignature) -> (fix diff, success rate)` pairs | permanent, grows over time |

**This is the highest-leverage single addition.** Today the Repair Agent (implied) reasons from scratch on every failure. With semantic memory:
1. On CLASSIFYING, embed the failure's `error + stackTrace + category`.
2. Query semantic memory for the k nearest past failures.
3. Pass `memoryHints` (§3.2) into the Coder/Repair agent prompt — "here's how similar errors were fixed before, and whether that fix actually worked."
4. After RETESTING, write back the outcome (success/fail) to reinforce or deprecate that fix pattern.

Over many runs this turns the repair loop into a **self-improving system** instead of a stateless one — genuinely the difference between "advanced" and "extremely advanced."

Schema sketch:
```sql
create table episodic_runs (
  id uuid primary key, request_text text, template text,
  started_at timestamptz, ended_at timestamptz,
  outcome text, total_repair_loops int, total_tokens int, total_cost_usd numeric
);
create table failure_reports (
  id uuid primary key, run_id uuid references episodic_runs(id),
  category text, severity text, error text, stack_trace text,
  screenshot_url text, html_snapshot_url text, created_at timestamptz
);
create table repair_attempts (
  id uuid primary key, failure_report_id uuid references failure_reports(id),
  diff text, succeeded boolean, created_at timestamptz
);
create table fix_embeddings (
  id uuid primary key, failure_report_id uuid,
  embedding vector(1536), fix_diff text, success_rate numeric
);
```

---

## 6. Model Router (`models/`)

- `models/router.ts`: given `{ agent: "coder"|"tester"|..., taskComplexity }`, select provider + model. Cheap/fast model for log parsing and classification (Testing Agent's non-reasoning steps), strongest available model for Coder/Repair/Planner.
- Multi-provider adapters: OpenAI (already a dep), Anthropic, and a local option (Ollama) for offline/dev-cost reasons.
- **Structured outputs everywhere**: use JSON-schema-constrained tool calling for every agent call — never regex-parse free text out of a completion. This is what makes the typed contracts in §3 actually enforceable.
- Per-run cost/token accounting written to `episodic_runs`, surfaced on the dashboard.
- Automatic fallback: on rate-limit/5xx, retry with a secondary provider before failing the whole run.

---

## 7. Template Registry (generalize `templates/nextjs`)

```ts
type TemplateManifest = {
  key: string;                 // "nextjs-app-router"
  installCmd: string;          // "npm install"
  startCmd: string;            // "npm run dev"
  port: number;
  healthCheckPath: string;     // "/" or "/api/health"
  routeMap: string[];          // routes the Testing Agent should navigate
  criticalSelectors: string[]; // DOM elements that must exist (navbar, footer, etc.)
};
```
Store manifests in `templates/<name>/manifest.json`, load dynamically in the orchestrator's PROVISIONING/TESTING states. This decouples the Testing Agent from being Next.js-specific and lets you add Vite+React, SvelteKit, or an Express API template without touching agent code.

---

## 8. Testing Layer Upgrades (build on `selenium.md`, don't replace it)

- Keep Selenium as the "real browser, real user" ground truth described in the spec.
- Add **Playwright** as a complementary fast-path for network interception, tracing, and video capture (much less flaky for SPA hydration timing than raw Selenium waits).
- Add **axe-core** for automated accessibility checks as an additional failure category.
- Add **Lighthouse CI** for performance budgets (ties into the existing "Performance Validation" section of `selenium.md`).
- Add **visual regression** (screenshot diffing between repair iterations) so a repair that fixes the console error but breaks the layout is still caught.
- Feed every result into the exact `FailureReport` schema from §3.4 so nothing bypasses the classification pipeline.

---

## 9. Security Hardening Checklist

- [ ] All generated-code execution happens inside the sandbox from §4 — no exceptions.
- [ ] Reviewer Agent runs Semgrep + ESLint security rules and can `block` before PROVISIONING.
- [ ] Sanitize any text that flows from generated-app console/network logs back into an agent prompt (prevents prompt injection via a malicious dependency or user-controlled string rendered in the generated app).
- [ ] Secrets manager (e.g. Doppler/Vault or even scoped env files) — platform API keys never enter the sandbox.
- [ ] Rate-limit and auth-gate the dashboard's "generate project" endpoint (`app/`) — this is a compute-and-cost-bearing action.
- [ ] Signed, expiring URLs for screenshot/HTML-snapshot artifacts if stored in cloud storage.

---

## 10. Observability & Eval Harness

- **Tracing**: OpenTelemetry spans across orchestrator states and agent calls; one trace per run, viewable end-to-end.
- **Structured logs**: every state transition, every agent I/O pair (redacted of secrets), every sandbox event.
- **Dashboard metrics** (`app/`): success rate over time, average repair loops to green, cost per successful generation, top failure categories (bar chart straight from `failure_reports.category`), p50/p95 run duration.
- **Eval harness**: a fixed benchmark set of ~20–50 project requests with known-good acceptance criteria (e.g. "must have working login form," "must pass axe-core with 0 critical issues"). Run this suite on every change to `orchestrator/` or `agents/` in CI — this is what prevents prompt/logic changes from silently degrading agent quality. Track pass rate as a first-class metric over commits.

---

## 11. Suggested Repo Restructuring

```
collabro-ai/
├── app/                      # dashboard UI (Next.js)
├── components/
├── agents/
│   ├── planner/
│   │   ├── prompt.md         # narrative spec, selenium.md style
│   │   └── schema.ts         # zod schema, matches §3.1
│   ├── coder/
│   ├── reviewer/
│   ├── tester/
│   │   ├── selenium.md       # existing file, moved here
│   │   └── schema.ts
│   ├── repair/
│   └── deploy/
├── orchestrator/
│   ├── stateMachine.ts
│   ├── budgets.ts
│   └── events.ts              # SSE event emitter for dashboard
├── core/
│   └── sandbox/
│       ├── SandboxProvider.ts
│       └── DockerSandboxProvider.ts
├── memory/
│   ├── working/
│   ├── episodic/               # db access layer
│   └── semantic/                # vector store client + embedding utils
├── models/
│   ├── router.ts
│   └── providers/
├── templates/
│   ├── nextjs-app-router/
│   │   └── manifest.json
│   └── vite-react/
├── metadata/project/
├── eval/
│   ├── benchmarks/              # the fixed eval-harness request set
│   └── runEval.ts
├── settings/
├── types/
│   └── agents.ts                # all zod schemas from §3
├── utils/
└── selenium.md -> agents/tester/selenium.md (kept for compatibility, or symlinked)
```

---

## 12. Phased Delivery Plan

**Phase 0 — Foundations (1–2 weeks)**
- Typed contracts (`types/agents.ts`) for all agents (§3)
- Orchestrator state machine + budgets (§2)
- Real README, architecture diagram, `.env.example`, CI (lint/typecheck/unit tests)

**Phase 1 — Safety (1–2 weeks)**
- Sandbox provider (§4), containerized install/run/test
- Reviewer Agent + Semgrep/ESLint gate before execution
- Secrets isolation

**Phase 2 — Intelligence (2–3 weeks)**
- Episodic memory (Postgres schema, §5)
- Semantic memory + embedding pipeline for failure→fix retrieval
- Model router with structured outputs (§6)

**Phase 3 — Depth of Testing (1–2 weeks)**
- Playwright integration alongside Selenium
- axe-core + Lighthouse CI gates
- Visual regression diffing

**Phase 4 — Scale & Extensibility (2–3 weeks)**
- Template registry + a second template (Vite+React or Express API)
- Parallel task execution for independent Coder tasks
- Deployment Agent (Vercel/Docker target)

**Phase 5 — Rigor (ongoing)**
- Eval harness with benchmark suite, tracked in CI
- Full observability (OTel tracing + dashboard metrics)
- Cost/token accounting surfaced per run

---

## 13. What "extremely advanced" actually means here

Not: more agents, a flashier UI, or a bigger model.
Is: **bounded loops (§2)** + **typed, validated agent contracts (§3)** + **safe isolated execution (§4)** + **memory that compounds over runs instead of resetting every time (§5)** + **a way to measure whether changes make the system better or worse (§10)**. Those five things, done well, are what separate a demo from a platform.

---

## 14. Caveat on this analysis

This blueprint is built from the public root file listing, `package.json`, and the full text of `selenium.md` — GitHub's `/tree/*` pages blocked automated fetching (robots.txt), so the actual source inside `agents/`, `orchestrator/`, `core/`, and `memory/` was not read directly; folder purposes are inferred from naming and the one fully-specified agent. Before executing this plan, a direct clone-and-read pass over those four folders would confirm or correct the assumptions above.