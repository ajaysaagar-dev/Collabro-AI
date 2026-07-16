// ─── Project Creation API ───────────────────────────────────────────────────
// POST /api/project - Creates a new project and starts the pipeline

import { createProject } from '@/memory/store';
import { runPipeline } from '@/orchestrator/ocollabro';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, model } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return Response.json(
        { error: 'A non-empty "prompt" field is required.' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    createProject(id, prompt.trim(), model || 'Llama');

    // Fire and forget — pipeline runs in the background
    runPipeline(id).catch((error) => {
      console.error(`[api/project] Pipeline failed for ${id}:`, error);
    });

    return Response.json({ projectId: id }, { status: 201 });
  } catch (error) {
    console.error('[api/project] Failed to create project:', error);
    return Response.json(
      { error: 'Failed to create project.' },
      { status: 500 }
    );
  }
}
