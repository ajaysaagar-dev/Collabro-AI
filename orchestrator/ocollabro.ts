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
import { checkImports, formatImportErrors } from '@/core/import-resolver';

// Advanced Loop Prevention & Self-Healing Imports
import { FileLockManager } from '@/core/repair/file-lock-manager';
import { generateErrorFingerprint } from '@/core/repair/fingerprinter';
import { buildFileDependencyGraph, buildErrorDependencyGraph } from '@/core/repair/dependency-graph';
import { analyzeRootCauses } from '@/core/repair/root-cause-analyzer';
import { createRepairPlan } from '@/core/repair/repair-planner';
import { reviewPatch } from '@/core/repair/patch-reviewer';
import { executePatch, rollbackRepairPlan } from '@/core/repair/patch-executor';
import { SupervisorAgent } from '@/core/repair/supervisor';
import { createValidationCache } from '@/core/repair/incremental-validator';
import { createErrorMemory } from '@/core/repair/fingerprinter';
import { AtomicPatch, ValidationError, StrategyAttempt } from '@/core/repair/types';



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

          // Run zero-LLM local import resolution checks in memory before finalizing implementation
          const importReport = checkImports(generatedFiles);
          if (!importReport.passed) {
            this.pushEvent(createEvent({
              type: 'log',
              phase: 'implementation',
              agent: 'manager',
              message: `[Import Resolution] Detected ${importReport.unresolvedImports.length} unresolved imports in generated files.`
            }));
            const formattedErrors = formatImportErrors(importReport);
            this.log(formattedErrors);
          }

          updateProject(this.projectId, { generatedFiles });
          return generatedFiles;
        });

        // Get updated project state
        const updatedProject = getProject(this.projectId)!;

        // ── Phase 7: Strict Validation & Agile Self-Healing Loop ──────────────────
        await this.runPhase<any>('testing', 'tester', async () => {
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

          const testFiles = await generateTests(updatedProject.generatedFiles, analysis);
          for (const file of testFiles) {
            addOrUpdateGeneratedFile(updatedProject.generatedFiles, file);
          }

          const projectDir = path.join(process.cwd(), 'workspace', 'project', this.projectId);
          
          // Verify and recover any missing files from Architecture plan
          const missingSpecs: FileSpec[] = [];
          for (const spec of architecture.fileList) {
            const hasInMemory = updatedProject.generatedFiles.some(f => f.path === spec.path);
            const fullPath = path.join(projectDir, spec.path);
            let existsOnDisk = false;
            try {
              await fs.access(fullPath);
              existsOnDisk = true;
            } catch {
              // Not on disk
            }
            if (!hasInMemory || !existsOnDisk) {
              missingSpecs.push(spec);
            }
          }

          if (missingSpecs.length > 0) {
            this.pushEvent(createEvent({
              type: 'log',
              phase: 'testing',
              agent: 'manager',
              message: `Recovery: Re-generating ${missingSpecs.length} missing files from architecture...`
            }));

            for (const spec of missingSpecs) {
              this.log(`Re-generating missing file: ${spec.path}`);
              try {
                // Ensure parent directory exists
                const fullPath = path.join(projectDir, spec.path);
                await fs.mkdir(path.dirname(fullPath), { recursive: true });

                // Call generation
                let content = await this.generateFile(spec, { analysis, architecture });
                content = stripCodeFences(content);

                // Config normalization if applicable
                if (spec.path === 'package.json') {
                  content = mergePackageJson(getDefaultPackageJson(this.projectId), content);
                } else if (spec.path === 'tsconfig.json') {
                  content = mergeTsConfig(getDefaultTsConfig(), content);
                } else if (spec.path === 'next.config.js') {
                  content = content.trim().length > 10 ? content : getDefaultNextConfig();
                }

                const file: GeneratedFile = {
                  path: spec.path,
                  content,
                  agent: spec.assignedAgent,
                  generatedAt: Date.now()
                };

                addOrUpdateGeneratedFile(updatedProject.generatedFiles, file);
                await this.writeProjectFileToDisk(file.path, file.content);
                
                this.pushEvent(createEvent({
                  type: 'file-generated',
                  phase: 'testing',
                  agent: spec.assignedAgent,
                  message: `Recovered missing file: ${spec.path}`,
                  data: { filePath: spec.path, size: content.length }
                }));
              } catch (err) {
                this.log(`Failed to recover missing file ${spec.path}: ${err}`);
              }
            }
            
            // Sync memory store
            updateProject(this.projectId, { generatedFiles: [...updatedProject.generatedFiles] });
          }

          // Write all files to disk first
          for (const file of updatedProject.generatedFiles) {
            await this.writeProjectFileToDisk(file.path, file.content);
          }

          // Initialize advanced self-healing and loop prevention modules
          const fileLockManager = new FileLockManager();
          const validationCache = createValidationCache();
          const errorMemory = createErrorMemory();
          const supervisor = new SupervisorAgent({ maxCycles: this.MAX_CYCLES });
          let previousErrors: ValidationError[] = [];
          const strategyAttempts: StrategyAttempt[] = [];
          
          // 1. Initial Validation run
          const initialReport = await runValidationPipeline(projectDir, this.projectId, (stage, msg) => {
            this.pushEvent(createEvent({
              type: 'log',
              phase: 'testing',
              agent: 'tester',
              message: `[${stage}] ${msg}`
            }));
          });
          await writeValidationReport(this.projectId, initialReport);
          let currentErrors = initialReport.stages.flatMap(s => s.errors);
          previousErrors = [...currentErrors];

          if (currentErrors.length > 0) {
            supervisor.initialize(currentErrors.length);
            this.cycleCount = 0;

            while (supervisor.shouldContinue() && currentErrors.length > 0) {
              const cycleStartTime = Date.now();
              this.cycleCount++;
              this.log(`Starting Advanced Self-Healing Cycle ${this.cycleCount}/${this.MAX_CYCLES}...`);
              updatePhase(this.projectId, 'testing', {
                iterations: this.cycleCount
              });

              const supervisorAction = supervisor.onCycleStart(this.cycleCount);
              if (supervisorAction === 'escalate' || supervisorAction === 'architecture-review') {
                this.log(`Supervisor requested escalation: ${supervisorAction}`);
                break;
              }

              // 2. Build Dependency Graphs & Analyze Root Causes
              const fileGraph = await buildFileDependencyGraph(projectDir);
              const errorGraph = buildErrorDependencyGraph(currentErrors, fileGraph);
              const rootCauseAnalysis = analyzeRootCauses(errorGraph);

              // Log root cause details
              this.pushEvent(createEvent({
                type: 'log',
                phase: 'testing',
                agent: 'tester',
                message: `Root Cause Analysis:`
              }));
              const explanationLines = rootCauseAnalysis.explanation.split('\n');
              for (const line of explanationLines) {
                if (line.trim() === '') continue;
                this.pushEvent(createEvent({
                  type: 'log',
                  phase: 'testing',
                  agent: 'tester',
                  message: line
                }));
              }

              // 3. Create Repair Plan
              const repairPlan = createRepairPlan(rootCauseAnalysis, errorGraph, undefined, strategyAttempts);
              const appliedPatches: AtomicPatch[] = [];
              const rolledBackPatches: AtomicPatch[] = [];

              // 4. Execute Repair Plan patches atomically
              for (const patch of repairPlan.patches) {
                // Verify lock and cooldown
                const canEditCheck = fileLockManager.canEdit(patch.file);
                if (!canEditCheck.allowed) {
                  this.log(`Cannot edit ${patch.file}: ${canEditCheck.reason}`);
                  continue;
                }

                // Acquire lock
                fileLockManager.acquireLock(patch.file, patch.id, patch.createdBy, patch.description);

                const fullFilePath = path.join(projectDir, patch.file);
                let originalContent = '';
                try {
                  originalContent = await fs.readFile(fullFilePath, 'utf-8');
                } catch {
                  // File might be missing
                }

                // Gather error log for this specific file
                const fileSpecificErrors = currentErrors.filter(e => e.file === patch.file);
                const errorLog = fileSpecificErrors.map(e => `[Line ${e.line || '?'}] ${e.message}`).join('\n');

                this.pushEvent(createEvent({
                  type: 'log',
                  phase: 'testing',
                  agent: 'tester',
                  message: `Healing file ${patch.file} using Debugger Agent...`
                }));

                // Call Debugger Agent to correct code
                const correctedContent = await debugCodeFile({
                  path: patch.file,
                  content: originalContent,
                  errorLog,
                  analysis,
                  architecture
                });

                patch.diff = {
                  oldContent: originalContent,
                  newContent: correctedContent,
                  hunks: [],
                  linesAdded: 0,
                  linesRemoved: 0,
                  linesChanged: 0
                };

                // Review patch for safety & confidence
                const reviewResult = await reviewPatch(patch, originalContent, fileLockManager);
                if (!reviewResult.approved) {
                  this.log(`Patch rejected for ${patch.file}: ${reviewResult.concerns.join(', ')}`);
                  fileLockManager.forceReleaseLock(patch.file);
                  continue;
                }

                // Apply patch atomically
                const repairContext = {
                  projectId: this.projectId,
                  projectDir,
                  state: 'applying-patches' as const,
                  cycleCount: this.cycleCount,
                  maxCycles: this.MAX_CYCLES,
                  errorBudget: supervisor.getState().errorBudget,
                  supervisorState: supervisor.getState(),
                  validationCache,
                  errorMemory,
                  fileLocks: new Map(),
                  fileLifecycles: new Map(),
                  appliedPatches,
                  rolledBackPatches,
                  validationResults: [],
                  startTime: Date.now(),
                  lastProgressTime: Date.now()
                };

                const patchResult = await executePatch(patch, projectDir, fileLockManager, repairContext, validationCache);
                if (patchResult.success) {
                  patch.status = 'applied';
                  appliedPatches.push(patch);
                  fileLockManager.recordPatch(patch.file, patch);
                  
                  // Update state in project memory
                  const projectState = getProject(this.projectId)!;
                  addOrUpdateGeneratedFile(projectState.generatedFiles, {
                    path: patch.file,
                    content: correctedContent,
                    agent: patch.createdBy,
                    generatedAt: Date.now()
                  });
                  updateProject(this.projectId, { generatedFiles: [...projectState.generatedFiles] });
                  this.log(`Atomic patch successfully applied to ${patch.file}`);
                } else {
                  patch.status = 'rolled-back';
                  rolledBackPatches.push(patch);
                  fileLockManager.recordRollback(patch.file, patch.id);
                  this.log(`Patch failed on ${patch.file}. Automatically rolled back.`);
                }
              }

              // 5. Post-repair Validation
              const nextReport = await runValidationPipeline(projectDir, this.projectId, (stage, msg) => {
                this.pushEvent(createEvent({
                  type: 'log',
                  phase: 'testing',
                  agent: 'tester',
                  message: `[${stage}] ${msg}`
                }));
              });
              await writeValidationReport(this.projectId, nextReport);
              const nextErrors = nextReport.stages.flatMap(s => s.errors);

              // Update cycle log metadata
              const cycleEntry = {
                cycle: this.cycleCount,
                timestamp: Date.now(),
                trigger: currentErrors.length > 0 ? `Stage failed: ${currentErrors[0].stage}` : 'Advanced healing cycle',
                errorsFound: nextErrors.length,
                agentsInvoked: ['debugger'],
                resolved: nextErrors.length === 0
              };
              await appendCycleEntry(this.projectId, cycleEntry);

              // 6. Complete cycle in Supervisor
              const cycleCompletion = supervisor.onCycleComplete(
                this.cycleCount,
                nextErrors,
                currentErrors,
                appliedPatches,
                rolledBackPatches
              );

              // Record this strategy attempt
              const cycleDuration = Date.now() - cycleStartTime;
              const errorsFixed = currentErrors.length - nextErrors.length;
              
              for (const patch of repairPlan.patches) {
                strategyAttempts.push({
                  strategy: patch.strategy,
                  attemptNumber: strategyAttempts.filter(a => a.strategy === patch.strategy).length + 1,
                  patchIds: [patch.id],
                  result: nextErrors.length < currentErrors.length ? 'success' : 'failure',
                  errorsFixed: errorsFixed > 0 ? errorsFixed : 0,
                  errorsIntroduced: nextErrors.length > currentErrors.length ? nextErrors.length - currentErrors.length : 0,
                  regressions: rolledBackPatches.length,
                  duration: cycleDuration,
                  timestamp: Date.now()
                });
              }

              previousErrors = [...currentErrors];
              currentErrors = nextErrors;

              if (cycleCompletion.action === 'escalate' || cycleCompletion.action === 'rollback') {
                this.log(`Supervisor triggered rollback/escalation action: ${cycleCompletion.action}`);
                // Rollback entire plan's applied patches if regression detected
                await rollbackRepairPlan(repairPlan, projectDir, fileLockManager, validationCache);
                break;
              }
            }
          }

          const initialErrors = initialReport.stages.flatMap(s => s.errors).length;
          const remainingErrors = currentErrors.length;
          const fixedErrors = Math.max(0, initialErrors - remainingErrors);
          const progressPercentage = initialErrors > 0 ? ((fixedErrors / initialErrors) * 100).toFixed(1) : '100.0';
          
          let repairStatus = 'SUCCESS';
          let reason = 'All errors resolved';
          
          if (remainingErrors > 0) {
            const isStalled = supervisor.getState().errorBudget.stagnationCycles >= 3;
            repairStatus = isStalled ? 'STALLED' : 'PARTIAL_SUCCESS';
            reason = isStalled ? 'No improvement detected (stagnation)' : 'Self-healing loop did not fully converge within maximum cycles';
          }
          
          const repairReport = {
            status: repairStatus,
            initialErrors,
            fixedErrors,
            remainingErrors,
            progress: `${progressPercentage}%`,
            repairCycles: this.cycleCount,
            reason,
            currentStrategy: 'Advanced Self-Healing',
            nextStrategy: 'Architecture Review',
            nextAgent: 'architecture-review-agent',
            rollbackAvailable: true,
            escalationLevel: remainingErrors > 0 ? 4 : 0
          };
          
          this.log(`Validation and healing finished. Status: ${repairStatus}. Remaining errors: ${remainingErrors}`);
          
          updateProject(this.projectId, { repairReport });

          return repairReport;
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
        instructions += `   \`\`\`\n\n`;
        instructions += `> [!IMPORTANT]\n`;
        instructions += `> **Avoid Copying \`node_modules\`**:\n`;
        instructions += `> If you copy, archive, or move this project directory, do NOT include the \`node_modules\` folder. Copying \`node_modules\` directly converts symbolic links (such as \`node_modules/.bin/next\`) into regular text/script files, causing crashes with errors like \`Cannot find module '../server/require-hook'\` due to failed relative path resolution in Node.js. Always run a clean \`npm install\` to generate correct native symlinks.\n`;

        const instructionsFile: GeneratedFile = {
          path: 'RUN_INSTRUCTIONS.md',
          content: instructions,
          agent: 'manager',
          generatedAt: Date.now()
        };
        addOrUpdateGeneratedFile(finalState.generatedFiles, instructionsFile);

        // Generate mapping.json based on all generated files and workspace directories
        const filesMap: Record<string, any> = {};
        for (const file of finalState.generatedFiles) {
          filesMap[file.path] = {
            agent: file.agent,
            generatedAt: file.generatedAt
          };
        }

        const mappingObj = {
          projectRoot: '.',
          folders: {
            apps: 'apps',
            web: 'apps/web',
            modules: 'modules',
            shared: 'shared',
            domains: 'domains',
            infrastructure: 'infrastructure',
            services: 'services',
            integrations: 'integrations'
          },
          aliases: {
            '@/modules': 'modules',
            '@/shared': 'shared',
            '@/domains': 'domains',
            '@/infrastructure': 'infrastructure',
            '@/services': 'services',
            '@/integrations': 'integrations'
          },
          files: filesMap
        };

        const mappingFile: GeneratedFile = {
          path: 'mapping.json',
          content: JSON.stringify(mappingObj, null, 2),
          agent: 'manager',
          generatedAt: Date.now()
        };
        addOrUpdateGeneratedFile(finalState.generatedFiles, mappingFile);
        updateProject(this.projectId, { generatedFiles: [...finalState.generatedFiles] });

        // Write final outputs to workspace
        for (const file of finalState.generatedFiles) {
          await this.writeProjectFileToDisk(file.path, file.content);
        }

        const finalReport = getProject(this.projectId)?.repairReport;
        const finalStatus = finalReport && (finalReport.status === 'STALLED' || finalReport.status === 'PARTIAL_SUCCESS')
          ? finalReport.status.toLowerCase() as any
          : 'completed';

        updateProject(this.projectId, { 
          status: finalStatus, 
          currentPhase: 'completed' 
        });
        
        this.pushEvent(createEvent({
          type: 'phase-complete',
          phase: 'completed',
          agent: 'manager',
          message: `Pipeline completed with status ${finalStatus.toUpperCase()}! Generated ${finalState.generatedFiles.length} files.`
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
      folderStructure: 'apps/web',
      fileList: [
        {
          path: 'apps/web/src/app/page.tsx',
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
