import fs from 'fs/promises';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'settings', 'agents.md');

export interface AgentSettings {
  [agentKey: string]: boolean;
}

/**
 * Reads settings/agents.md and returns a map of agent name → enabled boolean.
 * If the file doesn't exist, returns all agents enabled by default.
 */
export async function loadAgentSettings(): Promise<AgentSettings> {
  try {
    const content = await fs.readFile(SETTINGS_PATH, 'utf-8');
    const settings: AgentSettings = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Match lines like "- agent_name: true" or "- agent_name: false"
      const match = trimmed.match(/^-\s+([\w-]+):\s*(true|false)$/i);
      if (match) {
        settings[match[1].toLowerCase()] = match[2].toLowerCase() === 'true';
      }
    }

    return settings;
  } catch {
    console.warn('[OCollabro] settings/agents.md not found or unreadable. All agents enabled by default.');
    return {};
  }
}

/**
 * Checks if a specific agent is enabled.
 * If the agent is not listed in settings, it defaults to true (enabled).
 */
export function isAgentEnabled(settings: AgentSettings, agentKey: string): boolean {
  const key = agentKey.toLowerCase();
  // Map some of the runtime roles to the settings keys
  let mappedKey = key;
  if (key === 'frontend-dev') mappedKey = 'frontend';
  if (key === 'backend-dev') mappedKey = 'backend';
  if (key === 'database-dev') mappedKey = 'database';
  if (key === 'prompt-analyzer' || key === 'requirements-validator' || key === 'content-planner') {
    mappedKey = 'planner';
  }
  if (key === 'documenter') mappedKey = 'documentation';
  
  return settings[mappedKey] !== false; // Default: enabled
}
