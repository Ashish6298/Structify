import { Command } from 'commander';
import { handleInit } from './init.js';
import { handleValidate } from './validate.js';
import { handleDoctor } from './doctor.js';
import { handleAdd } from './add.js';
import { handleInspect } from './inspect.js';
import { handleRepair } from './repair.js';
import { handleVerifyProject } from './verify-project.js';
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
      (commandInstance as Command & { context?: unknown }).context = context;

      const configObj = {
        ...options,
        projectName: projectName || undefined,
      };

      const wrapped = wrapAction('init', handleInit);
      await wrapped(configObj, commandInstance);
    });

  program
    .command('verify-project')
    .description(
      'Structurally validate a generated Structify project without installing dependencies',
    )
    .option('--path <path>', 'Project path to validate')
    .addHelpText('after', '\nExamples:\n  $ structify verify-project --path my-project')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('verify-project', handleVerifyProject);
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
    .description('Audit environment setup and workspace configuration files')
    .addHelpText('after', '\nExamples:\n  $ structify doctor\n  $ structify doctor --json')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('doctor', (_options, ctx) => handleDoctor(ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('add')
    .description('Add a module incrementally into an existing workspace')
    .argument('<moduleName>', 'Name of module (e.g. docker, eslint, prisma)')
    .addHelpText('after', '\nExamples:\n  $ structify add docker')
    .action(async (moduleName, options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('add', (_opts, ctx) => handleAdd(moduleName, ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('inspect')
    .description('Audit stacks used in current working directory')
    .addHelpText('after', '\nExamples:\n  $ structify inspect')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('inspect', (_opts, ctx) => handleInspect(ctx));
      await wrapped(options, commandInstance);
    });

  program
    .command('repair')
    .description('Fix configuration mismatches flagged by doctor command')
    .addHelpText('after', '\nExamples:\n  $ structify repair')
    .action(async (options, commandInstance) => {
      const globalOpts = program.opts();
      const context = createCLIContext(process.argv, { ...globalOpts, ...options });
      (commandInstance as Command & { context?: unknown }).context = context;

      const wrapped = wrapAction('repair', (_opts, ctx) => handleRepair(ctx));
      await wrapped(options, commandInstance);
    });
}
