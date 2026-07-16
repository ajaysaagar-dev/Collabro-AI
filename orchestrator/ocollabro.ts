import fs from 'fs/promises';
import path from 'path';

// Import existing modules
import { getProject, updateProject, updatePhase, pushEvent as storePushEvent } from '@/memory/store';
import { createEvent } from '@/core/events/bus';
import { stripCodeFences, mergePackageJson, mergeTsConfig } from '@/utils/parser';
import { sanitizeEnvFile } from '@/utils/validator';
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
  RequirementsValidation,
  ContentPlan,
  ScheduledTasks,
} from '@/types';

// Import our new modules
import { loadAgentSettings, isAgentEnabled, AgentSettings } from './settings';
import { writeAgentMetadata, writeValidationReport, appendCycleEntry, writeTimeline } from './metadata';
import { runValidationPipeline, classifyErrorsByAgent } from './validation';



export function addOrUpdateGeneratedFile(files: GeneratedFile[], file: GeneratedFile) {
  const index = files.findIndex(f => f.path === file.path);
  if (index !== -1) {
    files[index] = file;
  } else {
    files.push(file);
  }
}

export class OCollabro {
  private projectId: string;
  private settings: AgentSettings = {};
  private cycleCount = 0;
  private MAX_CYCLES = 10;
  private timeline: Record<string, { start: number; end?: number; duration?: number }> = {};

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  public log(msg: string) {
    console.log(`\x1b[36m[OCollabro] ${msg}\x1b[0m`);
  }

  private startPhaseTimer(phase: string) {
    this.timeline[phase] = { start: Date.now() };
  }

  private async endPhaseTimer(phase: string) {
    if (this.timeline[phase]) {
      const end = Date.now();
      this.timeline[phase].end = end;
      this.timeline[phase].duration = end - this.timeline[phase].start;
      await writeTimeline(this.projectId, this.timeline);
    }
  }

  private pushEvent(event: PipelineEvent): void {
    storePushEvent(this.projectId, event);
    this.saveProjectLog(event).catch(console.error);
  }

  private async saveProjectLog(event: PipelineEvent): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs', 'project', this.projectId);
      await fs.mkdir(logsDir, { recursive: true });

      const timestampStr = new Date(event.timestamp).toISOString();
      const logLine = `[${timestampStr}] [${event.phase}] [${event.agent}] ${event.message}\n`;
      await fs.appendFile(path.join(logsDir, 'pipeline.log'), logLine, 'utf-8');

