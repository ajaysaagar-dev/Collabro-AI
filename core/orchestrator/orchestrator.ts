// ─── Pipeline Orchestration Engine ──────────────────────────────────────────
// Runs the complete multi-agent pipeline from prompt to deployment

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  getProject,
  updateProject,
  updatePhase,
  pushEvent as storePushEvent,
} from '@/memory/store';

const execPromise = promisify(exec);
import { createEvent } from '../events/bus';
import {
  stripCodeFences,
  mergePackageJson,
  mergeTsConfig,
} from '@/utils/parser';
import {
  sanitizeEnvFile,
  parseErrorFiles,
  detectAndInstallMissingDependencies,
} from '@/utils/validator';
import {
  getDefaultNextJsFiles,
  getDefaultPackageJson,
  getDefaultTsConfig,
  getDefaultTailwindConfig,
  getDefaultPostcssConfig,
  getDefaultNextConfig,
  getDefaultJestConfig,
  getDefaultJestSetup,
} from '@/templates/nextjs/starters';

import { analyzePrompt } from '@/agents/planner/prompt-analyzer';
import { validateRequirements } from '@/agents/planner/requirements-validator';
import { designArchitecture } from '@/agents/architect/agent';
import { planContent } from '@/agents/planner/content-planner';
import { scheduleTasks } from '@/core/scheduler/scheduler';
import { generateFrontendFile } from '@/agents/frontend/agent';
import { generateBackendFile } from '@/agents/backend/agent';
import { generateDatabaseFile } from '@/agents/database/agent';
import { generateTests } from '@/agents/tester/agent';
import { generateDocumentation } from '@/agents/documentation/agent';
import { debugCodeFile } from '@/agents/debugger/agent';
import { modelContext } from '@/core/executor/executor';
import type {
  PipelinePhase,
  AgentRole,
  GeneratedFile,
  FileSpec,
  PromptAnalysis,
  ArchitectureDesign,
  TaskItem,
  PipelineEvent,
} from '@/types';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export function addOrUpdateGeneratedFile(files: GeneratedFile[], file: GeneratedFile) {
  const index = files.findIndex(f => f.path === file.path);
  if (index !== -1) {
    files[index] = file;
  } else {
    files.push(file);
  }
}

/**
 * Appends log messages to pipeline.log and overwrites events.json inside /logs/project/[id].
 */
async function saveProjectLog(projectId: string, event: PipelineEvent): Promise<void> {
  try {
    const logsDir = path.join(process.cwd(), 'logs', 'project', projectId);
    await fs.mkdir(logsDir, { recursive: true });

    // Append to pipeline.log
    const timestampStr = new Date(event.timestamp).toISOString();
    const logLine = `[${timestampStr}] [${event.phase}] [${event.agent}] ${event.message}\n`;
    await fs.appendFile(path.join(logsDir, 'pipeline.log'), logLine, 'utf-8');

    // Update events.json with full history
    const project = getProject(projectId);
    if (project) {
      await fs.writeFile(
        path.join(logsDir, 'events.json'),
        JSON.stringify(project.events, null, 2),
        'utf-8'
      );
    }
  } catch (error) {
    console.error(`[pipeline] Failed to save log for project ${projectId}:`, error);
  }
}

/**
 * Intercepts events to store them locally on disk.
 */
function pushEvent(projectId: string, event: PipelineEvent): void {
  storePushEvent(projectId, event);
  saveProjectLog(projectId, event).catch(console.error);
}

/**
 * Writes a generated file to the physical disk inside /workspace/project/[id].
 */
async function writeProjectFileToDisk(projectId: string, filePath: string, content: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), 'workspace', 'project', projectId, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  } catch (error) {
    console.error(`[pipeline] Failed to write file ${filePath} to disk:`, error);
  }
}

/**
 * Runs the complete pipeline for a project.
 * This is fire-and-forget — it updates the project store as it progresses
 * and pushes SSE events for real-time UI updates.
 */
