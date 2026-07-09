import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import { createCLIContext } from './context.js';
import { CLIOutput } from './utils/output.js';
import { StructifyCLIError } from './utils/error.js';
import { runCentralizedCleanup } from './utils/prompts.js';
import { getCliVersion } from './utils/version.js';

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
    .version(getCliVersion());

  // Register global options
  program
    .option('--verbose', 'Print additional diagnostic logs')
    .option('--debug', 'Enable debug output and stack traces')
    .option('--json', 'Render machine-readable JSON payloads')
    .option('--no-color', 'Omit colored console outputs')
    .option('--cwd <path>', 'Change context working directory');

  // Register commands
  registerCommands(program);

  // Configure beautiful help output
  program.configureHelp({
    formatHelp: () => {
      const context = createCLIContext(process.argv, {});
      return formatHelpScreen(program, context);
    },
  });

  // If no arguments, show custom welcome message instead of default help
  if (process.argv.length <= 2) {
    const context = createCLIContext(process.argv, {});
    const output = new CLIOutput(context);
    output.showWelcomeScreen();
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

const SETUP_WORKSPACE_CMDS = new Set(['init', 'generate', 'add', 'repair', 'preset', 'upgrade', 'validate']);
const INTELLIGENCE_AUDIT_CMDS = new Set(['doctor', 'inspect', 'deps', 'graph', 'verify-project']);
const TEMPLATING_ARTIFACT_CMDS = new Set(['templates', 'generators', 'validate-template', 'explain-template', 'preview', 'plan', 'render', 'blueprint']);

const REGISTRY_PACKAGE_CMDS = new Set(['registry', 'install', 'uninstall', 'update', 'search', 'publish']);
const GRAPH_VISUALIZATION_CMDS = new Set(['dependency-graph', 'template-graph', 'blueprint-graph', 'plugin-graph']);
const PERFORMANCE_REPORT_CMDS = new Set(['workspace-report', 'export-report', 'profile', 'benchmark', 'clean-cache', 'warm-cache']);
const STATE_MIGRATION_CMDS = new Set(['migration', 'rollback', 'snapshot', 'restore', 'history']);
const DIAGNOSTIC_EXPLAIN_CMDS = new Set(['validate-workspace', 'diagnose', 'explain-generation', 'explain-merge', 'explain-blueprint', 'explain-hook']);

function formatHelpScreen(program: Command, context: ReturnType<typeof createCLIContext>): string {
  const cyan = (text: string) => context.noColor ? text : `\x1b[36m${text}\x1b[0m`;
  const purple = (text: string) => context.noColor ? text : `\x1b[35m${text}\x1b[0m`;
  const bold = (text: string) => context.noColor ? text : `\x1b[1m${text}\x1b[0m`;
  const gray = (text: string) => context.noColor ? text : `\x1b[90m${text}\x1b[0m`;

  const lines: string[] = [];

  // 1. ASCII Art Header
  lines.push(cyan('╔══════════════════════════════════════════════════════════════════════════╗'));
  lines.push(cyan('  ███████╗████████╗██████╗ ██╗   ██╗ ██████╗████████╗██╗███████╗██╗   ██╗'));
  lines.push(cyan('  ██╔════╝╚══██╔══╝██╔══██╗██║   ██║██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝'));
  lines.push(cyan('  ███████╗   ██║   ██████╔╝██║   ██║██║        ██║   ██║█████╗   ╚████╔╝ '));
  lines.push(cyan('  ╚════██║   ██║   ██╔══██╗██║   ██║██║        ██║   ██║██╔══╝    ╚██╔╝  '));
  lines.push(cyan('  ███████║   ██║   ██║  ██║╚██████╔╝╚██████╗   ██║   ██║██║        ██║   '));
  lines.push(cyan('  ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ╚═════╝   ╚═╝   ╚═╝╚═╝        ╚═╝   '));
  lines.push(cyan('╚══════════════════════════════════════════════════════════════════════════╝'));
  lines.push('');

  // 2. Usage
  lines.push(`${cyan('◆')} ${bold('Usage:')} ${purple('structify')} ${gray('[options]')} ${cyan('[command]')}`);
  lines.push('');

  // 3. Global Options
  lines.push(`${gray('┌─')} ${bold('GLOBAL OPTIONS')} ${gray('───────────────────────────────────────┐')}`);
  lines.push(`${gray('│')} ${cyan('-V, --version')}     ${gray('Output the version number')}              ${gray('│')}`);
  lines.push(`${gray('│')} ${cyan('--verbose')}         ${gray('Print additional diagnostic logs')}       ${gray('│')}`);
  lines.push(`${gray('│')} ${cyan('--debug')}           ${gray('Enable debug output and stack traces')}    ${gray('│')}`);
  lines.push(`${gray('│')} ${cyan('--json')}            ${gray('Render machine-readable JSON payloads')}   ${gray('│')}`);
  lines.push(`${gray('│')} ${cyan('--no-color')}        ${gray('Omit colored console outputs')}            ${gray('│')}`);
  lines.push(`${gray('│')} ${cyan('--cwd <path>')}     ${gray('Change context working directory')}        ${gray('│')}`);
  lines.push(gray('└────────────────────────────────────────────────────────┘'));
  lines.push('');

  // Group all registered commands dynamically
  const setupGroup: string[] = [];
  const intelligenceGroup: string[] = [];
  const templatingGroup: string[] = [];
  const registryGroup: string[] = [];
  const graphGroup: string[] = [];
  const performanceGroup: string[] = [];
  const migrationGroup: string[] = [];
  const diagnosticGroup: string[] = [];
  const otherGroup: string[] = [];

  for (const cmd of program.commands) {
    const name = cmd.name();
    const desc = cmd.description() || '';
    const usage = cmd.usage() ? ` ${cmd.usage()}` : '';
    const cmdStr = name + usage;
    const paddedCmd = cmdStr.padEnd(20);
    const formattedLine = `${cyan(paddedCmd)} ${gray(desc)}`;

    if (SETUP_WORKSPACE_CMDS.has(name)) {
      setupGroup.push(formattedLine);
    } else if (INTELLIGENCE_AUDIT_CMDS.has(name)) {
      intelligenceGroup.push(formattedLine);
    } else if (TEMPLATING_ARTIFACT_CMDS.has(name)) {
      templatingGroup.push(formattedLine);
    } else if (REGISTRY_PACKAGE_CMDS.has(name)) {
      registryGroup.push(formattedLine);
    } else if (GRAPH_VISUALIZATION_CMDS.has(name)) {
      graphGroup.push(formattedLine);
    } else if (PERFORMANCE_REPORT_CMDS.has(name)) {
      performanceGroup.push(formattedLine);
    } else if (STATE_MIGRATION_CMDS.has(name)) {
      migrationGroup.push(formattedLine);
    } else if (DIAGNOSTIC_EXPLAIN_CMDS.has(name)) {
      diagnosticGroup.push(formattedLine);
    } else {
      otherGroup.push(formattedLine);
    }
  }

  // 4. Command Groups
  lines.push(bold('COMMANDS BY CATEGORY'));
  lines.push('');

  // Group 1: Workspace & Setup
  if (setupGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('SETUP & WORKSPACE')} ${gray('────────────────────────────────────╮')}`);
    for (const line of setupGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 2: Intelligence & Auditing
  if (intelligenceGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('INTELLIGENCE & AUDITING')} ${gray('──────────────────────────────╮')}`);
    for (const line of intelligenceGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 3: Core Templating & Generation
  if (templatingGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('TEMPLATING & ARTIFACTS')} ${gray('───────────────────────────────╮')}`);
    for (const line of templatingGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 4: Registry & Packages
  if (registryGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('REGISTRY & PACKAGES')} ${gray('──────────────────────────────────╮')}`);
    for (const line of registryGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 5: Visualization & Graphs
  if (graphGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('VISUALIZATION & GRAPHS')} ${gray('───────────────────────────────╮')}`);
    for (const line of graphGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 6: Workspace State & Migrations
  if (migrationGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('STATE & MIGRATIONS')} ${gray('───────────────────────────────────╮')}`);
    for (const line of migrationGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 7: Performance & Reports
  if (performanceGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('PERFORMANCE & REPORTS')} ${gray('────────────────────────────────╮')}`);
    for (const line of performanceGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 8: Deep Explanations & Diagnostics
  if (diagnosticGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('EXPLANATIONS & DIAGNOSTICS')} ${gray('───────────────────────────╮')}`);
    for (const line of diagnosticGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  // Group 9: Other Commands (Dynamic fallback)
  if (otherGroup.length > 0) {
    lines.push(`${gray('╭─')} ${bold('OTHER COMMANDS')} ${gray('───────────────────────────────────────╮')}`);
    for (const line of otherGroup) {
      lines.push(`${gray('│')} ${line}`);
    }
    lines.push(gray('╰────────────────────────────────────────────────────────╯'));
    lines.push('');
  }

  lines.push(`${gray('Run')} ${purple('structify help <command>')} ${gray('for custom command parameters')}`);
  lines.push('');

  return lines.join('\n');
}

main();

