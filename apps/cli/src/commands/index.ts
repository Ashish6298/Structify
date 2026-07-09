import { Command } from 'commander';
import { handleInit } from './init.js';
import { handleValidate } from './validate.js';
import { handleDoctor } from './doctor.js';
import { handleAdd } from './add.js';
import { handleInspect } from './inspect.js';
import { handleGraph } from './graph.js';
import { handleDeps } from './deps.js';
import { handleRepair } from './repair.js';
import { handleVerifyProject } from './verify-project.js';
import { handleUpgrade } from './upgrade.js';
import { handlePreset } from './preset.js';
import {
  handleBlueprint,
  handleExplainTemplate,
  handleGenerators,
  handlePlan,
  handlePreview,
  handleRender,
  handleTemplates,
  handleValidateTemplate,
} from './phase8.js';
import { handleHistory } from './history.js';
import { handleEnterpriseCommand } from './phase912.js';
import { createCLIContext } from '../context.js';
import { wrapAction } from '../utils/middleware.js';



export function registerCommands(program: Command): void {
  program
    .command('init')
    .description('Initialize a new project stack scaffolding')
    .argument('[projectName]', 'Name of the project directory')
    .option('-d, --dry-run', 'Generate the plan steps preview without writing files')
    .option('-c, --config <path>', 'Scaffold using a config file path')
    .option('-p, --preset <name>', 'Scaffold using a predefined configuration preset')
    .option('--preset-file <path>', 'Scaffold using a standalone preset file path')
    .option('-y, --yes', 'Use default configuration settings')
    .option('--force', 'Overwrite target directory even if non-empty')
    .option('--install', 'Run package manager dependency installation command')
    .option('--skip-install', 'Do not run dependency installation commands')
    .option('--event-log', 'Write a Structify session event log into the generated project')
    .option('--verify', 'Run offline structural validation after generation')
    .option('--output <path>', 'Choose output directory')
    .addHelpText(
      'after',
      '\nExamples:\n  $ structify init my-project\n  $ structify init my-project --dry-run\n  $ structify init --config structify.json',
    )
    .action(async (projectName, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      context.commandName = commandInstance.name();
      (commandInstance as Command & { context?: unknown }).context = context;

      const configObj = {
        ...options,
        projectName: projectName || undefined,
      };

      const wrapped = wrapAction('init', handleInit);
      await wrapped(configObj, commandInstance);
    });

  program
    .command('generate')
    .description('Initialize a new project stack scaffolding (alias for init)')
    .argument('[projectName]', 'Name of the project directory')
    .option('-d, --dry-run', 'Generate the plan steps preview without writing files')
    .option('-c, --config <path>', 'Scaffold using a config file path')
    .option('-p, --preset <name>', 'Scaffold using a predefined configuration preset')
    .option('--preset-file <path>', 'Scaffold using a standalone preset file path')
    .option('-y, --yes', 'Use default configuration settings')
    .option('--force', 'Overwrite target directory even if non-empty')
    .option('--install', 'Run package manager dependency installation command')
    .option('--skip-install', 'Do not run dependency installation commands')
    .option('--event-log', 'Write a Structify session event log into the generated project')
    .option('--verify', 'Run offline structural validation after generation')
    .option('--output <path>', 'Choose output directory')
    .addHelpText(
      'after',
      '\nExamples:\n  $ structify generate my-project\n  $ structify generate my-project --dry-run\n  $ structify generate --config structify.json',
    )
    .action(async (projectName, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      context.commandName = commandInstance.name();
      (commandInstance as Command & { context?: unknown }).context = context;

      const configObj = {
        ...options,
        projectName: projectName || undefined,
      };

      const wrapped = wrapAction('generate', handleInit);
      await wrapped(configObj, commandInstance);
    });

  program
    .command('verify-project')
    .description(
      'Structurally validate a generated Structify project without installing dependencies',
    )
    .option('--path <path>', 'Project path to validate')
    .option('--strict', 'Treat drift warnings as validation errors')
    .option('--ci', 'Run in CI mode (suppress decorative output, stable exit codes)')
    .option('--build', 'Perform generated project build checks')
    .addHelpText('after', '\nExamples:\n  $ structify verify-project --path my-project')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('verify-project', handleVerifyProject);
      await wrapped(options, commandInstance);
    });

  program
    .command('blueprint')
    .description('Inspect Phase 8 project blueprints')
    .argument('[action]', 'Action to perform: list or show', 'list')
    .argument('[blueprintId]', 'Blueprint id to resolve')
    .action(async (action, blueprintId, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('blueprint', (_opts, ctx) =>
        handleBlueprint(action, blueprintId, ctx),
      );
      await wrapped(options, commandInstance);
    });

  program
    .command('templates')
    .description('List or discover Phase 8 templates')
    .argument('[action]', 'Action to perform: list or discover', 'list')
    .option('--path <path>', 'Template registry path to discover')
    .action(async (action, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('templates', (_opts, ctx) =>
        handleTemplates(action, ctx, options),
      );
      await wrapped(options, commandInstance);
    });

  program
    .command('generators')
    .description('List Phase 8 artifact generators')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('generators', (_opts, ctx) => handleGenerators(ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('validate-template')
    .description('Validate Phase 8 templates before generation')
    .option('-c, --config <path>', 'Structify config path used as rendering context')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('validate-template', (_opts, ctx) =>
        handleValidateTemplate(ctx, options),
      );
      await wrapped(options, commandInstance);
    });

  program
    .command('explain-template')
    .description('Explain a Phase 8 template')
    .argument('[templateId]', 'Template id to explain')
    .action(async (templateId, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('explain-template', (_opts, ctx) =>
        handleExplainTemplate(templateId, ctx),
      );
      await wrapped(options, commandInstance);
    });

  program
    .command('preview')
    .description('Preview a deterministic Phase 8 generation plan')
    .option('-c, --config <path>', 'Structify config path used as rendering context')
    .option('--output <path>', 'Target output directory')
    .option('-d, --dry-run', 'Preview without writing files')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('preview', (_opts, ctx) => handlePreview(ctx, options));
      await wrapped(options, commandInstance);
    });

  program
    .command('plan')
    .description('Create a deterministic Phase 8 output plan')
    .option('-c, --config <path>', 'Structify config path used as rendering context')
    .option('--output <path>', 'Target output directory')
    .option('-d, --dry-run', 'Preview without writing files')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('plan', (_opts, ctx) => handlePlan(ctx, options));
      await wrapped(options, commandInstance);
    });

  program
    .command('render')
    .description('Render Phase 8 templates to stdout')
    .option('-c, --config <path>', 'Structify config path used as rendering context')
    .option('--template <id>', 'Render a single template id')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('render', (_opts, ctx) => handleRender(ctx, options));
      await wrapped(options, commandInstance);
    });

  const ENTERPRISE_CMD_DESCRIPTIONS: Record<string, string> = {
    registry: 'Manage connected enterprise module registries',
    install: 'Install custom modules from registry',
    uninstall: 'Uninstall stack modules from project',
    update: 'Update modules to latest compatible versions',
    search: 'Search registry for custom stack modules',
    publish: 'Publish local stack module to registry',
    'validate-workspace': 'Validate workspace configuration integrity',
    diagnose: 'Run workspace health check diagnostics',
    'explain-generation': 'Explain generation differences for template',
    'explain-merge': 'Analyze and explain git/file merge strategies',
    'explain-blueprint': 'Explain stack Blueprint configurations',
    'explain-hook': 'Inspect and explain lifecycle hook executions',
    'dependency-graph': 'Generate project package dependency graph',
    'template-graph': 'Generate local template dependency graph',
    'blueprint-graph': 'Generate project Blueprint dependency graph',
    'plugin-graph': 'Generate active plugins execution graph',
    'workspace-report': 'Generate comprehensive workspace status report',
    'export-report': 'Export diagnostic status reports to disk',
    profile: 'Profile execution performance of template build',
    benchmark: 'Run performance benchmark tests on generator',
    'clean-cache': 'Clean local template and artifact cache',
    'warm-cache': 'Pre-build and warm template build caches',
    migration: 'Preview or apply database migrations',
    rollback: 'Rollback workspace to previous snapshot',
    snapshot: 'Take a snapshot of current workspace files',
    restore: 'Restore workspace files from snapshot',
  };

  const enterpriseCommands = [
    'registry',
    'install',
    'uninstall',
    'update',
    'search',
    'publish',
    'validate-workspace',
    'diagnose',
    'explain-generation',
    'explain-merge',
    'explain-blueprint',
    'explain-hook',
    'dependency-graph',
    'template-graph',
    'blueprint-graph',
    'plugin-graph',
    'workspace-report',
    'export-report',
    'profile',
    'benchmark',
    'clean-cache',
    'warm-cache',
    'migration',
    'rollback',
    'snapshot',
    'restore',
  ];
  for (const enterpriseCommand of enterpriseCommands) {
    program
      .command(enterpriseCommand)
      .description(ENTERPRISE_CMD_DESCRIPTIONS[enterpriseCommand] || `Enterprise generation platform command: ${enterpriseCommand}`)
      .argument('[action]', 'Command action')
      .argument('[target]', 'Optional command target')
      .option('-d, --dry-run', 'Preview enterprise operation without writing files')
      .option('--interactive', 'Allow interactive resolution when supported')
      .option('--force', 'Allow intentional overwrite or cache refresh when supported')
      .option('-y, --yes', 'Apply without confirmation when supported')
      .option('--profile', 'Include profiling diagnostics')
      .option('--path <path>', 'Target path')
      .option('--output <path>', 'Report output path')
      .option('--query <query>', 'Search query')
      .action(async (action, target, options, commandInstance) => {
        const globalOpts = program.opts();
        const context = createCLIContext(process.argv, { ...globalOpts, ...options });
        (commandInstance as Command & { context?: unknown }).context = context;
        const wrapped = wrapAction(enterpriseCommand, (_opts, ctx) =>
          handleEnterpriseCommand(enterpriseCommand, action, target, ctx, options),
        );
        await wrapped(options, commandInstance);
      });
  }

  program
    .command('graph')
    .description('Render a clean Unicode architecture tree of the project directly in the terminal')
    .option('--path <path>', 'Project path to analyze')
    .option('--depth <depth>', 'Depth of the tree exploration', (val) => parseInt(val, 10))
    .option('--complete', 'Include all files in the architecture tree')
    .option('--architecture', 'Show only architectural files (default)')
    .option('--important', 'Display only files marked as important')
    .option('--md', 'Export the tree to PROJECT_STRUCTURE.md')
    .option('--output <path>', 'Write to a custom markdown file path')
    .addHelpText(
      'after',
      '\nExamples:\n  $ structify graph\n  $ structify graph --complete\n  $ structify graph --output docs/architecture.md',
    )
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;
      const wrapped = wrapAction('graph', (_opts, ctx) => handleGraph(options, ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('validate')
    .description('Validate a stack configuration file or example config')
    .option('-c, --config <path>', 'Path to structify.json config file')
    .option('-e, --example', 'Validate the built-in demo stack configuration')
    .addHelpText(
      'after',
      '\nExamples:\n  $ structify validate --config structify.json\n  $ structify validate --example',
    )
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('validate', handleValidate);
      await wrapped(options, commandInstance);
    });

  program
    .command('doctor')
    .description('Audit environment setup, project health, and workspace configuration')
    .option('--path <path>', 'Project path to diagnose (defaults to current directory)')
    .addHelpText(
      'after',
      '\nExamples:\n  $ structify doctor\n  $ structify doctor --json\n  $ structify doctor --path ./my-project',
    )
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('doctor', (_options, ctx) => handleDoctor(ctx, options));
      await wrapped(options, commandInstance);
    });

  program
    .command('add')
    .description('Add a module incrementally into an existing workspace')
    .argument('<moduleName>', 'Name of module (e.g. docker, eslint, prisma) or marketplace category (e.g. auth, payments, logging)')
    .option('-d, --dry-run', 'Preview module patch plan without writing files')
    .option('-y, --yes', 'Apply without confirmation')
    .option('--force', 'Allow intentional overwrites when conflicts are safe')
    .option('--path <path>', 'Project path to modify')
    .option('--database <database>', 'Database override for database modules')
    .addHelpText(
      'after',
      '\nMarketplace Categories:\n  auth, payments, logging, monitoring, cache, queue, email, storage, validation, analytics\n\nExamples:\n  $ structify add docker\n  $ structify add auth\n  $ structify add payments'
    )
    .action(async (moduleName, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('add', (opts, ctx) => handleAdd(moduleName, opts, ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('inspect')
    .description('Audit stacks used in current working directory')
    .option('--path <path>', 'Project path to inspect')
    .addHelpText('after', '\nExamples:\n  $ structify inspect')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('inspect', (opts, ctx) => handleInspect(opts, ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('deps')
    .description('Analyze project package dependencies and imports')
    .option('--path <path>', 'Project path to analyze')
    .addHelpText('after', '\nExamples:\n  $ structify deps\n  $ structify deps --json')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('deps', (opts, ctx) => handleDeps(opts, ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('repair')
    .description('Fix configuration mismatches flagged by doctor command')
    .option('-d, --dry-run', 'Preview repair plan without writing files')
    .option('--apply', 'Apply safe repairs')
    .option('-y, --yes', 'Apply without confirmation')
    .option('--force', 'Allow safe repair overwrites with backup metadata')
    .option('--path <path>', 'Project path to repair')
    .addHelpText('after', '\nExamples:\n  $ structify repair')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('repair', handleRepair);
      await wrapped(options, commandInstance);
    });

  program
    .command('upgrade')
    .description('Preview or apply safe Structify project upgrades')
    .option('-d, --dry-run', 'Preview upgrade plan without writing files')
    .option('-y, --yes', 'Apply safe metadata/package upgrades without confirmation')
    .option('--path <path>', 'Project path to upgrade')
    .addHelpText(
      'after',
      '\nExamples:\n  $ structify upgrade --dry-run\n  $ structify upgrade --json',
    )
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('upgrade', handleUpgrade);
      await wrapped(options, commandInstance);
    });

  program
    .command('preset')
    .description('Manage Structify configuration presets')
    .argument(
      '<action>',
      'Action to perform: list, show, path, validate, create, export, import, remove, rename, copy, edit, info',
    )
    .argument('[presetName]', 'Name of the configuration preset or file path')
    .argument('[extraArg]', 'Third target argument (destination file path, new name, etc.)')
    .addHelpText(
      'after',
      '\nExamples:\n  $ structify preset list\n  $ structify preset show next-postgres-tailwind\n  $ structify preset path',
    )
    .action(async (action, presetName, extraArg, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      context.commandName = commandInstance.name();
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('preset', (_opts, ctx) =>
        handlePreset(action, presetName, extraArg, ctx),
      );
      await wrapped(options, commandInstance);
    });

  program
    .command('history')
    .description('View persistent project history timeline')
    .option('--json', 'Render machine-readable JSON payloads')
    .option('--limit <num>', 'Limit the number of history logs displayed')
    .option('--since <date>', 'Display history logs after a specific timestamp')
    .option('--path <path>', 'Path to project root')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('history', (opts, ctx) => handleHistory(opts, ctx));
      await wrapped(options, commandInstance);
    });
}