export async function runPipeline(projectId: string): Promise<void> {
  const project = getProject(projectId);
  if (!project) {
    console.error(`[pipeline] Project not found: ${projectId}`);
    return;
  }

  const selectedModel = project.model || 'Llama';

  return modelContext.run(selectedModel, async () => {
    try {
      // Mark project as running
      updateProject(projectId, { status: 'running' });
      pushEvent(projectId, createEvent({
        type: 'log',
        phase: 'prompt-analysis',
        agent: 'manager',
        message: `Pipeline started. Beginning multi-agent project generation using ${selectedModel} model...`,
      }));

      // ── Phase 1: Prompt Analysis ──────────────────────────────────────────
      const analysis = await runPhase(projectId, 'prompt-analysis', 'prompt-analyzer', async () => {
        const result = await analyzePrompt(project.prompt);
        updateProject(projectId, { promptAnalysis: result });
        pushEvent(projectId, createEvent({
          type: 'agent-output',
          phase: 'prompt-analysis',
          agent: 'prompt-analyzer',
          message: `Identified project type: ${result.projectType}. Found ${result.features.length} features, ${result.userRoles.length} user roles.`,
          data: { summary: result.summary },
        }));
        return result;
      });

      // ── Phase 2: Requirements Validation ──────────────────────────────────
      const requirements = await runPhase(projectId, 'requirements-validation', 'requirements-validator', async () => {
        const result = await validateRequirements(analysis);
        updateProject(projectId, { requirementsValidation: result });
        pushEvent(projectId, createEvent({
          type: 'agent-output',
          phase: 'requirements-validation',
          agent: 'requirements-validator',
          message: `Validated requirements. ${result.confirmedRequirements.length} confirmed, ${result.missingRequirements.length} missing, ${result.riskAreas.length} risks identified.`,
          data: { isComplete: result.isComplete },
        }));
        return result;
      });

      // ── Phase 3: Architecture Design ──────────────────────────────────────
      const architecture = await runPhase(projectId, 'architecture-design', 'architect', async () => {
        const result = await designArchitecture(analysis, requirements);
        updateProject(projectId, { architectureDesign: result });
        pushEvent(projectId, createEvent({
          type: 'agent-output',
          phase: 'architecture-design',
          agent: 'architect',
          message: `Designed architecture with ${result.fileList.length} files, ${result.apiEndpoints.length} API endpoints.`,
          data: { totalFiles: result.fileList.length, totalEndpoints: result.apiEndpoints.length },
        }));
        return result;
      });

      // ── Phase 4: Content Planning ─────────────────────────────────────────
      const contentPlan = await runPhase(projectId, 'content-planning', 'content-planner', async () => {
        const result = await planContent(architecture, analysis);
        updateProject(projectId, { contentPlan: result });
        pushEvent(projectId, createEvent({
          type: 'agent-output',
          phase: 'content-planning',
          agent: 'content-planner',
          message: `Content plan created: ${result.totalFiles} files, ~${result.estimatedTotalTokens} estimated tokens.`,
        }));
        return result;
      });

      // ── Phase 5: Task Scheduling ──────────────────────────────────────────
      const scheduled = await runPhase(projectId, 'task-scheduling', 'scheduler', async () => {
        const result = await scheduleTasks(contentPlan);
        updateProject(projectId, { scheduledTasks: result });
        pushEvent(projectId, createEvent({
          type: 'agent-output',
          phase: 'task-scheduling',
          agent: 'scheduler',
          message: `Scheduled ${result.tasks.length} tasks in ${result.parallelGroups.length} parallel groups.`,
          data: { parallelGroups: result.parallelGroups.length },
        }));
        return result;
      });

      // ── Phase 6: Implementation ───────────────────────────────────────────
      await runPhase(projectId, 'implementation', 'manager', async () => {
        const generatedFiles: GeneratedFile[] = [];

        // Initialize with default Next.js structure
        const defaultFiles = getDefaultNextJsFiles(projectId);
        for (const defaultFile of defaultFiles) {
          addOrUpdateGeneratedFile(generatedFiles, defaultFile);
        }

        const totalTasks = scheduled.executionOrder.length;
        let completedTasks = 0;

        // Process each parallel group sequentially (tasks within a group run in parallel)
        for (const group of scheduled.parallelGroups) {
          const groupTasks = group
            .map(taskId => scheduled.tasks.find(t => t.id === taskId))
            .filter((t): t is TaskItem => t !== undefined);

          // Execute tasks in parallel within the group
          await Promise.allSettled(
            groupTasks.map(async (task) => {
              // Emit agent-start and task-assigned events
              pushEvent(projectId, createEvent({
                type: 'agent-start',
                phase: 'implementation',
                agent: task.fileSpec.assignedAgent,
                message: `Agent ${task.fileSpec.assignedAgent} starting work on ${task.fileSpec.path}...`,
              }));
              pushEvent(projectId, createEvent({
                type: 'task-assigned',
                phase: 'implementation',
                agent: task.fileSpec.assignedAgent,
                message: `Generating ${task.fileSpec.path}...`,
                data: { taskId: task.id, filePath: task.fileSpec.path },
              }));

              task.status = 'in-progress';
              task.startedAt = Date.now();

              try {
                let content = await generateFile(task.fileSpec, { analysis, architecture });
                content = stripCodeFences(content);

                // --- MERGE OR NORMALIZE CORRESPONDING CONFIGS ---
                if (task.fileSpec.path === 'package.json') {
                  content = mergePackageJson(getDefaultPackageJson(projectId), content);
                } else if (task.fileSpec.path === 'tsconfig.json') {
                  content = mergeTsConfig(getDefaultTsConfig(), content);
                } else if (task.fileSpec.path === 'tailwind.config.js') {
                  content = content.trim().length > 10 ? content : getDefaultTailwindConfig();
                } else if (task.fileSpec.path === 'postcss.config.js') {
                  content = content.trim().length > 10 ? content : getDefaultPostcssConfig();
                } else if (task.fileSpec.path === 'next.config.js') {
                  content = content.trim().length > 10 ? content : getDefaultNextConfig();
                } else if (task.fileSpec.path === 'jest.config.js') {
                  content = content.trim().length > 10 ? content : getDefaultJestConfig();
                } else if (task.fileSpec.path === 'jest.setup.js') {
                  content = content.trim().length > 10 ? content : getDefaultJestSetup();
                } else if (task.fileSpec.path === '.env' || task.fileSpec.path.endsWith('.env')) {
                  content = sanitizeEnvFile(content);
                }

                task.status = 'completed';
                task.completedAt = Date.now();
                task.output = content;

                const file: GeneratedFile = {
                  path: task.fileSpec.path,
                  content,
                  agent: task.fileSpec.assignedAgent,
                  generatedAt: Date.now(),
                };

                addOrUpdateGeneratedFile(generatedFiles, file);

                pushEvent(projectId, createEvent({
                  type: 'agent-complete',
                  phase: 'implementation',
                  agent: task.fileSpec.assignedAgent,
                  message: `Agent ${task.fileSpec.assignedAgent} completed ${task.fileSpec.path}`,
                }));

                pushEvent(projectId, createEvent({
                  type: 'file-generated',
                  phase: 'implementation',
                  agent: task.fileSpec.assignedAgent,
                  message: `Generated ${task.fileSpec.path}`,
                  data: { filePath: task.fileSpec.path, size: content.length },
                }));

                pushEvent(projectId, createEvent({
                  type: 'task-complete',
                  phase: 'implementation',
                  agent: task.fileSpec.assignedAgent,
                  message: `Completed task: ${task.fileSpec.path}`,
                  data: { taskId: task.id },
                }));

                return file;
              } catch (error) {
                task.status = 'failed';
                task.completedAt = Date.now();

                pushEvent(projectId, createEvent({
                  type: 'agent-error',
                  phase: 'implementation',
                  agent: task.fileSpec.assignedAgent,
                  message: `Failed to generate ${task.fileSpec.path}: ${error}`,
                  data: { taskId: task.id, error: String(error) },
                }));

                // Return a placeholder file so the pipeline continues
                const placeholder: GeneratedFile = {
                  path: task.fileSpec.path,
                  content: `// TODO: Generation failed - ${error}\n// This file needs to be manually implemented.\n`,
                  agent: task.fileSpec.assignedAgent,
                  generatedAt: Date.now(),
                };
                addOrUpdateGeneratedFile(generatedFiles, placeholder);
                return placeholder;
              }
            })
          );

          completedTasks += groupTasks.length;
          const progress = Math.round((completedTasks / totalTasks) * 100);

          // Update project with files generated so far
          updateProject(projectId, { generatedFiles: [...generatedFiles] });
          updatePhase(projectId, 'implementation', { progress });

          pushEvent(projectId, createEvent({
            type: 'progress-update',
            phase: 'implementation',
            agent: 'manager',
            message: `Implementation progress: ${completedTasks}/${totalTasks} files (${progress}%)`,
            data: { completedTasks, totalTasks, progress },
          }));
        }

        // Final update with all generated files
        updateProject(projectId, { generatedFiles });
        return generatedFiles;
      });

      // Get the updated project state for remaining phases
      const updatedProject = getProject(projectId)!;

      // ── Phase 7: Testing ──────────────────────────────────────────────────
      await runPhase(projectId, 'testing', 'tester', async () => {
        const testContent = await generateTests(updatedProject.generatedFiles, analysis);
        const testFile: GeneratedFile = {
          path: '__tests__/app.test.tsx',
          content: testContent,
          agent: 'tester',
          generatedAt: Date.now(),
        };
        addOrUpdateGeneratedFile(updatedProject.generatedFiles, testFile);
        updateProject(projectId, {
          generatedFiles: [...updatedProject.generatedFiles],
        });
        pushEvent(projectId, createEvent({
          type: 'file-generated',
          phase: 'testing',
          agent: 'tester',
          message: 'Generated test suite: __tests__/app.test.tsx',
          data: { filePath: '__tests__/app.test.tsx' },
        }));

        // --- SELF-CORRECTION LOOP (BUILD, LINT, TEST) ---
        const projectDir = path.join(process.cwd(), 'workspace', 'project', projectId);
        
        // Write all files generated so far to the physical disk first
        pushEvent(projectId, createEvent({
          type: 'log',
          phase: 'testing',
          agent: 'manager',
          message: 'Writing generated project files to disk to prepare for self-correction check...',
        }));
        for (const file of updatedProject.generatedFiles) {
          await writeProjectFileToDisk(projectId, file.path, file.content);
        }

        // Install dependencies
        pushEvent(projectId, createEvent({
          type: 'log',
          phase: 'testing',
          agent: 'manager',
          message: 'Running npm install to verify and configure dependencies...',
        }));
        try {
          await execPromise('npm install', { cwd: projectDir });
        } catch (err) {
          const installErr = err as Error;
          pushEvent(projectId, createEvent({
            type: 'log',
            phase: 'testing',
            agent: 'manager',
            message: `Warning: npm install returned errors: ${installErr.message}`,
          }));
        }

        let attempts = 0;
        const maxAttempts = 5;
        let hasErrors = true;

        while (hasErrors && attempts < maxAttempts) {
          attempts++;
          hasErrors = false;

          pushEvent(projectId, createEvent({
            type: 'log',
            phase: 'testing',
            agent: 'tester',
            message: `Verifying project stability (Build/Lint/Test) - Attempt ${attempts}/${maxAttempts}...`,
          }));

          // Run typescript compilation check
          let buildSuccess = true;
          let buildOutput = '';
          try {
            await fs.access(path.join(projectDir, 'tsconfig.json'));
            const { stdout, stderr } = await execPromise('npx tsc --noEmit', { cwd: projectDir });
            buildOutput = stdout + '\n' + stderr;
          } catch (err) {
            buildSuccess = false;
            const execErr = err as { stdout?: string; stderr?: string; message?: string };
            buildOutput = (execErr.stdout || '') + '\n' + (execErr.stderr || '') + '\n' + (execErr.message || '');
          }

          // Run lint check
          let lintSuccess = true;
          let lintOutput = '';
          try {
            const pkgJson = JSON.parse(await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8'));
            if (pkgJson.scripts && pkgJson.scripts.lint) {
              const { stdout, stderr } = await execPromise('npm run lint', { cwd: projectDir });
              lintOutput = stdout + '\n' + stderr;
            }
          } catch (err) {
            lintSuccess = false;
            const execErr = err as { stdout?: string; stderr?: string; message?: string };
            lintOutput = (execErr.stdout || '') + '\n' + (execErr.stderr || '') + '\n' + (execErr.message || '');
          }

          // Run unit/integration tests
          let testSuccess = true;
          let testOutput = '';
          try {
            const pkgJson = JSON.parse(await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8'));
            if (pkgJson.scripts && pkgJson.scripts.test) {
              const { stdout, stderr } = await execPromise('npm run test', { cwd: projectDir });
              testOutput = stdout + '\n' + stderr;
            }
          } catch (err) {
            testSuccess = false;
            const execErr = err as { stdout?: string; stderr?: string; message?: string };
            testOutput = (execErr.stdout || '') + '\n' + (execErr.stderr || '') + '\n' + (execErr.message || '');
          }

          const combinedLogs = `[TypeScript Check]\n${buildOutput}\n\n[Lint Check]\n${lintOutput}\n\n[Test Check]\n${testOutput}`;

          // Check if there are any missing dependencies in the logs
          const installedMissing = await detectAndInstallMissingDependencies(
            projectDir,
            combinedLogs,
            (msg) => {
              pushEvent(projectId, createEvent({
                type: 'log',
                phase: 'testing',
                agent: 'tester',
                message: msg,
              }));
            }
          );

          if (installedMissing) {
            hasErrors = true;
            // Re-run checking after installing missing packages
            continue;
          }

          if (!buildSuccess || !lintSuccess || !testSuccess) {
            const errorFiles = parseErrorFiles(combinedLogs, '');
            if (errorFiles.length === 0) {
              // Fallback: If we couldn't parse the files but there's a build error, include page/layout
              if (buildOutput.toLowerCase().includes('error')) {
                errorFiles.push('src/app/page.tsx');
              }
            }

            if (errorFiles.length > 0) {
              hasErrors = true;
              pushEvent(projectId, createEvent({
                type: 'log',
                phase: 'testing',
                agent: 'tester',
                message: `Stability check failed. Found errors in: ${errorFiles.join(', ')}. Initializing self-correction loop...`,
              }));

              // Use debugger agent to fix each problematic file
              for (const filePath of errorFiles) {
                const fullFilePath = path.join(projectDir, filePath);
                try {
                  await fs.access(fullFilePath);
                  const originalContent = await fs.readFile(fullFilePath, 'utf-8');

                  pushEvent(projectId, createEvent({
                    type: 'log',
                    phase: 'testing',
                    agent: 'tester',
                    message: `Debugger Agent: Attempting to fix ${filePath}...`,
                  }));

                  const correctedContent = await debugCodeFile({
                    path: filePath,
                    content: originalContent,
                    errorLog: combinedLogs,
                    analysis,
                    architecture
                  });

                  // Save the fixed content
                  await fs.writeFile(fullFilePath, correctedContent, 'utf-8');

                  const state = getProject(projectId)!;
                  addOrUpdateGeneratedFile(state.generatedFiles, {
                    path: filePath,
                    content: correctedContent,
                    agent: 'tester',
                    generatedAt: Date.now()
                  });
                  updateProject(projectId, { generatedFiles: [...state.generatedFiles] });
                } catch (e) {
                  console.error(`[self-correction] Failed to fix file ${filePath}:`, e);
                }
              }
            }
          } else {
            pushEvent(projectId, createEvent({
              type: 'log',
              phase: 'testing',
              agent: 'tester',
              message: `All build compilation, linting checks, and test suites passed successfully! Project is completely stable.`,
            }));
          }
        }

        return testFile;
      });

      // ── Phase 8: Documentation ────────────────────────────────────────────
      const latestProject = getProject(projectId)!;
      await runPhase(projectId, 'documentation', 'documenter', async () => {
        const readmeContent = await generateDocumentation({
          analysis,
          architecture,
          files: latestProject.generatedFiles,
        });
        const readmeFile: GeneratedFile = {
          path: 'README.md',
          content: readmeContent,
          agent: 'documenter',
          generatedAt: Date.now(),
        };
        addOrUpdateGeneratedFile(latestProject.generatedFiles, readmeFile);
        updateProject(projectId, {
          generatedFiles: [...latestProject.generatedFiles],
        });
        pushEvent(projectId, createEvent({
          type: 'file-generated',
          phase: 'documentation',
          agent: 'documenter',
          message: 'Generated README.md documentation',
          data: { filePath: 'README.md' },
        }));
        return readmeFile;
      });

      // ── Phase 9: Deployment (Temporarily Disabled) ────────────────────────
      await runPhase(projectId, 'deployment', 'deployer', async () => {
        pushEvent(projectId, createEvent({
          type: 'log',
          phase: 'deployment',
          agent: 'deployer',
          message: 'Deployment agent is temporarily disabled. Skipping configuration generation.',
        }));
        return {};
      });

      // ── Pipeline Complete ─────────────────────────────────────────────────
      const finalState = getProject(projectId);
      if (finalState) {
        // Generate RUN_INSTRUCTIONS.md dynamically based on the project structure
        const isNode = finalState.generatedFiles.some(f => f.path.includes('package.json'));
        
        let instructions = `# Running the Generated Project\n\n`;
        instructions += `This project was autonomously generated by **COLLABRO-AI**.\n\n`;
        instructions += `## Prerequisites\n\n`;
        if (isNode) {
          instructions += `- **Node.js**: Ensure you have Node.js installed (v18+ recommended).\n`;
          instructions += `- **npm**: npm is used for package management.\n\n`;
        } else {
          instructions += `- Ensure you have the appropriate environment runtime installed.\n\n`;
        }

        instructions += `## Getting Started\n\n`;
        instructions += `1. **Install Dependencies**:\n`;
        instructions += `   \`\`\`bash\n`;
        instructions += `   npm install\n`;
        instructions += `   \`\`\`\n`;
        instructions += `2. **Run in Development Mode**:\n`;
        instructions += `   \`\`\`bash\n`;
        instructions += `   npm run dev\n`;
        instructions += `   \`\`\`\n`;
        instructions += `3. **Build & Production Launch**:\n`;
        instructions += `   \`\`\`bash\n`;
        instructions += `   npm run build\n`;
        instructions += `   npm start\n`;
        instructions += `   \`\`\`\n`;

        const instructionsFile: GeneratedFile = {
          path: 'RUN_INSTRUCTIONS.md',
          content: instructions,
          agent: 'manager',
          generatedAt: Date.now(),
        };

        // Add instructions file to final state
        addOrUpdateGeneratedFile(finalState.generatedFiles, instructionsFile);
        updateProject(projectId, {
          generatedFiles: [...finalState.generatedFiles],
        });
      }

      updateProject(projectId, { status: 'completed', currentPhase: 'completed' });
      
      // Write the complete project files to output folder
      const updatedState = getProject(projectId);
      if (updatedState) {
        for (const file of updatedState.generatedFiles) {
          await writeProjectFileToDisk(projectId, file.path, file.content);
        }
      }

      pushEvent(projectId, createEvent({
        type: 'phase-complete',
        phase: 'completed',
        agent: 'manager',
        message: `Pipeline completed! Generated ${getProject(projectId)!.generatedFiles.length} files.`,
      }));

      // Install dependencies if package.json exists
      const packageJsonPath = path.join(process.cwd(), 'workspace', 'project', projectId, 'package.json');
      try {
        await fs.access(packageJsonPath);
        pushEvent(projectId, createEvent({
          type: 'log',
          phase: 'completed',
          agent: 'manager',
          message: 'Found package.json. Installing project dependencies (npm install)...',
        }));

        const projectDir = path.join(process.cwd(), 'workspace', 'project', projectId);
        await execPromise('npm install', { cwd: projectDir });

        pushEvent(projectId, createEvent({
          type: 'log',
          phase: 'completed',
          agent: 'manager',
          message: 'Dependencies successfully installed!',
        }));
      } catch (err) {
        if ((err as { code?: string }).code !== 'ENOENT') {
          console.error(`[pipeline] Failed to install dependencies:`, err);
          pushEvent(projectId, createEvent({
            type: 'log',
            phase: 'completed',
            agent: 'manager',
            message: `Warning: Dependency installation failed: ${(err as Error).message}`,
          }));
        }
      }

    } catch (error) {
      console.error(`[pipeline] Fatal error for project ${projectId}:`, error);
      updateProject(projectId, {
        status: 'failed',
        error: String(error),
      });
      pushEvent(projectId, createEvent({
        type: 'phase-error',
        phase: getProject(projectId)?.currentPhase || 'prompt-analysis',
        agent: 'manager',
        message: `Pipeline failed: ${error}`,
        data: { error: String(error) },
      }));
    }
  });
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Runs a single pipeline phase with event emission, progress tracking, and retry logic.
 */
async function runPhase<T>(
  projectId: string,
  phase: PipelinePhase,
  agent: AgentRole,
  execute: () => Promise<T>
): Promise<T> {
  // Update current phase
  updateProject(projectId, { currentPhase: phase });
  updatePhase(projectId, phase, {
    status: 'running',
    progress: 0,
    startedAt: Date.now(),
  });

  pushEvent(projectId, createEvent({
    type: 'phase-start',
    phase,
    agent,
    message: `Starting phase: ${formatPhaseName(phase)}...`,
  }));

  pushEvent(projectId, createEvent({
    type: 'agent-start',
    phase,
    agent,
    message: `Agent ${agent} starting work on phase: ${formatPhaseName(phase)}...`,
  }));

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        pushEvent(projectId, createEvent({
          type: 'log',
          phase,
          agent,
          message: `Retrying phase ${formatPhaseName(phase)} (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`,
        }));
        await delay(RETRY_DELAY_MS * attempt);
      }

      const result = await execute();

      updatePhase(projectId, phase, {
        status: 'completed',
        progress: 100,
        completedAt: Date.now(),
      });

      pushEvent(projectId, createEvent({
        type: 'phase-complete',
        phase,
        agent,
        message: `Phase completed: ${formatPhaseName(phase)}`,
      }));

      pushEvent(projectId, createEvent({
        type: 'agent-complete',
        phase,
        agent,
        message: `Agent ${agent} finished work on phase: ${formatPhaseName(phase)}`,
      }));

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[pipeline] Phase ${phase} attempt ${attempt + 1} failed:`, error);
    }
  }

  // All retries exhausted
  updatePhase(projectId, phase, {
    status: 'failed',
    completedAt: Date.now(),
  });

  pushEvent(projectId, createEvent({
    type: 'phase-error',
    phase,
    agent,
    message: `Phase failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
    data: { error: lastError?.message },
  }));

  pushEvent(projectId, createEvent({
    type: 'agent-error',
    phase,
    agent,
    message: `Agent ${agent} encountered error: ${lastError?.message}`,
  }));

  throw lastError;
}

/**
 * Routes a file spec to the appropriate agent for code generation.
 */
async function generateFile(
  spec: FileSpec,
  context: { analysis: PromptAnalysis; architecture: ArchitectureDesign }
): Promise<string> {
  switch (spec.assignedAgent) {
    case 'frontend-dev':
      return generateFrontendFile(spec, context);
    case 'backend-dev':
      return generateBackendFile(spec, context);
    case 'database-dev':
      return generateDatabaseFile(spec, context);
    default:
      // Default to backend-dev for unrecognized agents
      return generateBackendFile(spec, context);
  }
}

function formatPhaseName(phase: PipelinePhase): string {
  return phase
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
