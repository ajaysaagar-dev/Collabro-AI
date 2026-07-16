// ─── SSE Stream API ─────────────────────────────────────────────────────────
// GET /api/project/[id]/stream - Real-time event stream via Server-Sent Events

import { getProject, addEventListener } from '@/memory/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller may be closed — ignore
        }
      };

      // 1. Replay all existing events for reconnection support
      for (const event of project.events) {
        send(event);
      }

      // 2. Send current project state (without heavy events array)
      const projectState = { ...project };
      delete (projectState as Partial<typeof project>).events;
      send({ type: 'state-sync', project: projectState });

      // 3. Subscribe to new events
      const unsubscribe = addEventListener(id, (event) => {
        try {
          send(event);
        } catch {
          unsubscribe();
        }
      });

      // 4. Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';
