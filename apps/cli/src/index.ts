import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import { createCLIContext } from './context.js';
import { CLIOutput } from './utils/output.js';
import { StructifyCLIError } from './utils/error.js';
import { runCentralizedCleanup } from './utils/prompts.js';

async function main() {
  process.on('exit', () => {
    runCentralizedCleanup();
  });

  process.on('SIGINT', () => {
    runCentralizedCleanup();
    process.exit(130);
  });

  process.on('uncaughtException', (err) => {
    runCentralizedCleanup();
    console.error(err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    runCentralizedCleanup();
    console.error(reason);
    process.exit(1);
  });

  const program = new Command();

  program
    .name('structify')
    .description(
      'Professional platform for initializing, extending, and inspecting software architectures',
    )
    .version('1.0.0');

  // Register global options
  program
    .option('--verbose', 'Print additional diagnostic logs')
    .option('--debug', 'Enable debug output and stack traces')
    .option('--json', 'Render machine-readable JSON payloads')
    .option('--no-color', 'Omit colored console outputs')
    .option('--cwd <path>', 'Change context working directory');

  // Register commands
  registerCommands(program);

  // If no arguments, show custom welcome message instead of default help
  if (process.argv.length <= 2) {
    const context = createCLIContext(process.argv, {});
    const output = new CLIOutput(context);
    output.showStartupBanner();
    output.info('\nFor a list of all commands, run:');
    output.subheading('  $ structify --help');
    output.info('\nNext steps:');
    output.info('  - To test your environment:   $ structify doctor');
    output.info('  - To initialize a project:   $ structify init');
    process.exit(0);
  }

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    const globalOpts = program.opts();
    const context = createCLIContext(process.argv, globalOpts);
    const output = new CLIOutput(context);

    if (err instanceof StructifyCLIError) {
      output.error(`[${err.code}] ${err.message}`);
      if (context.debug && err.details) {
        console.error(err.details);
      }
      process.exit(1);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      output.error(`Unexpected execution failure: ${msg}`);
      if (context.debug) {
        console.error(err);
      }
      process.exit(1);
    }
  }
}

main();
