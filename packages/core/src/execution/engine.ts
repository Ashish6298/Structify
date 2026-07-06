import * as fs from 'fs';
import * as path from 'path';
import { PlanStep, RollbackAction } from '../types/index.js';
import { GenerationSession } from './session.js';
import { DefaultCommandExecutor, DryRunCommandExecutor, CommandExecutor } from './executor.js';
import { createBuiltInExtensionPlugin } from '../extensions/index.js';
import { HookPoint } from '../hooks/index.js';
import { ProjectDiffEngine } from '../platform/index.js';
import { createComposableGenerationPlan } from '../generation/composable.js';

export interface EngineOptions {
  install?: boolean;
  force?: boolean;
  executor?: CommandExecutor;
}

export class GenerationEngine {
  public static async execute(
    session: GenerationSession,
    options: EngineOptions = {},
  ): Promise<ReturnType<GenerationSession['serialize']>> {
    await session.pluginManager.register(createBuiltInExtensionPlugin());
    const steps = session.graph.topologicalSort();

    try {
      await session.eventBus.emit({
        name: 'GenerationStarted',
        sessionId: session.sessionId,
        source: 'generation-engine',
        payload: { projectName: session.config.projectName, targetDir: session.targetDir },
      });
      await this.runBlockingHooks(session, 'beforeGeneration', {
        projectName: session.config.projectName,
        targetDir: session.targetDir,
      });

      // Check directory conflict first
      const resolvedTarget = path.resolve(session.targetDir);
      if (fs.existsSync(resolvedTarget) && !session.dryRun) {
        if (fs.statSync(resolvedTarget).isDirectory()) {
          const filesInDir = fs.readdirSync(resolvedTarget);
          if (filesInDir.length > 0 && !options.force) {
            throw new Error(
              `Target directory "${session.targetDir}" exists and is not empty. Use --force to proceed.`,
            );
          }
        }
      }

      for (const [index, step] of steps.entries()) {
        if (session.isCancelled) {
          throw new Error('Scaffolding execution cancelled by user.');
        }

        await this.executeStep(session, step, resolvedTarget, options);
        session.updateProgress(((index + 1) / steps.length) * 100);
      }
      await this.runBlockingHooks(session, 'afterGeneration', {
        projectName: session.config.projectName,
        targetDir: session.targetDir,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      session.addError(errMsg);
      await session.eventBus.emit({
        name: 'GenerationFailed',
        sessionId: session.sessionId,
        severity: 'error',
        source: 'generation-engine',
        payload: { error: errMsg },
      });

      // Trigger Rollback!
      if (!session.dryRun) {
        await this.rollback(session);
      }
    } finally {
      session.end();
      if (session.errors.length === 0) {
        await session.eventBus.emit({
          name: 'GenerationFinished',
          sessionId: session.sessionId,
          source: 'generation-engine',
          payload: {
            projectName: session.config.projectName,
            generatedFiles: session.generatedFiles.length,
            durationMs: session.metrics.durationMs ?? 0,
          },
        });
      }
    }

    return session.serialize();
  }

  private static async executeStep(
    session: GenerationSession,
    step: PlanStep,
    resolvedTarget: string,
    options: EngineOptions,
  ): Promise<void> {
    const stepStart = Date.now();
    const record = {
      stepId: step.id,
      status: 'running' as const,
      startedAt: new Date(stepStart).toISOString(),
      outputs: [] as string[],
      warnings: [] as string[],
      errors: [] as string[],
    };

    if (session.dryRun) {
      session.addDiagnostic(`[DRY-RUN] Executed step: ${step.id} - ${step.description}`);
      session.recordStep({
        ...record,
        status: 'skipped',
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - stepStart,
      });
      return;
    }

    try {
      if (step.type === 'CreateFolder') {
        const existedBefore = fs.existsSync(resolvedTarget);
        if (!existedBefore) {
          fs.mkdirSync(resolvedTarget, { recursive: true });
          session.registerRollbackAction({
            id: `rollback-${step.id}`,
            type: 'DeleteFolder',
            targetPath: resolvedTarget,
            description: `Delete generated project directory: ${resolvedTarget}`,
          });
        }
        record.outputs.push(`Project directory ready: ${resolvedTarget}`);
      } else if (step.type === 'ScaffoldTemplate') {
        await session.eventBus.emit({
          name: 'DependencyResolutionStarted',
          sessionId: session.sessionId,
          source: 'generation-engine',
          payload: { packageManager: session.config.stack.packageManager },
        });
        await this.runBlockingHooks(session, 'beforeDependencyResolve', {
          packageManager: session.config.stack.packageManager,
        });
        const plan = createComposableGenerationPlan(session.config);
        session.projectGraph = plan.projectGraph;
        session.resolvedDependencyGraph = plan.dependencyGraph;
        session.analytics = plan.analytics;
        const templates = plan.files;
        for (const file of templates) {
          session.virtualFileGraph.addFile({
            targetPath: file.path,
            content: file.content,
            sourceGenerator: 'gen-phase8-composed',
            sourceTemplate: `file:${file.path}`,
            conflictPolicy: options.force ? 'overwrite' : 'error',
            dependencies: [],
            fileType: file.path.endsWith('.json') ? 'json' : 'text',
            rollback: { deleteOnRollback: true, restoreBackup: options.force === true },
          });
        }
        session.virtualFileGraph.validate();
        session.diff = ProjectDiffEngine.compare(session.virtualFileGraph, resolvedTarget);
        await this.runBlockingHooks(session, 'afterDependencyResolve', {
          packageManager: session.config.stack.packageManager,
        });
        await session.eventBus.emit({
          name: 'DependencyResolved',
          sessionId: session.sessionId,
          source: 'generation-engine',
          payload: {
            dependencies: Object.keys(plan.dependencyGraph.dependencies).length,
            devDependencies: Object.keys(plan.dependencyGraph.devDependencies).length,
            diagnostics: plan.dependencyGraph.diagnostics,
          },
        });
        for (const file of templates) {
          await this.runBlockingHooks(session, 'beforeTemplateRender', {
            targetPath: file.path,
          });
          await session.eventBus.emit({
            name: 'TemplateRenderStarted',
            sessionId: session.sessionId,
            source: 'generation-engine',
            payload: { templateId: `file:${file.path}`, targetPath: file.path },
          });
          await this.runBlockingHooks(session, 'afterTemplateRender', {
            targetPath: file.path,
          });
          await session.eventBus.emit({
            name: 'TemplateRendered',
            sessionId: session.sessionId,
            source: 'generation-engine',
            payload: { templateId: `file:${file.path}`, targetPath: file.path },
          });
          const dest = this.resolveInsideTarget(resolvedTarget, file.path);
          const parentDir = path.dirname(dest);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }

          let isOverwrite = false;
          let originalContent = '';
          if (fs.existsSync(dest)) {
            if (!options.force) {
              const warning = `File already exists, skipping: ${file.path}`;
              session.addWarning(warning);
              session.registerSkippedFile(file.path);
              record.warnings.push(warning);
              await session.eventBus.emit({
                name: 'FileWriteSkipped',
                sessionId: session.sessionId,
                severity: 'warning',
                source: 'generation-engine',
                payload: { path: file.path, reason: 'file-exists' },
              });
              continue;
            }
            isOverwrite = true;
            originalContent = fs.readFileSync(dest, 'utf8');
          }

          await this.runBlockingHooks(session, 'beforeFileWrite', { path: file.path });
          await session.eventBus.emit({
            name: 'FileWriteStarted',
            sessionId: session.sessionId,
            source: 'generation-engine',
            payload: { path: file.path },
          });
          fs.writeFileSync(dest, file.content, 'utf8');
          session.registerGeneratedFile(file.path);
          await this.runBlockingHooks(session, 'afterFileWrite', { path: file.path });
          await session.eventBus.emit({
            name: 'FileWritten',
            sessionId: session.sessionId,
            source: 'generation-engine',
            payload: { path: file.path, overwritten: isOverwrite },
          });

          if (isOverwrite) {
            session.registerRollbackAction({
              id: `rollback-write-${file.path}`,
              type: 'RestoreFile',
              targetPath: dest,
              description: `Restore original file content: ${file.path}`,
              originalContent,
            });
          } else {
            session.registerRollbackAction({
              id: `rollback-write-${file.path}`,
              type: 'DeleteFile',
              targetPath: dest,
              description: `Delete generated file: ${file.path}`,
            });
          }
        }
      } else if (
        step.type === 'WriteFile' ||
        step.type === 'Template' ||
        step.type === 'AppendFile'
      ) {
        session.addDiagnostic(`Step ${step.id} is covered by deterministic scaffold templates.`);
        record.outputs.push('Covered by scaffold template batch.');
      } else if (step.type === 'RunCommand') {
        if (step.commandStep) {
          const cmd = step.commandStep.commandLine;
          const isInstallCmd =
            cmd.includes(' install') || cmd.endsWith(' install') || cmd.includes(' add ');
          await this.runBlockingHooks(session, 'beforeCommandPlan', { commandLine: cmd });
          await session.eventBus.emit({
            name: 'CommandPlanned',
            sessionId: session.sessionId,
            source: 'generation-engine',
            payload: { commandLine: cmd },
          });
          await this.runBlockingHooks(session, 'afterCommandPlan', { commandLine: cmd });
          if (isInstallCmd && !options.install) {
            session.addDiagnostic(
              `Skipping dependency installation command: ${cmd} (use --install to run)`,
            );
            session.recordStep({
              ...record,
              status: 'skipped',
              endedAt: new Date().toISOString(),
              durationMs: Date.now() - stepStart,
            });
            return;
          }

          const executor =
            options.executor ??
            (isInstallCmd ? new DryRunCommandExecutor() : new DefaultCommandExecutor());
          const start = Date.now();
          const execRes = await executor.execute(cmd, [], { cwd: resolvedTarget });
          session.recordCommand({
            commandLine: cmd,
            code: execRes.code,
            stdout: execRes.stdout,
            stderr: execRes.stderr,
            durationMs: Date.now() - start,
          });
          await session.eventBus.emit({
            name: 'CommandExecuted',
            sessionId: session.sessionId,
            source: 'generation-engine',
            payload: {
              commandLine: cmd,
              code: execRes.code,
              durationMs: Date.now() - start,
            },
          });
          if (execRes.code !== 0) {
            throw new Error(`Command "${cmd}" failed with code ${execRes.code}`);
          }
        }
      }

      session.recordStep({
        ...record,
        status: 'success',
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - stepStart,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      session.recordStep({
        ...record,
        status: 'failed',
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - stepStart,
        errors: [message],
      });
      throw error;
    }
  }

  private static async rollback(session: GenerationSession): Promise<void> {
    const stack: RollbackAction[] = [...session.rollbackStack].reverse();
    await this.runBlockingHooks(session, 'beforeRollback', { actionCount: stack.length });
    await session.eventBus.emit({
      name: 'RollbackStarted',
      sessionId: session.sessionId,
      source: 'generation-engine',
      payload: { actionCount: stack.length },
    });
    for (const action of stack) {
      try {
        if (action.type === 'DeleteFolder') {
          if (fs.existsSync(action.targetPath)) {
            fs.rmSync(action.targetPath, { recursive: true, force: true });
          }
        } else if (action.type === 'DeleteFile') {
          if (fs.existsSync(action.targetPath)) {
            fs.unlinkSync(action.targetPath);
          }
        } else if (action.type === 'RestoreFile' && action.originalContent !== undefined) {
          fs.writeFileSync(action.targetPath, action.originalContent, 'utf8');
        }
        session.recordRollbackResult({
          actionId: action.id,
          description: action.description,
          success: true,
        });
        await session.eventBus.emit({
          name: 'RollbackStepCompleted',
          sessionId: session.sessionId,
          source: 'generation-engine',
          payload: { actionId: action.id, success: true },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        session.addWarning(`Rollback action "${action.description}" failed: ${msg}`);
        session.recordRollbackResult({
          actionId: action.id,
          description: action.description,
          success: false,
          error: msg,
        });
        await session.eventBus.emit({
          name: 'RollbackStepCompleted',
          sessionId: session.sessionId,
          severity: 'error',
          source: 'generation-engine',
          payload: { actionId: action.id, success: false, error: msg },
        });
      }
    }
    await this.runBlockingHooks(session, 'afterRollback', { actionCount: stack.length });
    await session.eventBus.emit({
      name: 'RollbackFinished',
      sessionId: session.sessionId,
      source: 'generation-engine',
      payload: { success: session.rollbackResults.every((result) => result.success) },
    });
  }

  private static resolveInsideTarget(resolvedTarget: string, relativePath: string): string {
    const destination = path.resolve(resolvedTarget, relativePath);
    const targetWithSeparator = resolvedTarget.endsWith(path.sep)
      ? resolvedTarget
      : `${resolvedTarget}${path.sep}`;
    if (destination !== resolvedTarget && !destination.startsWith(targetWithSeparator)) {
      throw new Error(`Unsafe generated path escaped project directory: ${relativePath}`);
    }
    return destination;
  }

  private static async runBlockingHooks(
    session: GenerationSession,
    hookPoint: HookPoint,
    data: Record<string, unknown>,
  ): Promise<void> {
    const result = await session.hookManager.run(hookPoint, {
      sessionId: session.sessionId,
      data,
      eventBus: session.eventBus,
      source: 'generation-engine',
    });
    if (result.cancelled) {
      throw new Error(result.cancellationReason ?? `Hook cancelled at ${hookPoint}.`);
    }
  }
}
