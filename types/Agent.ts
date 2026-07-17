export type AgentRole =
  | 'manager'
  | 'prompt-analyzer'
  | 'requirements-validator'
  | 'architect'
  | 'content-planner'
  | 'scheduler'
  | 'frontend-dev'
  | 'backend-dev'
  | 'database-dev'
  | 'tester'
  | 'documenter'
  | 'deployer'
  | 'debugger';

export interface AgentMeta {
  role: AgentRole;
  name: string;
  description: string;
  icon: string; // emoji
}

export const AGENT_REGISTRY: Record<AgentRole, AgentMeta> = {
  'manager':                { role: 'manager',                name: 'Manager Agent',                description: 'Orchestrates the entire development lifecycle',   icon: '🎯' },
  'prompt-analyzer':        { role: 'prompt-analyzer',        name: 'Prompt Analysis Agent',        description: 'Understands user intent and extracts details',    icon: '🔍' },
  'requirements-validator': { role: 'requirements-validator', name: 'Requirements Validator',       description: 'Checks for missing requirements',                icon: '✅' },
  'architect':              { role: 'architect',              name: 'Architecture Design Agent',    description: 'Designs complete project architecture',           icon: '🏗️' },
  'content-planner':        { role: 'content-planner',        name: 'Content Maker Agent',          description: 'Creates file specifications and blueprints',      icon: '📋' },
  'scheduler':              { role: 'scheduler',              name: 'Scheduler Agent',              description: 'Converts specs into executable task queue',       icon: '📅' },
  'frontend-dev':           { role: 'frontend-dev',           name: 'Frontend Agent',               description: 'Implements frontend components and pages',        icon: '🎨' },
  'backend-dev':            { role: 'backend-dev',            name: 'Backend Agent',                description: 'Implements backend services and APIs',            icon: '⚙️' },
  'database-dev':           { role: 'database-dev',           name: 'Database Agent',               description: 'Creates schemas, models, and migrations',        icon: '🗄️' },
  'tester':                 { role: 'tester',                 name: 'Testing Agent',                description: 'Generates test suites and coverage reports',      icon: '🧪' },
  'documenter':             { role: 'documenter',             name: 'Documentation Agent',          description: 'Auto-generates project documentation',            icon: '📝' },
  'deployer':               { role: 'deployer',               name: 'Deployment Agent',             description: 'Creates Docker, CI/CD, and deploy configs',       icon: '🚀' },
  'debugger':               { role: 'debugger',               name: 'Debugger Agent',               description: 'Analyzes and repairs code errors',              icon: '🔧' },
};
