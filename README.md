# Collabro-AI

An **extremely advanced autonomous software engineering platform** — a closed-loop **generate → run → observe → repair** system.

## Architecture

```
               ┌─────────────────────────────┐
               │        Next.js Dashboard      │
               │   (app/, components/)         │
               │  live pipeline view via SSE    │
               └──────────────┬────────────────┘
                              │
               ┌──────────────▼────────────────┐
               │         ORCHESTRATOR           │
               │   (state machine + budgets)     │
               └───┬─────┬─────┬─────┬─────┬────┘
                   │     │     │     │     │
       ┌───────────▼┐ ┌─▼───┐ ┌▼────┐ ┌▼────┐ ┌▼──────┐
       │  Planner   │ │Coder│ │Rev.  │ │Test │ │Repair │
       │  Agent     │ │Agent│ │Agent │ │Agent │ │Agent  │
       └───────────┘ └─────┘ └──────┘ └──────┘ └───────┘
                              │
               ┌──────────────▼────────────────┐
               │            MODEL ROUTER        │
               │  OpenAI / Anthropic / Ollama   │
               │  per-agent complexity routing  │
               └──────────────┬────────────────┘
                              │
               ┌──────────────▼────────────────┐
               │          MEMORY LAYER          │
               │  Working (in-process/Redis)     │
               │  Episodic (Postgres)            │
               │  Semantic (pgvector/Qdrant)     │
               └──────────────┬────────────────┘
                              │
               ┌──────────────▼────────────────┐
               │     EXECUTION SANDBOX          │
               │  Docker · Selenium+Playwright  │
               └───────────────────────────────┘
```

## Key Principles

1. **Bounded loops** — typed state machine (`orchestrator/stateMachine.ts`) with configurable hard limits via `orchestrator/budgets.ts`
2. **Typed, validated agent contracts** — all 6 agents use Zod schemas (`types/agents.ts`)
3. **Safe isolated execution** — `core/sandbox/` with Docker-based per-run isolation
4. **Self-improving memory** — semantic memory compounds over runs (error→fix embeddings)
5. **Measurable quality** — eval harness (`eval/`) tracks pass rate in CI

## Getting Started

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your OPENAI_API_KEY

# Run the dashboard
npm run dev

# Type-check
npm run typecheck

# Run eval harness
npm run eval:smoke
```

## Project Structure

```
collabro-ai/
├── app/                      # Next.js dashboard UI
├── agents/
│   ├── planner/              # Planner Agent + Zod schema
│   ├── coder/                # Coder Agent + schema
│   ├── reviewer/             # Reviewer Agent (security gate) + schema
│   ├── tester/               # Testing Agent (Selenium/Playwright) + schema
│   ├── repair/               # Repair Agent + schema
│   └── deploy/               # Deployment Agent + schema
├── orchestrator/
│   ├── stateMachine.ts       # Typed state machine (IDLE→SUCCEEDED|FAILED)
│   ├── budgets.ts            # Guard config (MAX_REPAIR_LOOPS, etc.)
│   ├── events.ts             # SSE event emitter for dashboard
│   ├── ocollabro.ts          # Main orchestration engine
│   └── validation.ts         # 30-stage validation pipeline
├── core/
│   ├── sandbox/              # SandboxProvider interface + Docker/Mock impls
│   └── repair/               # Low-level self-healing (12 files)
├── memory/
│   ├── working/              # In-process/Redis working memory
│   ├── episodic/             # Postgres schema + data access layer
│   └── semantic/             # pgvector embedding + similarity search
├── models/
│   ├── router.ts             # Per-agent complexity-based model routing
│   └── providers/            # OpenAI, Anthropic, Ollama adapters
├── templates/
│   ├── nextjs-app-router/    # manifest.json
│   └── vite-react/           # manifest.json
├── types/
│   └── agents.ts             # All 6 agent Zod schemas
├── eval/
│   ├── benchmarks/           # Fixed benchmark request set
│   └── runEval.ts            # Eval runner (CI pass-rate tracking)
└── .env.example
```

## Orchestrator State Machine

```
IDLE → PLANNING → GENERATING → STATIC_REVIEW → PROVISIONING → STARTING
                                     ↓                              ↓
                                FAILED_FATAL                    TESTING
                                                                    ↓
                                                             CLASSIFYING → REPAIRING → RETESTING
                                                                                          ↓
                                                                                    (loop until budget)
                                                                                          ↓
                                                                               SUCCEEDED | FAILED_BUDGET
```

Guards: `MAX_REPAIR_LOOPS=5`, `MAX_WALL_CLOCK_MINUTES=15`, `MAX_SANDBOX_RESTARTS=2`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dashboard |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run eval:smoke` | Run smoke eval suite |
| `npm run eval:all` | Run full eval suite |
