import path from 'path';
import readline from 'readline';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { getElapsedMs } from '../utils/middleware.js';
import { createModulePlan, executePatchPlan } from '@structify/core';

export interface AddOptions {
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
  path?: string;
  database?: 'postgres' | 'mongodb';
}

export async function handleAdd(
  moduleName: string | undefined,
  options: AddOptions,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Module Addition');

  if (!moduleName || moduleName.trim() === '') {
    throw new StructifyCLIError(
      'USAGE_ERROR',
      'Module name is required. Example: "structify add docker"',
    );
  }

  const projectPath = path.resolve(context.cwd, options.path ?? '.');
  const dryRun = options.dryRun === true;
  const modulePlan = createModulePlan(projectPath, moduleName, {
    force: options.force,
    dryRun,
    database: options.database,
  });
  const elapsed = getElapsedMs(context.startTime);

  if (
    modulePlan.code === 'MODULE_ALREADY_PRESENT' ||
    modulePlan.code === 'MODULE_INCOMPATIBLE' ||
    modulePlan.code === 'PATCH_CONFLICT' ||
    dryRun
  ) {
    if (context.json) {
      output.json({
        success:
          modulePlan.code === 'MODULE_PLAN_READY' || modulePlan.code === 'MODULE_ALREADY_PRESENT',
        command: 'add',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        durationMs: elapsed,
        code: modulePlan.code,
        warnings: modulePlan.code === 'PATCH_CONFLICT' ? modulePlan.suggestions : [],
        errors:
          modulePlan.code === 'MODULE_INCOMPATIBLE' || modulePlan.code === 'PATCH_CONFLICT'
            ? [{ code: modulePlan.code, message: modulePlan.message }]
            : [],
        data: { projectPath, ...modulePlan, dryRun, planOnly: true },
      });
      if (modulePlan.code === 'MODULE_INCOMPATIBLE' || modulePlan.code === 'PATCH_CONFLICT') {
        process.exitCode = 1;
      }
      return;
    }
    renderModulePlan(output, modulePlan, dryRun);
    if (modulePlan.code === 'MODULE_INCOMPATIBLE' || modulePlan.code === 'PATCH_CONFLICT') {
      throw new StructifyCLIError(modulePlan.code, modulePlan.message);
    }
    output.showFooter('add');
    return;
  }

  if (!options.yes && !(await confirmApply(`Apply module ${moduleName} to ${projectPath}?`))) {
    output.warn('Module addition cancelled. No files were changed.');
    return;
  }

  if (!modulePlan.plan) {
    throw new StructifyCLIError('INTERNAL_ERROR', 'Module plan was not produced.');
  }
  const result = executePatchPlan(projectPath, modulePlan.plan);
  if (context.json) {
    output.json({
      success: result.success,
      command: 'add',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: getElapsedMs(context.startTime),
      code: result.success ? 'MODULE_APPLIED' : 'PATCH_APPLY_FAILED',
      warnings: [],
      errors: result.errors,
      data: { projectPath, modulePlan, result },
    });
    if (!result.success) process.exitCode = 1;
    return;
  }

  if (!result.success) {
    output.error(
      `Module addition failed: ${result.errors.map((error) => error.message).join(', ')}`,
    );
    if (result.rollbackResults.length > 0) {
      output.warn(`Rollback executed for ${result.rollbackResults.length} operation(s).`);
    }
    throw new StructifyCLIError('CONFLICT_ERROR', 'Patch application failed.');
  }

  output.success(`Module ${modulePlan.moduleName} added.`);
  output.info(`Files changed: ${result.plan.filesChanged.length}`);
  output.info(`Dependencies changed: ${result.plan.dependencyChanges.length}`);
  output.showFooter('add');
}

function renderModulePlan(
  output: CLIOutput,
  modulePlan: ReturnType<typeof createModulePlan>,
  dryRun: boolean,
): void {
  output.info(`Status: ${modulePlan.code}`);
  output.info(`Module: ${modulePlan.moduleName}`);
  output.info(`Message: ${modulePlan.message}`);
  if (modulePlan.plan) {
    output.info(`Dry Run: ${dryRun ? 'yes' : 'no'}`);
    output.info(`Patch Operations: ${modulePlan.plan.operations.length}`);
    output.info(`Files Changed: ${modulePlan.plan.filesChanged.join(', ') || 'none'}`);
    output.info(`Dependency Changes: ${modulePlan.plan.dependencyChanges.length}`);
    output.info(`Migration Nodes: ${modulePlan.plan.migrationGraph.nodes.length}`);
  }
  for (const suggestion of modulePlan.suggestions) output.warn(suggestion);
}

async function confirmApply(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${question} (y/n) [Default: n]: `, (value) => resolve(value.trim().toLowerCase()));
  });
  rl.close();
  return answer === 'y' || answer === 'yes';
}