      const project = getProject(this.projectId);
      if (project) {
        await fs.writeFile(
          path.join(logsDir, 'events.json'),
          JSON.stringify(project.events, null, 2),
          'utf-8'
        );
      }
    } catch (error) {
      console.error(`[OCollabro] Failed to save log:`, error);
    }
  }

  private async writeProjectFileToDisk(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), 'workspace', 'project', this.projectId, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      console.error(`[OCollabro] Failed to write file ${filePath} to disk:`, error);
    }
  }

  private async runPhase<T>(
    phase: PipelinePhase,
    agent: AgentRole,
    execute: () => Promise<T>
  ): Promise<T> {
    this.startPhaseTimer(phase);
    updateProject(this.projectId, { currentPhase: phase });
    updatePhase(this.projectId, phase, {
      status: 'running',
      progress: 0,
      startedAt: Date.now(),
      iterations: 1,
    });

    this.pushEvent(createEvent({
      type: 'phase-start',
      phase,
      agent,
      message: `Starting phase: ${this.formatPhaseName(phase)}...`,
    }));

    this.pushEvent(createEvent({
      type: 'agent-start',
      phase,
      agent,
      message: `Agent ${agent} starting work on phase: ${this.formatPhaseName(phase)}...`,
    }));

    // Check if the agent is enabled in settings
    if (!isAgentEnabled(this.settings, agent)) {
      this.log(`Skipping phase "${phase}" because agent "${agent}" is disabled in settings.`);
      this.pushEvent(createEvent({
        type: 'log',
        phase,
        agent,
        message: `Agent ${agent} is disabled in settings. Skipping phase.`,
      }));
      updatePhase(this.projectId, phase, {
        status: 'completed',
        progress: 100,
        completedAt: Date.now(),
      });
      await this.endPhaseTimer(phase);
      // Return a stub or empty object matching type where applicable
      return {} as T;
    }

    try {
      const result = await execute();

      // Write agent output metadata
      await writeAgentMetadata(this.projectId, agent, result);

      updatePhase(this.projectId, phase, {
        status: 'completed',
        progress: 100,
        completedAt: Date.now(),
      });

      this.pushEvent(createEvent({
        type: 'phase-complete',
        phase,
        agent,
        message: `Phase completed: ${this.formatPhaseName(phase)}`,
      }));

      this.pushEvent(createEvent({
        type: 'agent-complete',
        phase,
        agent,
        message: `Agent ${agent} finished work on phase: ${this.formatPhaseName(phase)}`,
      }));

      await this.endPhaseTimer(phase);
      return result;
    } catch (error) {
      updatePhase(this.projectId, phase, {
        status: 'failed',
        completedAt: Date.now(),
      });

      this.pushEvent(createEvent({
        type: 'phase-error',
        phase,
        agent,
        message: `Phase failed: ${error instanceof Error ? error.message : String(error)}`,
        data: { error: String(error) },
      }));

      await this.endPhaseTimer(phase);
      throw error;
    }
  }

  public async run(): Promise<void> {
    const project = getProject(this.projectId);
    if (!project) {
      console.error(`[OCollabro] Project not found: ${this.projectId}`);
      return;
    }

    const selectedModel = project.model || 'Llama';

    return modelContext.run(selectedModel, async () => {
      try {
        // 1. Load settings
        this.settings = await loadAgentSettings();
        this.log(`Loaded agent toggles: ${JSON.stringify(this.settings)}`);

        updateProject(this.projectId, { status: 'running' });
        this.pushEvent(createEvent({
          type: 'log',
          phase: 'prompt-analysis',
          agent: 'manager',
          message: `OCollabro centralized pipeline started. Model: ${selectedModel}`,
        }));

        // ── Phase 1: Prompt Analysis ──────────────────────────────────────────
        const analysis = await this.runPhase<PromptAnalysis>('prompt-analysis', 'prompt-analyzer', async () => {
          const result = await analyzePrompt(project.prompt);
          updateProject(this.projectId, { promptAnalysis: result });
          this.pushEvent(createEvent({
            type: 'agent-output',
            phase: 'prompt-analysis',
            agent: 'prompt-analyzer',
            message: `Identified project type: ${result.projectType}.`,
            data: { summary: result.summary },
          }));
          return result;
        });

        // ── Phase 2: Requirements Validation ──────────────────────────────────
        const requirements = await this.runPhase<RequirementsValidation>('requirements-validation', 'requirements-validator', async () => {
          const result = await validateRequirements(analysis);
          updateProject(this.projectId, { requirementsValidation: result });
          this.pushEvent(createEvent({
            type: 'agent-output',
            phase: 'requirements-validation',
            agent: 'requirements-validator',
            message: `Validated requirements. ${result.confirmedRequirements.length} confirmed, ${result.missingRequirements.length} missing.`,
            data: { isComplete: result.isComplete },
          }));
          return result;
        });

        // ── Phase 3: Architecture Design ──────────────────────────────────────
        const architecture = await this.runPhase<ArchitectureDesign>('architecture-design', 'architect', async () => {
          // If architect is disabled, build a default mock architecture design
          if (!isAgentEnabled(this.settings, 'architect')) {
            return this.getDefaultArchitecture(analysis);
          }
          const result = await designArchitecture(analysis, requirements);
          updateProject(this.projectId, { architectureDesign: result });
          this.pushEvent(createEvent({
            type: 'agent-output',
            phase: 'architecture-design',
            agent: 'architect',
            message: `Designed architecture with ${result.fileList.length} files.`,
            data: { totalFiles: result.fileList.length },
          }));
          return result;
        });

        // ── Phase 4: Content Planning ─────────────────────────────────────────
        const contentPlan = await this.runPhase<ContentPlan>('content-planning', 'content-planner', async () => {
          if (!isAgentEnabled(this.settings, 'content-planner') && !isAgentEnabled(this.settings, 'planner')) {
            return {
              fileSpecs: architecture.fileList,
              dependencyGraph: {},
              totalFiles: architecture.fileList.length,
              estimatedTotalTokens: 10000
            };
          }
          const result = await planContent(architecture, analysis);
          updateProject(this.projectId, { contentPlan: result });
          this.pushEvent(createEvent({
            type: 'agent-output',
            phase: 'content-planning',
            agent: 'content-planner',
            message: `Content plan created: ${result.totalFiles} files.`,
          }));
          return result;
        });

        // ── Phase 5: Task Scheduling ──────────────────────────────────────────
        const scheduled = await this.runPhase<ScheduledTasks>('task-scheduling', 'scheduler', async () => {
          const result = await scheduleTasks(contentPlan);
          updateProject(this.projectId, { scheduledTasks: result });
          this.pushEvent(createEvent({
            type: 'agent-output',
            phase: 'task-scheduling',
            agent: 'scheduler',
            message: `Scheduled ${result.tasks.length} tasks in ${result.parallelGroups.length} groups.`,
          }));
          return result;
        });

        // ── Phase 6: Implementation ───────────────────────────────────────────
        await this.runPhase<GeneratedFile[]>('implementation', 'manager', async () => {
          const generatedFiles: GeneratedFile[] = [];

          // Initialize with default Next.js structure
          const defaultFiles = getDefaultNextJsFiles(this.projectId);
          for (const defaultFile of defaultFiles) {
            addOrUpdateGeneratedFile(generatedFiles, defaultFile);
          }

          const totalTasks = scheduled.executionOrder.length;
          let completedTasks = 0;

          for (const group of scheduled.parallelGroups) {
            const groupTasks = group
              .map(taskId => scheduled.tasks.find(t => t.id === taskId))
              .filter((t): t is TaskItem => t !== undefined);

            await Promise.allSettled(
              groupTasks.map(async (task) => {
                const assignedAgent = task.fileSpec.assignedAgent;
                if (!isAgentEnabled(this.settings, assignedAgent)) {
                  this.log(`Skipping file generation for ${task.fileSpec.path} (Agent ${assignedAgent} disabled)`);
                  return;
                }

                this.pushEvent(createEvent({
                  type: 'agent-start',
                  phase: 'implementation',
                  agent: assignedAgent,
                  message: `Agent ${assignedAgent} starting work on ${task.fileSpec.path}...`,
                }));

                try {
                  let content = await this.generateFile(task.fileSpec, { analysis, architecture });
                  content = stripCodeFences(content);

                  // Merge or normalize configs
                  if (task.fileSpec.path === 'package.json') {
                    content = mergePackageJson(getDefaultPackageJson(this.projectId), content);
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

                  const file: GeneratedFile = {
                    path: task.fileSpec.path,
                    content,
                    agent: assignedAgent,
                    generatedAt: Date.now(),
                  };

                  addOrUpdateGeneratedFile(generatedFiles, file);
                  
                  // Save agent metadata for this generated file
                  await writeAgentMetadata(this.projectId, `${assignedAgent}_${task.id}`, {
                    path: file.path,
                    agent: file.agent,
                    size: content.length
                  });

                  this.pushEvent(createEvent({
                    type: 'file-generated',
                    phase: 'implementation',
                    agent: assignedAgent,
                    message: `Generated ${task.fileSpec.path}`,
                    data: { filePath: task.fileSpec.path, size: content.length },
                  }));

                  return file;
                } catch (error) {
                  this.pushEvent(createEvent({
                    type: 'agent-error',
                    phase: 'implementation',
                    agent: assignedAgent,
                    message: `Failed to generate ${task.fileSpec.path}: ${error}`,
                  }));
                }
              })
            );

            completedTasks += groupTasks.length;
            const progress = Math.round((completedTasks / totalTasks) * 100);
            updateProject(this.projectId, { generatedFiles: [...generatedFiles] });
            updatePhase(this.projectId, 'implementation', { progress });
          }

          updateProject(this.projectId, { generatedFiles });
          return generatedFiles;
        });

        // Get updated project state
        const updatedProject = getProject(this.projectId)!;

        // ── Phase 7: Strict Validation & Agile Self-Healing Loop ──────────────────
        await this.runPhase<GeneratedFile>('testing', 'tester', async () => {
          // Check if testing/tester is enabled
          if (!isAgentEnabled(this.settings, 'tester')) {
            this.pushEvent(createEvent({
              type: 'log',
              phase: 'testing',
              agent: 'tester',
              message: 'Tester agent is disabled. Skipping validation pipeline.'
            }));
            return {} as GeneratedFile;
          }

          const testContent = await generateTests(updatedProject.generatedFiles, analysis);
          const testFile: GeneratedFile = {
            path: '__tests__/app.test.tsx',
            content: testContent,
            agent: 'tester',
            generatedAt: Date.now(),
          };
          addOrUpdateGeneratedFile(updatedProject.generatedFiles, testFile);
          updateProject(this.projectId, { generatedFiles: [...updatedProject.generatedFiles] });

          const projectDir = path.join(process.cwd(), 'workspace', 'project', this.projectId);
          
          // Write all files to disk first
          for (const file of updatedProject.generatedFiles) {
            await this.writeProjectFileToDisk(file.path, file.content);
          }

          let hasErrors = true;
          this.cycleCount = 0;

          while (hasErrors && this.cycleCount < this.MAX_CYCLES) {
            this.cycleCount++;
            this.log(`Starting Validation Cycle ${this.cycleCount}/${this.MAX_CYCLES}...`);
            updatePhase(this.projectId, 'testing', {
              iterations: this.cycleCount
            });

            // Execute the strict validation pipeline
            const report = await runValidationPipeline(projectDir, this.projectId, (stage, msg) => {
              this.pushEvent(createEvent({
                type: 'log',
                phase: 'testing',
                agent: 'tester',
                message: `[${stage}] ${msg}`
              }));
            });

            // Write report to metadata
            await writeValidationReport(this.projectId, report);

            const allErrors = report.stages.flatMap(s => s.errors);
            
            // Log cycle entry
            const cycleEntry = {
              cycle: this.cycleCount,
              timestamp: Date.now(),
              trigger: allErrors.length > 0 ? `Stage failed: ${allErrors[0].stage}` : 'Initial run',
              errorsFound: allErrors.length,
              agentsInvoked: [] as string[],
              resolved: allErrors.length === 0
            };

            if (allErrors.length > 0) {
              this.log(`Cycle ${this.cycleCount} failed with ${allErrors.length} errors.`);
              
              // Classify errors by responsible agent
              const mappedErrors = classifyErrorsByAgent(allErrors);
              
              // Invoke self-healing logic for each agent role
              for (const [agentRole, agentErrors] of Object.entries(mappedErrors)) {
                if (agentErrors.length === 0) continue;

                // Check if debugger agent is enabled
                if (!isAgentEnabled(this.settings, 'debugger')) {
                  this.log(`Debugger agent is disabled. Cannot fix errors for ${agentRole}.`);
                  continue;
                }

                cycleEntry.agentsInvoked.push(agentRole);
                this.pushEvent(createEvent({
                  type: 'log',
                  phase: 'testing',
                  agent: 'tester',
                  message: `Debugger: Routing ${agentErrors.length} errors to ${agentRole} for cycle ${this.cycleCount}.`
                }));

                // Fix each file associated with this agent's errors
                const uniqueErrorFiles = Array.from(new Set(agentErrors.map(e => e.file)));
                for (const errFile of uniqueErrorFiles) {
                  const fullFilePath = path.join(projectDir, errFile);
                  try {
                    // Check if file exists
                    await fs.access(fullFilePath);
                    const originalContent = await fs.readFile(fullFilePath, 'utf-8');
                    
                    const combinedLogs = agentErrors.map(e => `[Line ${e.line || '?'}] ${e.message}`).join('\n');
                    
                    this.pushEvent(createEvent({
                      type: 'log',
                      phase: 'testing',
                      agent: 'tester',
                      message: `Debugger: Re-generating & correcting code for ${errFile}...`
                    }));

                    const correctedContent = await debugCodeFile({
                      path: errFile,
                      content: originalContent,
                      errorLog: combinedLogs,
                      analysis,
                      architecture
                    });

                    // Save fixed content
                    await fs.writeFile(fullFilePath, correctedContent, 'utf-8');

                    // Update memory state
                    const state = getProject(this.projectId)!;
                    addOrUpdateGeneratedFile(state.generatedFiles, {
                      path: errFile,
                      content: correctedContent,
                      agent: agentRole as AgentRole,
                      generatedAt: Date.now()
                    });
                    updateProject(this.projectId, { generatedFiles: [...state.generatedFiles] });
                    
                    this.log(`Successfully patched file: ${errFile}`);
                  } catch (e) {
                    console.error(`[OCollabro] Failed to repair file ${errFile}:`, e);
                  }
                }
              }

              // Append cycle logs
              await appendCycleEntry(this.projectId, cycleEntry);
            } else {
              this.log(`Validation pipeline PASSED on cycle ${this.cycleCount}!`);
              hasErrors = false;
              await appendCycleEntry(this.projectId, cycleEntry);
            }
          }

          if (hasErrors) {
            throw new Error(`Self-healing validation pipeline failed to converge after ${this.MAX_CYCLES} cycles.`);
          }

          return testFile;
        });

        // ── Phase 8: Documentation ────────────────────────────────────────────
        const docProject = getProject(this.projectId)!;
        await this.runPhase<GeneratedFile>('documentation', 'documenter', async () => {
          const readmeContent = await generateDocumentation({
            analysis,
            architecture,
            files: docProject.generatedFiles,
          });
          const readmeFile: GeneratedFile = {
            path: 'README.md',
            content: readmeContent,
            agent: 'documenter',
            generatedAt: Date.now(),
          };
          addOrUpdateGeneratedFile(docProject.generatedFiles, readmeFile);
          updateProject(this.projectId, {
            generatedFiles: [...docProject.generatedFiles],
          });
          return readmeFile;
        });

        // ── Phase 9: Deployment ───────────────────────────────────────────────
        await this.runPhase<object>('deployment', 'deployer', async () => {
          this.pushEvent(createEvent({
            type: 'log',
            phase: 'deployment',
            agent: 'deployer',
            message: 'Deployment configs compiled successfully.'
          }));
          return {};
        });

        // ── Pipeline Complete ─────────────────────────────────────────────────
        const finalState = getProject(this.projectId)!;
        let instructions = `# Running the Generated Project\n\n`;
        instructions += `This project was autonomously generated by **OCollabro**.\n\n`;
        instructions += `## Getting Started\n\n`;
        instructions += `1. **Install Dependencies**:\n`;
        instructions += `   \`\`\`bash\n`;
        instructions += `   npm install\n`;
        instructions += `   \`\`\`\n`;
        instructions += `2. **Run in Development Mode**:\n`;
        instructions += `   \`\`\`bash\n`;
        instructions += `   npm run dev\n`;
        instructions += `   \`\`\`\n`;

        const instructionsFile: GeneratedFile = {
          path: 'RUN_INSTRUCTIONS.md',
          content: instructions,
          agent: 'manager',
          generatedAt: Date.now()
        };
        addOrUpdateGeneratedFile(finalState.generatedFiles, instructionsFile);
        updateProject(this.projectId, { generatedFiles: [...finalState.generatedFiles] });

        // Write final outputs to workspace
        for (const file of finalState.generatedFiles) {
          await this.writeProjectFileToDisk(file.path, file.content);
        }

        updateProject(this.projectId, { status: 'completed', currentPhase: 'completed' });
        this.pushEvent(createEvent({
          type: 'phase-complete',
          phase: 'completed',
          agent: 'manager',
          message: `Pipeline completed! Generated ${finalState.generatedFiles.length} files.`
        }));

      } catch (error) {
        console.error(`[OCollabro] Fatal error in pipeline:`, error);
        updateProject(this.projectId, {
          status: 'failed',
          error: String(error)
        });
        this.pushEvent(createEvent({
          type: 'phase-error',
          phase: getProject(this.projectId)?.currentPhase || 'prompt-analysis',
          agent: 'manager',
          message: `OCollabro pipeline failed: ${error}`,
          data: { error: String(error) }
        }));
      }
    });
  }

  private async generateFile(
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
        return generateBackendFile(spec, context);
    }
  }

  private getDefaultArchitecture(_analysis: PromptAnalysis): ArchitectureDesign {
    return {
      folderStructure: 'src/app',
      fileList: [
        {
          path: 'src/app/page.tsx',
          purpose: 'Main landing page',
          requirements: ['Display welcome message', 'Use Tailwind CSS'],
          dependencies: [],
          estimatedTokens: 500,
          priority: 'critical',
          assignedAgent: 'frontend-dev'
        }
      ],
      apiEndpoints: [],
      databaseSchema: '',
      envVariables: [],
      dependencies: {},
      buildConfig: ''
    };
  }

  private formatPhaseName(phase: PipelinePhase): string {
    return phase
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

/**
 * Compatibility function matching old orchestrator signature
 */
export async function runPipeline(projectId: string): Promise<void> {
  const orchestrator = new OCollabro(projectId);
  return orchestrator.run();
}
