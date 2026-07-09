import path from 'path';
import readline from 'readline';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { getElapsedMs } from '../utils/middleware.js';
import {
  createModulePlan,
  executePatchPlan,
  detectStack,
  getIntegrationsForCategory,
  buildIntegrationPatchPlan,
  readProjectState,
  CATEGORIES_LIST,
  appendHistoryEntry
} from '@structify/core';

export interface AddOptions {
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
  path?: string;
  database?: 'postgres' | 'mongodb';
}

async function promptChoice(
  question: string,
  choices: { id: string; name: string }[],
  rl: readline.Interface
): Promise<string> {
  return new Promise((resolve) => {
    console.log(`\n${question}`);
    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}) ${choice.name}`);
    });
    
    const ask = () => {
      rl.question(`\nSelect an option [1-${choices.length}]: `, (answer) => {
        const num = parseInt(answer.trim(), 10);
        if (num >= 1 && num <= choices.length) {
          resolve(choices[num - 1].id);
        } else {
          console.log(`Invalid choice. Please enter a number between 1 and ${choices.length}.`);
          ask();
        }
      });
    };
    ask();
  });
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
      'Module name or category is required. Example: "structify add auth" or "structify add docker"',
    );
  }

  const projectPath = path.resolve(context.cwd, options.path ?? '.');
  const dryRun = options.dryRun === true;

  const lowerName = moduleName.toLowerCase().trim();
  if (CATEGORIES_LIST.includes(lowerName)) {
    // 1. Detect project stack
    const detection = detectStack(projectPath);
    if (!detection.success) {
      throw new StructifyCLIError('STACK_DETECTION_FAILED', detection.error || 'Failed to detect project stack.');
    }
    const stack = detection.detectedStack;
    output.info(`Detected stack - Frontend: ${stack.frontend}, Backend: ${stack.backend}`);

    // 2. Fetch available integrations
    const integrations = getIntegrationsForCategory(lowerName, stack);
    if (integrations.length === 0) {
      throw new StructifyCLIError(
        'MODULE_INCOMPATIBLE',
        `No compatible marketplace integrations found for category "${moduleName}" on stack: ${stack.frontend}/${stack.backend}.`,
      );
    }

    // 3. Choose integration
    let selectedIntegration = integrations[0];
    if (integrations.length > 1) {
      if (options.yes) {
        selectedIntegration = integrations[0];
      } else {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const selectedId = await promptChoice(
          `Available integrations for category "${moduleName}":`,
          integrations.map((i) => ({ id: i.id, name: i.name })),
          rl,
        );
        rl.close();
        try {
          process.stdin.pause();
        } catch {
          // ignore
        }
        const found = integrations.find((i) => i.id === selectedId);
        if (found) selectedIntegration = found;
      }
    }

    output.success(`Selected Integration: ${selectedIntegration.name}`);
    output.info(`- Compatibility: Frontend: ${selectedIntegration.compatibility.frontends.join(', ')}, Backend: ${selectedIntegration.compatibility.backends.join(', ')}`);
    output.info(`- Dependencies: ${selectedIntegration.dependencies.join(', ')}`);
    if (selectedIntegration.envVars.length > 0) {
      output.info(`- Environment Variables: ${selectedIntegration.envVars.map((v) => v.key).join(', ')}`);
    }
    output.info(`- Documentation: ${selectedIntegration.docsLink}`);

    // 4. Build integration patch plan
    const state = readProjectState(projectPath);
    const plan = buildIntegrationPatchPlan(projectPath, selectedIntegration, state);

    if (plan.conflicts.length > 0) {
      output.warn(`Patch conflicts detected:`);
      for (const conflict of plan.conflicts) {
        output.error(`- ${conflict.message}`);
      }
      if (!options.force) {
        appendHistoryEntry(projectPath, {
          operation: 'add',
          status: 'failed',
          duration: getElapsedMs(context.startTime),
          filesChanged: [],
          summary: `Added ${selectedIntegration.name}`,
        }, context.packageVersion);
        throw new StructifyCLIError('PATCH_CONFLICT', 'Integration addition aborted due to conflicts. Run with --force to overwrite.');
      }
    }

    // Print preview plan details
    output.subheading('\nPreview Plan:');
    output.info(`- Files to generate: ${plan.operations.filter((op) => op.type === 'create-file').map((op) => op.targetPath).join(', ') || 'none'}`);
    output.info(`- Files to modify: ${plan.operations.filter((op) => op.type !== 'create-file').map((op) => op.targetPath).join(', ') || 'none'}`);
    output.info(`- Dependencies to add: ${plan.dependencyChanges.map((c) => c.name).join(', ') || 'none'}`);

    if (dryRun) {
      output.info('\n[Dry Run] Integration plan generated successfully.');
      output.showFooter('add');
      return;
    }

    // 5. Confirm and Apply
    if (!options.yes && !(await confirmApply(`Apply integration ${selectedIntegration.name}?`))) {
      output.warn('Integration addition cancelled. No files were changed.');
      return;
    }

    const result = executePatchPlan(projectPath, plan);
    appendHistoryEntry(projectPath, {
      operation: 'add',
      status: result.success ? 'success' : 'failed',
      duration: getElapsedMs(context.startTime),
      filesChanged: result.success ? result.appliedOperations.map((op) => op.targetPath) : [],
      summary: `Added ${selectedIntegration.name}`,
    }, context.packageVersion);
    if (!result.success) {
      output.error(`Integration installation failed: ${result.errors.map((e) => e.message).join(', ')}`);
      if (result.rollbackResults.length > 0) {
        output.warn(`Rollback executed for ${result.rollbackResults.length} operation(s).`);
      }
      throw new StructifyCLIError('CONFLICT_ERROR', 'Patch application failed.');
    }

    output.success(`Integration "${selectedIntegration.name}" successfully added to project.`);
    output.showFooter('add');
    return;
  }

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
      appendHistoryEntry(projectPath, {
        operation: 'add',
        status: 'failed',
        duration: elapsed,
        filesChanged: [],
        summary: `Added ${moduleName ? moduleName.charAt(0).toUpperCase() + moduleName.slice(1) : 'Module'}`,
      }, context.packageVersion);
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
  appendHistoryEntry(projectPath, {
    operation: 'add',
    status: result.success ? 'success' : 'failed',
    duration: getElapsedMs(context.startTime),
    filesChanged: result.success ? result.appliedOperations.map((op) => op.targetPath) : [],
    summary: `Added ${modulePlan.moduleName.charAt(0).toUpperCase() + modulePlan.moduleName.slice(1)}`,
  }, context.packageVersion);
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
  try {
    process.stdin.pause();
  } catch (e) {
    // ignore
  }
  return answer === 'y' || answer === 'yes';
}
