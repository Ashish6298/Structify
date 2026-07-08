import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { InteractivePromptEngine, promptBooleanConfirmation } from '../utils/prompts.js';
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
  PresetManager,
  PresetManifestMetadata,
} from '@structify/core';

export interface InitOptions {
  projectName?: string;
  dryRun?: boolean;
  config?: string;
  preset?: string;
  presetFile?: string;
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

  const presetManager = new PresetManager(context.cwd);
  const STRUCTIFY_DEFAULTS: Partial<ProjectConfig> = {
    version: '1.0',
    language: 'typescript',
    stack: {
      frontend: 'none',
      backend: 'none',
      styling: 'none',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: {
      docker: false,
      eslint: false,
      prettier: false,
      githubActions: false,
      git: false,
      editorconfig: false,
      husky: false,
      lintStaged: false,
      commitlint: false,
    },
  };

  let presetConfig: Partial<ProjectConfig> = {};
  let presetMeta: Record<string, unknown> | undefined = undefined;

  if (options.preset) {
    try {
      const preset = await presetManager.getPreset(options.preset);
      presetConfig = preset.config;
      const presetsList = await presetManager.listPresets();
      const origin = presetsList.find((p) => p.name === options.preset)?.origin || 'built-in';
      presetMeta = {
        name: preset.meta.name,
        version: preset.meta.version,
        source: origin,
        schemaVersion: preset.meta.schemaVersion,
        creationTimestamp: preset.meta.creationTimestamp || new Date().toISOString(),
        presetHash: createHash('sha256').update(JSON.stringify(preset)).digest('hex'),
      };
      if (!context.json) {
        output.info(`Loaded preset "${options.preset}" from [${origin}]`);
      }
    } catch (e) {
      const err = e as Error;
      const msg = err.message || String(err);
      const code = msg.includes('PRESET_SCHEMA_INVALID')
        ? 'PRESET_SCHEMA_INVALID'
        : 'PRESET_NOT_FOUND';
      throw new StructifyCLIError(code, msg);
    }
  } else if (options.presetFile) {
    try {
      const preset = presetManager.loadStandalonePreset(options.presetFile);
      presetConfig = preset.config;
      presetMeta = {
        name: preset.meta.name,
        version: preset.meta.version,
        source: 'standalone',
        schemaVersion: preset.meta.schemaVersion,
        creationTimestamp: preset.meta.creationTimestamp || new Date().toISOString(),
        presetHash: createHash('sha256').update(JSON.stringify(preset)).digest('hex'),
      };
      if (!context.json) {
        output.info(`Loaded standalone preset file from ${options.presetFile}`);
      }
    } catch (e) {
      const err = e as Error;
      const msg = err.message || String(err);
      const code = msg.includes('PRESET_SCHEMA_INVALID')
        ? 'PRESET_SCHEMA_INVALID'
        : 'PRESET_NOT_FOUND';
      throw new StructifyCLIError(code, msg);
    }
  }

  let fileConfig: Partial<ProjectConfig> = {};
  if (options.config) {
    const loader = new ConfigurationLoaderManager();
    const result = await loader.loadAndValidate(options.config, context.cwd);
    if (!result.success || !result.data) {
      throw new StructifyCLIError(
        'VALIDATION_ERROR',
        `Configuration loader failed: ${result.error}`,
      );
    }
    fileConfig = result.data;
    if (!context.json) {
      output.info(`Merged configuration overrides from file: ${options.config}`);
    }
  }

  let promptConfig: Partial<ProjectConfig> = {};
  if (!options.config && !options.preset && !options.presetFile && !options.yes) {
    const promptEngine = new InteractivePromptEngine();
    promptConfig = await promptEngine.run({ projectName: options.projectName });
  } else if (options.yes) {
    promptConfig = {
      projectName: options.projectName || (options.config ? undefined : 'my-structify-project'),
      tools: {
        docker: false,
        eslint: true,
        prettier: true,
      },
    };
    if (!options.config && !options.preset && !options.presetFile) {
      promptConfig.stack = {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'postgres',
        orm: 'prisma',
        packageManager: 'npm',
      };
    }
  }

  // Merging Order: defaults -> preset -> config file -> CLI / Wizard / defaults overrides
  const selectedConfig = PresetManager.mergeConfiguration(
    STRUCTIFY_DEFAULTS,
    presetConfig,
    fileConfig,
    promptConfig,
  );

  // Command-line overrides take precedence
  if (options.projectName) {
    if (
      !context.json &&
      selectedConfig.projectName &&
      selectedConfig.projectName !== options.projectName
    ) {
      output.warn(
        `Overriding preset/config project name "${selectedConfig.projectName}" with CLI argument "${options.projectName}"`,
      );
    }
    selectedConfig.projectName = options.projectName;
  }
  if (!selectedConfig.projectName) {
    selectedConfig.projectName = 'structify-app';
  }

  if (presetMeta) {
    selectedConfig.preset = {
      ...presetMeta,
      configHash: createHash('sha256').update(JSON.stringify(selectedConfig.stack)).digest('hex'),
    } as PresetManifestMetadata;
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
  const projectSummary = formatProjectSummary(normalized, targetDir, install);

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
  const nextSteps = [`cd ${targetDir}`, install ? 'npm run dev' : 'npm install && npm run dev'];

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
    const plannedGraph = {
      fileCount: dryRunGraph.list().length,
      files: dryRunGraph.list().map((file) => file.targetPath),
    };
    if (context.json) {
      const { events, ...jsonResult } = result;
      output.json({
        ...jsonResult,
        command: context.commandName || 'init',
        ...(context.commandName === 'generate' ? { aliasFor: 'init' } : {}),
        ...(context.verbose || context.debug ? { events } : {}),
        nextSteps,
        generatedFiles: [],
        plannedFiles: plannedGraph.files,
        virtualFileGraph: plannedGraph,
        diff,
        projectGraph: composablePlan.projectGraph,
        dependencyGraph: composablePlan.dependencyGraph,
        analytics: composablePlan.analytics,
        data: {
          config: normalized,
          plan,
          graph: plannedGraph,
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
    output.info(`Planned Virtual Files: ${dryRunGraph.list().length}`);
    output.info(`Generated Files: 0 (dry-run)`);
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

  if (!context.json) {
    output.divider();
    output.subheading('Project Summary');
    projectSummary.forEach((line) => output.info(line));
  }

  // Confirmation Wizard
  if (!options.yes && !options.config && !options.preset && !options.presetFile) {
    const confirmed = await promptBooleanConfirmation(
      '\nGenerate this project and write files to disk?',
      true,
    );
    if (!confirmed) {
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
    if (!result.success) {
      const classified = classifyGenerationFailure(result.errors);
      output.json({
        ...jsonResult,
        command: context.commandName || 'init',
        ...(context.commandName === 'generate' ? { aliasFor: 'init' } : {}),
        success: false,
        ...(context.verbose || context.debug ? { events } : {}),
        projectPath: path.resolve(targetDir),
        nextSteps,
        errors: [{ code: classified.code, message: classified.message }],
      });
      process.exit(1);
    }
    output.json({
      ...jsonResult,
      command: context.commandName || 'init',
      ...(context.commandName === 'generate' ? { aliasFor: 'init' } : {}),
      ...(context.verbose || context.debug ? { events } : {}),
      projectPath: path.resolve(targetDir),
      nextSteps,
      ...(validation ? { projectValidation: validation } : {}),
    });
    return;
  }

  if (!result.success) {
    const classified = classifyGenerationFailure(result.errors);
    output.error(`Scaffolding failed: ${classified.message}`);
    if ((result.rollbackActions as string[]).length > 0) {
      output.warn(`Rollback executed: ${(result.rollbackActions as string[]).join(', ')}`);
    }
    throw new StructifyCLIError(classified.code, classified.suggestion);
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

  output.success('\nProject generated successfully.');
  if (validation) {
    if (!validation.valid) {
      output.warn(`Structural validation found ${validation.issues.length} issue(s).`);
    } else {
      output.success('Structural validation passed.');
    }
  }
  output.divider();
  output.subheading('Generation Summary');
  formatSuccessSummary(
    normalized,
    targetDir,
    result.generatedFiles.length,
    result.durationMs,
  ).forEach((line) => output.info(line));

  output.showFooter('init');
}

export function formatProjectSummary(
  config: NormalizedProjectConfig,
  targetDir: string,
  install: boolean,
): string[] {
  return [
    `Project name: ${config.projectName}`,
    `Output path: ${path.resolve(targetDir)}`,
    `Project mode: ${formatValue(config.mode)}`,
    `Frontend framework: ${formatValue(config.stack.frontend)}`,
    `Backend framework: ${formatValue(config.stack.backend)}`,
    `Styling library: ${formatValue(config.stack.styling)}`,
    `Database: ${formatValue(config.stack.database)}`,
    `ORM: ${formatValue(config.stack.orm)}`,
    `Package manager: ${config.stack.packageManager}`,
    `Docker: ${formatBoolean(config.tools.docker)}`,
    `ESLint: ${formatBoolean(config.tools.eslint)}`,
    `Prettier: ${formatBoolean(config.tools.prettier)}`,
    `GitHub Actions: ${formatBoolean(config.tools.githubActions)}`,
    `Install dependencies: ${formatBoolean(install)}`,
  ];
}

export function formatSuccessSummary(
  config: NormalizedProjectConfig,
  targetDir: string,
  generatedFileCount: number,
  durationMs: number,
): string[] {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const scripts = readPackageScripts(packageJsonPath);
  const lines = [
    `Location: ${path.resolve(targetDir)}`,
    `Stack: ${formatStack(config)}`,
    `Generated files: ${generatedFileCount}`,
    `Duration: ${durationMs}ms`,
    `Enabled tools: ${formatEnabledTools(config)}`,
    '',
    'Next commands:',
    `  1. cd ${targetDir}`,
    '  2. npm install',
  ];

  if (scripts.dev) {
    lines.push('  3. npm run dev');
  }

  if (scripts['dev:web'] || scripts['dev:api']) {
    lines.push('', 'Additional development scripts:');
    if (scripts['dev:web']) {
      lines.push('  - npm run dev:web');
    }
    if (scripts['dev:api']) {
      lines.push('  - npm run dev:api');
    }
  }

  return lines;
}

function readPackageScripts(packageJsonPath: string): Record<string, string> {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    return packageJson.scripts || {};
  } catch {
    return {};
  }
}

function formatStack(config: NormalizedProjectConfig): string {
  const parts = [
    formatValue(config.stack.frontend),
    formatValue(config.stack.backend),
    formatValue(config.stack.styling),
    formatValue(config.stack.database),
    formatValue(config.stack.orm),
  ].filter((value) => value !== 'None');
  return parts.length > 0 ? parts.join(' + ') : 'No application stack selected';
}

function formatEnabledTools(config: NormalizedProjectConfig): string {
  const enabled = [
    config.tools.docker ? 'Docker' : undefined,
    config.tools.eslint ? 'ESLint' : undefined,
    config.tools.prettier ? 'Prettier' : undefined,
    config.tools.githubActions ? 'GitHub Actions' : undefined,
  ].filter(Boolean);
  return enabled.length > 0 ? enabled.join(', ') : 'None';
}

function formatBoolean(value: boolean): string {
  return value ? 'Enabled' : 'Disabled';
}

function formatValue(value: string): string {
  const labels: Record<string, string> = {
    next: 'Next.js',
    'vite-react': 'React (Vite)',
    express: 'Express',
    nest: 'NestJS',
    tailwind: 'Tailwind CSS',
    mui: 'Material UI',
    postgres: 'PostgreSQL',
    mongodb: 'MongoDB',
    prisma: 'Prisma',
    mongoose: 'Mongoose',
    none: 'None',
    'frontend-only': 'Frontend Only',
    'backend-only': 'Backend Only',
    fullstack: 'Fullstack',
  };
  return labels[value] || value;
}

function classifyGenerationFailure(errors: string[]): {
  code: 'TARGET_DIRECTORY_NOT_EMPTY' | 'CONFLICT_ERROR' | 'INTERNAL_ERROR';
  message: string;
  suggestion: string;
} {
  const message = errors.join(', ') || 'Scaffolding execution failed.';
  if (message.includes('exists and is not empty')) {
    return {
      code: 'TARGET_DIRECTORY_NOT_EMPTY',
      message,
      suggestion:
        'Target directory is not empty. Choose an empty output directory, remove existing files, or rerun with --force when overwrites are intentional.',
    };
  }
  if (message.toLowerCase().includes('conflict')) {
    return {
      code: 'CONFLICT_ERROR',
      message,
      suggestion: 'Resolve the reported conflict and rerun Structify.',
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    message,
    suggestion: 'Scaffolding execution failed. Workspace rolled back.',
  };
}
