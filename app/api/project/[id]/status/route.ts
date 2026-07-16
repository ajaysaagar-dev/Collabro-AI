// ─── Project Status API ─────────────────────────────────────────────────────
// GET /api/project/[id]/status - Returns current project state (lightweight)

import { getProject } from '@/memory/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  // Return project state without the events array to keep the response small
  const projectState = { ...project };
  delete (projectState as Partial<typeof project>).events;

  return Response.json({
    ...projectState,
    eventCount: project.events.length,
    fileCount: project.generatedFiles.length,
  });
}

export const dynamic = 'force-dynamic';
