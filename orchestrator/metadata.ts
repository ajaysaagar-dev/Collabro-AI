import fs from 'fs/promises';
import path from 'path';

const METADATA_ROOT = path.join(process.cwd(), 'metadata');

export async function getMetadataDir(projectId: string): Promise<string> {
  const dir = path.join(METADATA_ROOT, 'project', projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeAgentMetadata(
  projectId: string,
  agentName: string,
  data: unknown
): Promise<void> {
  const dir = await getMetadataDir(projectId);
  const simplified = simplifyForAI(data);
  await fs.writeFile(
    path.join(dir, `${agentName.toLowerCase()}.json`),
    JSON.stringify(simplified, null, 2),
    'utf-8'
  );
}

export async function readAgentMetadata<T = unknown>(
  projectId: string,
  agentName: string
): Promise<T | null> {
  try {
    const dir = await getMetadataDir(projectId);
    const content = await fs.readFile(
      path.join(dir, `${agentName.toLowerCase()}.json`),
      'utf-8'
    );
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeValidationReport(
  projectId: string,
  report: unknown
): Promise<void> {
  const dir = await getMetadataDir(projectId);
  await fs.writeFile(
    path.join(dir, 'validation.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
}

export async function appendCycleEntry(
  projectId: string,
  entry: unknown
): Promise<void> {
  const dir = await getMetadataDir(projectId);
  const cyclesPath = path.join(dir, 'cycles.json');
  let cycles: unknown[] = [];
  try {
    const existing = await fs.readFile(cyclesPath, 'utf-8');
    cycles = JSON.parse(existing);
  } catch {
    // File doesn't exist yet
  }
  cycles.push(entry);
  await fs.writeFile(cyclesPath, JSON.stringify(cycles, null, 2), 'utf-8');
}

export async function writeTimeline(
  projectId: string,
  timeline: Record<string, { start: number; end?: number; duration?: number }>
): Promise<void> {
  const dir = await getMetadataDir(projectId);
  await fs.writeFile(
    path.join(dir, 'timeline.json'),
    JSON.stringify(timeline, null, 2),
    'utf-8'
  );
}

/**
 * Simplifies data for AI consumption — strips large content fields,
 * keeps structure and key identifiers.
 */
function simplifyForAI(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => simplifyForAI(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Strip large content fields to keep metadata small and AI-friendly
    if (key === 'content' && typeof value === 'string') {
      if (value.length > 200) {
        result[key] = value.substring(0, 150) + '... [truncated for AI, original length: ' + value.length + ']';
      } else {
        result[key] = value;
      }
    } else if (key === 'output' && typeof value === 'string') {
      if (value.length > 200) {
        result[key] = value.substring(0, 150) + '... [truncated for AI]';
      } else {
        result[key] = value;
      }
    } else if (key === 'events' && Array.isArray(value)) {
      result[key] = `[${value.length} events logged]`;
    } else if (typeof value === 'object') {
      result[key] = simplifyForAI(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
