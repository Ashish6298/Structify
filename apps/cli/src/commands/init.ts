import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createHash } from 'crypto';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import {
  InteractivePromptEngine,
  promptBooleanConfirmation,
  promptProjectNameInput,
  promptSetupTypeSelection,
  promptTemplateCategory,
  promptTemplateSelection,
  promptStylingSelection,
  promptKeyboardChoiceWithFallback,
  runInitWizardStateController,
  supportsKeyboardNavigation,
} from '../utils/prompts.js';
import {
  getTheme,
  renderGenerationPanel,
  renderSuccessSummaryPanel,
  renderNextStepsPanel,
} from '../utils/ui.js';
import { ConfigurationLoaderManager } from '../utils/loader.js';
import { getElapsedMs } from '../utils/middleware.js';
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
  appendHistoryEntry,
  PREDEFINED_TEMPLATES,
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
  const isInteractiveWizard =
    !options.config && !options.preset && !options.presetFile && !options.yes;
  if (!context.json && !isInteractiveWizard) {
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
  let wizardConfirmed = true;
  if (!options.config && !options.preset && !options.presetFile && !options.yes) {
    const { setupType, projectName, category, templateId, styling, confirmed } =
      await runInitWizardStateController(options.projectName || 'my-structify-app', context);
    if (setupType === 'predefined') {
      wizardConfirmed = !!confirmed;
    }

    if (setupType === 'custom') {
      const promptEngine = new InteractivePromptEngine();
      promptConfig = await promptEngine.run({ projectName });
    } else {
      const templateCategory = category as 'frontend' | 'backend';
      const template = PREDEFINED_TEMPLATES.find((item) => item.id === templateId);
      const stylingVal = styling || 'none';
      const backend = template?.defaultFramework || 'express';

      promptConfig = {
        projectName,
        mode: templateCategory === 'backend' ? 'backend-only' : 'frontend-only',
        templateId,
        stack: {
          frontend: templateCategory === 'backend' ? 'none' : 'next',
          styling: stylingVal,
          backend:
            templateCategory === 'backend'
              ? (backend as ProjectConfig['stack']['backend'])
              : 'none',
          database: 'none',
          orm: 'none',
          packageManager: 'npm',
        },
        tools: {
          docker: false,
          eslint: true,
          prettier: true,
          githubActions: false,
          git: true,
          editorconfig: true,
          husky: false,
          lintStaged: false,
          commitlint: false,
        },
      };
    }
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
  let projectSummary: string[];
  if (normalized.templateId) {
    const template = PREDEFINED_TEMPLATES.find((t) => t.id === normalized.templateId);
    const templateName = template?.name || normalized.templateId;
    const sections = getTemplateSections(normalized.templateId);
    projectSummary = formatTemplateProjectSummary(
      normalized,
      targetDir,
      install,
      templateName,
      sections,
    );
  } else {
    projectSummary = formatProjectSummary(normalized, targetDir, install);
  }

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

  if (!context.json && !selectedConfig.templateId) {
    output.info('');
    projectSummary.forEach((line) => output.info(line));
  }

  // Confirmation Wizard
  if (!options.yes && !options.config && !options.preset && !options.presetFile) {
    if (selectedConfig.templateId) {
      if (!wizardConfirmed) {
        output.info('Scaffolding execution aborted by user.');
        return;
      }
    } else {
      const confirmed = await promptBooleanConfirmation(
        '\nGenerate this project and write files to disk?',
        true,
        undefined,
        { confirmationLabel: 'Generate Project' },
      );
      if (!confirmed) {
        output.info('Scaffolding execution aborted by user.');
        return;
      }
    }
  }

  const isInteractiveTTY =
    !context.json &&
    !options.yes &&
    !options.config &&
    !options.preset &&
    !options.presetFile &&
    selectedConfig.templateId &&
    supportsKeyboardNavigation();

  let result;

  if (isInteractiveTTY) {
    const templateCategory = normalized.mode === 'backend-only' ? 'backend' : 'frontend';
    const finalCategoryLabel = templateCategory === 'backend' ? 'Backend' : 'Frontend';
    const template = PREDEFINED_TEMPLATES.find((item) => item.id === normalized.templateId);
    const templateLabel = template?.name || normalized.templateId || '';
    const stylingLabel =
      templateCategory === 'backend'
        ? 'None'
        : normalized.stack?.styling === 'tailwind'
          ? 'Tailwind CSS'
          : normalized.stack?.styling === 'mui'
            ? 'Material UI (MUI)'
            : 'None';

    const stages = [
      { id: 'validate', name: 'Validating configuration', status: 'running' as const },
      { id: 'plan', name: 'Planning project generation', status: 'pending' as const },
      { id: 'template', name: 'Copying template files', status: 'pending' as const },
      { id: 'render', name: 'Applying configuration', status: 'pending' as const },
      ...(install
        ? [{ id: 'deps', name: 'Installing dependencies', status: 'pending' as const }]
        : []),
      { id: 'finalize', name: 'Completing generation', status: 'pending' as const },
    ];

    let lastRenderedLines = 0;
    const renderProgress = () => {
      if (lastRenderedLines > 0) {
        readline.moveCursor(process.stdout, 0, -lastRenderedLines);
        readline.clearScreenDown(process.stdout);
      }
      const lines = renderGenerationPanel(
        normalized.projectName,
        templateLabel,
        finalCategoryLabel,
        stylingLabel,
        path.resolve(targetDir),
        stages,
        context.noColor,
      );
      process.stdout.write(lines.join('\n') + '\n');
      lastRenderedLines = lines.length;
    };

    renderProgress();

    const unsubscribe = session.eventBus.subscribeAll((event) => {
      let changed = false;
      const setStage = (id: string, status: 'running' | 'done') => {
        const stage = stages.find((s) => s.id === id);
        if (stage && stage.status !== status) {
          stage.status = status;
          changed = true;
        }
      };

      if (event.name === 'GenerationStarted') {
        setStage('validate', 'done');
        setStage('plan', 'running');
      } else if (event.name === 'PlanningFinished') {
        setStage('plan', 'done');
        setStage('template', 'running');
      } else if (event.name === 'TemplateRenderStarted') {
        setStage('template', 'done');
        setStage('render', 'running');
      } else if (event.name === 'DependencyResolutionStarted') {
        setStage('render', 'done');
        if (install) {
          setStage('deps', 'running');
        }
      } else if (event.name === 'DependencyResolved') {
        if (install) {
          setStage('deps', 'done');
        }
        setStage('finalize', 'running');
      }

      if (changed) {
        renderProgress();
      }
    });

    try {
      result = await GenerationEngine.execute(session, {
        install,
        force: options.force,
      });
      unsubscribe();
      stages.forEach((s) => (s.status = 'done'));
      renderProgress();
      if (lastRenderedLines > 0) {
        readline.moveCursor(process.stdout, 0, -lastRenderedLines);
        readline.clearScreenDown(process.stdout);
      }
    } catch (err) {
      unsubscribe();
      throw err;
    }
  } else {
    // Real Scaffolding Execution
    if (!context.json) {
      output.info('\nExecuting project scaffolding...');
    }

    result = await GenerationEngine.execute(session, {
      install,
      force: options.force,
    });
  }

  appendHistoryEntry(
    targetDir,
    {
      operation: context.commandName || 'init',
      status: result.success ? 'success' : 'failed',
      duration: result.durationMs,
      filesChanged: result.success ? result.generatedFiles : [],
      summary: 'Project Created',
      details: {
        config: selectedConfig,
      },
    },
    context.packageVersion,
  );

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

  if (validation) {
    if (!validation.valid) {
      output.warn(`Structural validation found ${validation.issues.length} issue(s).`);
    } else {
      output.success('Structural validation passed.');
    }
  }
  if (isInteractiveTTY) {
    const templateCategory = normalized.mode === 'backend-only' ? 'backend' : 'frontend';
    const finalCategoryLabel = templateCategory === 'backend' ? 'Backend' : 'Frontend';
    const template = PREDEFINED_TEMPLATES.find((item) => item.id === normalized.templateId);
    const templateLabel = template?.name || normalized.templateId || '';
    const stylingLabel =
      templateCategory === 'backend'
        ? 'None'
        : normalized.stack?.styling === 'tailwind'
          ? 'Tailwind CSS'
          : normalized.stack?.styling === 'mui'
            ? 'Material UI (MUI)'
            : 'None';

    const theme = getTheme(context.noColor);
    const successLines: string[] = [];

    // Branded success header
    successLines.push(`  ${theme.bold(theme.green('Project Generated Successfully'))}`);
    successLines.push('');

    // Summary panel
    const summaryLines = renderSuccessSummaryPanel(
      normalized.projectName,
      path.resolve(targetDir),
      templateLabel,
      finalCategoryLabel,
      stylingLabel,
      result.generatedFiles.length,
      result.durationMs,
      context.noColor,
    );
    successLines.push(...summaryLines);
    successLines.push('');

    // Next steps panel
    const nextStepsLines = renderNextStepsPanel(nextSteps, context.noColor);
    successLines.push(...nextStepsLines);
    successLines.push('');

    // Concise completion message and styled command timing
    const elapsed = getElapsedMs(context.startTime);
    successLines.push(`  ${theme.gray('Structify initialization wizard completed successfully.')}`);
    successLines.push(`  ${theme.gray('Terminal session is returning to normal.')}`);
    successLines.push(
      `  ${theme.green(`Command "init" completed successfully in ${elapsed.toFixed(2)}ms.`)}`,
    );
    successLines.push('');

    successLines.forEach((line) => output.info(line));
  } else {
    output.info('');
    if (normalized.templateId) {
      const template = PREDEFINED_TEMPLATES.find((t) => t.id === normalized.templateId);
      const templateName = template?.name || normalized.templateId;
      const sections = getTemplateSections(normalized.templateId);
      formatTemplateSuccessSummary(
        normalized,
        targetDir,
        result.generatedFiles.length,
        result.durationMs,
        templateName,
        sections,
      ).forEach((line) => output.info(line));
    } else {
      formatSuccessSummary(
        normalized,
        targetDir,
        result.generatedFiles.length,
        result.durationMs,
      ).forEach((line) => output.info(line));
    }

    output.showFooter('init');
  }
}

export function formatProjectSummary(
  config: NormalizedProjectConfig,
  targetDir: string,
  install: boolean,
): string[] {
  return [
    'Project Review',
    '',
    'Project',
    formatReviewRow('Name', config.projectName),
    formatReviewRow('Location', path.resolve(targetDir)),
    formatReviewRow('Mode', formatValue(config.mode)),
    '',
    'Stack',
    formatReviewRow('Frontend', formatValue(config.stack.frontend)),
    formatReviewRow('Backend', formatValue(config.stack.backend)),
    formatReviewRow('Styling', formatValue(config.stack.styling)),
    formatReviewRow('Database', formatValue(config.stack.database)),
    formatReviewRow('ORM', formatValue(config.stack.orm)),
    '',
    'Tooling',
    formatReviewRow('Package Manager', config.stack.packageManager),
    formatReviewRow('Docker', formatBoolean(config.tools.docker)),
    formatReviewRow('ESLint', formatBoolean(config.tools.eslint)),
    formatReviewRow('Prettier', formatBoolean(config.tools.prettier)),
    formatReviewRow('GitHub Actions', formatBoolean(config.tools.githubActions)),
    formatReviewRow('Install Deps', formatBoolean(install)),
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
    'Project Created Successfully',
    '',
    'Location',
    `  ${path.resolve(targetDir)}`,
    '',
    'Stack',
    `  ${formatStack(config)}`,
    '',
    'Generated',
    formatReviewRow('Files', String(generatedFileCount)),
    formatReviewRow('Duration', formatDuration(durationMs)),
    '',
    'Enabled Tools',
    `  ${formatEnabledTools(config)}`,
    '',
    'Next Steps',
    `  cd ${targetDir}`,
    '  npm install',
  ];

  if (scripts.dev) {
    lines.push('  npm run dev');
  }

  if (scripts['dev:web'] || scripts['dev:api']) {
    lines.push('', 'Additional Development Scripts');
    if (scripts['dev:web']) {
      lines.push('  npm run dev:web');
    }
    if (scripts['dev:api']) {
      lines.push('  npm run dev:api');
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

function formatReviewRow(label: string, value: string): string {
  return `  ${label.padEnd(16)} ${value}`;
}

function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  return `${durationMs}ms`;
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
    fastify: 'Fastify',
    hono: 'Hono',
    'node-auth': 'Node.js Auth API',
    frontend: 'Frontend',
    backend: 'Backend',
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

export function getTemplateSections(templateId: string): string[] {
  return (
    PREDEFINED_TEMPLATES.find((template) => template.id === templateId)?.sections || [
      'Default page skeleton',
    ]
  );
}

export function formatTemplateProjectSummary(
  config: NormalizedProjectConfig,
  targetDir: string,
  install: boolean,
  templateName: string,
  sections: string[],
): string[] {
  return [
    'Template Review',
    '',
    'Project',
    formatReviewRow('Name', config.projectName),
    formatReviewRow('Location', path.resolve(targetDir)),
    formatReviewRow('Setup Type', 'Predefined Template'),
    formatReviewRow(
      'Category',
      formatValue(config.mode === 'backend-only' ? 'backend' : 'frontend'),
    ),
    formatReviewRow('Template', templateName),
    '',
    'Stack',
    ...(config.mode === 'backend-only'
      ? [formatReviewRow('Backend', formatValue(config.stack.backend))]
      : [
          formatReviewRow('Frontend', formatValue(config.stack.frontend)),
          formatReviewRow('Styling', formatValue(config.stack.styling)),
        ]),
    formatReviewRow('Package Manager', config.stack.packageManager),
    '',
    'Tooling',
    formatReviewRow('Docker', formatBoolean(config.tools.docker)),
    formatReviewRow('ESLint', formatBoolean(config.tools.eslint)),
    formatReviewRow('Prettier', formatBoolean(config.tools.prettier)),
    formatReviewRow('Install Deps', formatBoolean(install)),
    '',
    'Generated Sections',
    ...sections.map((s) => `  - ${s}`),
  ];
}

export function formatTemplateSuccessSummary(
  config: NormalizedProjectConfig,
  targetDir: string,
  generatedFileCount: number,
  durationMs: number,
  templateName: string,
  sections: string[],
): string[] {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const scripts = readPackageScripts(packageJsonPath);
  const lines = [
    `Project Created Successfully (Template: ${templateName})`,
    '',
    'Location',
    `  ${path.resolve(targetDir)}`,
    '',
    'Stack',
    `  ${formatStack(config)}`,
    '',
    'Generated Sections',
    ...sections.map((s) => `  - ${s}`),
    '',
    'Generated',
    formatReviewRow('Files', String(generatedFileCount)),
    formatReviewRow('Duration', formatDuration(durationMs)),
    '',
    'Enabled Tools',
    `  ${formatEnabledTools(config)}`,
    '',
    'Next Steps',
    `  cd ${targetDir}`,
    '  npm install',
  ];

  if (scripts.dev) {
    lines.push('  npm run dev');
  }

  return lines;
}
