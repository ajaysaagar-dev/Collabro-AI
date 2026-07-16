// ─── Pipeline Event Bus ─────────────────────────────────────────────────────

import { PipelineEvent } from '@/types';

/**
 * Generates a unique event ID.
 */
export function createEventId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a fully-formed PipelineEvent with auto-generated id and timestamp.
 */
export function createEvent(
  overrides: Partial<PipelineEvent> &
    Pick<PipelineEvent, 'type' | 'phase' | 'agent' | 'message'>
): PipelineEvent {
  return {
    id: createEventId(),
    timestamp: Date.now(),
    ...overrides,
  };
}
