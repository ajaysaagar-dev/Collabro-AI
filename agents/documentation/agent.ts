// ─── Documenter Agent ───────────────────────────────────────────────────────
// Generates README.md and project documentation

import { callAgent } from '@/core/executor/executor';
import { PromptAnalysis, ArchitectureDesign, GeneratedFile } from '@/types';
import { stripCodeFences } from '@/utils/parser';

const SYSTEM_PROMPT = `You are a technical documentation specialist. Your job is to generate a comprehensive, professional README.md for a software project.

IMPORTANT RULES:
- Write ONLY the raw markdown content - no code fences wrapping the entire output
- Start directly with the project title heading
- Use proper GitHub-flavored markdown formatting
- Be thorough but concise - developers should find everything they need
- Include real commands and examples based on the actual project architecture
- Reference actual file paths from the project structure

README SECTIONS (include all):
1. Project Title & Description (with badges if applicable)
2. Features (bullet list of key features)
3. Tech Stack (table or list of technologies used)
4. Prerequisites (Node.js version, required tools)
5. Getting Started
   - Clone the repo
   - Install dependencies
   - Environment setup (.env.example)
   - Database setup (if applicable)
   - Run development server
6. Project Structure (folder tree)
7. API Documentation (if applicable - table of endpoints)
8. Environment Variables (table with name, description, required/optional)
9. Database Schema (brief overview if applicable)
10. Deployment (Docker, Vercel, or other deployment options)
11. Testing (how to run tests)
12. Contributing (basic guidelines)
13. License`;

/**
 * Generates comprehensive README.md documentation for the project.
 */
export async function generateDocumentation(project: {
  analysis: PromptAnalysis;
  architecture: ArchitectureDesign;
  files: GeneratedFile[];
}): Promise<string> {
  const { analysis, architecture, files } = project;

  const userMessage = `Generate a comprehensive README.md for this project:

Project Summary: ${analysis.summary}
Project Type: ${analysis.projectType}

Tech Stack:
- Frontend: ${analysis.frontend}
- Backend: ${analysis.backend}
- Database: ${analysis.database}
- Authentication: ${analysis.authentication}

Features:
${analysis.features.map(f => `- ${f}`).join('\n')}

User Roles: ${analysis.userRoles.join(', ')}
Additional Services: ${analysis.additionalServices.join(', ')}

Folder Structure:
${architecture.folderStructure}

API Endpoints:
${architecture.apiEndpoints.map(e => `${e.method} ${e.path} - ${e.description}`).join('\n')}

Environment Variables:
${architecture.envVariables.join('\n')}

Dependencies:
${Object.entries(architecture.dependencies).map(([k, v]) => `${k}: ${v}`).join('\n')}

Build Configuration:
${architecture.buildConfig}

Generated Files (${files.length} total):
${files.map(f => `- ${f.path}`).join('\n')}

Write the complete README.md now. Output ONLY the markdown content.`;

  const result = await callAgent(
    'documenter',
    SYSTEM_PROMPT,
    userMessage,
    'Llama',
    6144
  );

  return stripCodeFences(result);
}
