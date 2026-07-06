import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { InteractivePromptEngine } from '../utils/prompts.js';
import { ConfigurationLoaderManager } from '../utils/loader.js';
import {
  validateStack,
  createProjectPlan,
  NormalizedProjectConfig,
  ProjectConfig,
  GenerationSession,
  GenerationEngine,
  ExecutionGraph,
  VirtualFileGraph,
  ProjectDiffEngine,
  writeEventLog,
  createComposableGenerationPlan,
  validateGeneratedProject,
} from '@structify/core';

export interface InitOptions {
  projectName?: string;
  dryRun?: boolean;
  config?: string;
  preset?: string;
  yes?: boolean;
  force?: boolean;
  install?: boolean;
  skipInstall?: boolean;
  eventLog?: boolean;
  verify?: boolean;
  output?: string;
}

export async function handleInit(options: InitOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  if (!context.json) {
    output.heading('Structify Scaffolding Initialization');
  }

  let selectedConfig: ProjectConfig;

  // Configuration Resolver Phase
  if (options.config) {
    const manager = new ConfigurationLoaderManager();
    const result = await manager.loadAndValidate(options.config, context.cwd);
    if (!result.success || !result.data) {
      throw new StructifyCLIError(
        'VALIDATION_ERROR',
        `Configuration loader failed: ${result.error}`,
      );
    }
    selectedConfig = result.data;
  } else if (options.preset) {
    if (options.preset === 'next-postgres-tailwind') {
      selectedConfig = {
        projectName: options.projectName || 'next-postgres-tailwind-project',
        version: '1.0',
        stack: {
          frontend: 'next',
          backend: 'none',
          styling: 'tailwind',
          database: 'postgres',
          orm: 'prisma',
          packageManager: 'npm',
        },
        tools: {
          docker: true,
          eslint: true,
          prettier: true,
        },
      };
    } else {
      throw new StructifyCLIError(
        'USAGE_ERROR',
        `Predefined preset "${options.preset}" is not recognized.`,
      );
    }
  } else if (options.yes) {
    selectedConfig = {
      projectName: options.projectName || 'my-structify-project',
      version: '1.0',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'postgres',
        orm: 'prisma',
        packageManager: 'npm',
      },
      tools: {
        docker: false,
        eslint: true,
        prettier: true,
      },
    };
  } else {
    const promptEngine = new InteractivePromptEngine();
    selectedConfig = await promptEngine.run();
  }

  // Final Validation Check
  const validationResult = validateStack(selectedConfig);
  if (!validationResult.valid) {
    if (!context.json) {
      output.error('Configuration is invalid:');
      validationResult.errors.forEach((err) => {
        output.info(` - [${err.code}] ${err.message}`);
      });
    }
    throw new StructifyCLIError('VALIDATION_ERROR', 'Configuration validation failed.');
  }

  const normalized = validationResult.normalizedConfig as NormalizedProjectConfig;
  const projectName = selectedConfig.projectName || options.projectName || 'structify-app';
  const targetDir = path.resolve(context.cwd, options.output || projectName);
  const install = options.install === true && options.skipInstall !== true;

  // Build Execution Plan
  const plan = createProjectPlan(projectName, normalized);

  // Setup Generation Session
  const graph = new ExecutionGraph();
  for (const step of plan.steps) {
    graph.addNode(step, []);
  }

  const session = new GenerationSession({
    config: normalized,
    context,
    graph,
    dryRun: options.dryRun === true,
    jsonMode: context.json,
    targetDir,
  });
  const nextSteps = [
    `cd ${targetDir}`,
    install ? 'npm run dev' : `${normalized.stack.packageManager} install && npm run dev`,
  ];

  if (options.dryRun) {
    const composablePlan = createComposableGenerationPlan(normalized);
    const dryRunGraph = new VirtualFileGraph();
    for (const file of composablePlan.files) {
      dryRunGraph.addFile({
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
    dryRunGraph.validate();
    const diff = ProjectDiffEngine.compare(dryRunGraph, targetDir);
    const result = await GenerationEngine.execute(session, {
      install: false,
      force: options.force,
    });
    if (context.json) {
      const { events, ...jsonResult } = result;
      output.json({
        ...jsonResult,
        ...(context.verbose || context.debug ? { events } : {}),
        nextSteps,
        data: {
          config: normalized,
          plan,
          graph: {
            fileCount: dryRunGraph.list().length,
            files: dryRunGraph.list().map((file) => file.targetPath),
          },
          dependencyGraph: {
            packageManager: normalized.stack.packageManager,
            installByDefault: false,
            resolved: composablePlan.dependencyGraph.resolved,
            diagnostics: composablePlan.dependencyGraph.diagnostics,
          },
          projectGraph: composablePlan.projectGraph,
          analytics: composablePlan.analytics,
          diff,
        },
      });
      return;
    }

    output.success('Configuration is valid (dry-run).');
    output.info(`Project Name: ${projectName}`);
    output.divider();
    output.subheading('[EXECUTION PLAN PREVIEW]\n');
    output.info('Planned Execution Steps:');
    plan.steps.forEach((step, index) => {
      output.info(`  ${index + 1}. [${step.type}] ${step.description}`);
    });
    output.info(`Virtual Files: ${dryRunGraph.list().length}`);
    output.info(`Generators: ${composablePlan.generators.length}`);
    output.info(`Dependencies: ${composablePlan.dependencyGraph.resolved.length}`);
    output.info(`Diff Summary: ${JSON.stringify(diff.summary)}`);
    if (diff.hasConflicts) {
      output.warn('Conflicts detected. Use --force only when overwrites are intentional.');
    }
    output.divider();
    output.warn('Note: Dry-run mode. No application files or folders were created.');
    output.showFooter('init');
    return;
  }

  // Confirmation Wizard
  if (!options.yes && !options.config && !options.preset) {
    const confirmAns = await new Promise<string>((res) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(
        '\nDo you want to proceed with project scaffolding? (y/n) [Default: y]: ',
        (answer) => {
          rl.close();
          res(answer.trim().toLowerCase());
        },
      );
    });
    if (confirmAns !== '' && !confirmAns.startsWith('y')) {
      output.info('Scaffolding execution aborted by user.');
      return;
    }
  }

  // Real Scaffolding Execution
  if (!context.json) {
    output.info('\nExecuting project scaffolding...');
  }

  const result = await GenerationEngine.execute(session, {
    install,
    force: options.force,
  });

  if (options.eventLog && result.success) {
    const eventLogDir = path.join(targetDir, '.structify');
    fs.mkdirSync(eventLogDir, { recursive: true });
    writeEventLog(path.join(eventLogDir, 'events.ndjson'), session.eventBus.getHistory());
  }

  const validation =
    options.verify && result.success ? validateGeneratedProject(targetDir) : undefined;

  if (context.json) {
    const { events, ...jsonResult } = result;
    output.json({
      ...jsonResult,
      ...(context.verbose || context.debug ? { events } : {}),
      projectPath: path.resolve(targetDir),
      nextSteps,
      ...(validation ? { projectValidation: validation } : {}),
    });
    return;
  }

  if (!result.success) {
    output.error(`Scaffolding failed: ${(result.errors as string[]).join(', ')}`);
    if ((result.rollbackActions as string[]).length > 0) {
      output.warn(`Rollback executed: ${(result.rollbackActions as string[]).join(', ')}`);
    }
    throw new StructifyCLIError(
      'INTERNAL_ERROR',
      'Scaffolding execution failed. Workspace rolled back.',
    );
  }

  // Optionally export config to file
  if (!options.yes && !options.config && !options.preset) {
    const configExportPath = path.join(context.cwd, 'structify.config.json');
    try {
      fs.writeFileSync(configExportPath, JSON.stringify(selectedConfig, null, 2), 'utf8');
      output.success(`Configuration file exported to: ${configExportPath}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      output.error(`Failed to export config: ${message}`);
    }
  }

  output.success('\nProject generated successfully!');
  output.info(`Generated Files: ${result.generatedFiles.length}`);
  output.info(`Duration: ${result.durationMs}ms`);
  if (validation) {
    if (!validation.valid) {
      output.warn(`Structural validation found ${validation.issues.length} issue(s).`);
    } else {
      output.success('Structural validation passed.');
    }
  }
  output.info(`Location: ${path.resolve(targetDir)}`);
  output.info('\nNext Steps:');
  output.info(`  1. cd ${targetDir}`);
  if (!install) {
    output.info(`  2. ${normalized.stack.packageManager} install`);
    output.info(`  3. npm run dev`);
  } else {
    output.info(`  2. npm run dev`);
  }

  output.showFooter('init');
}
