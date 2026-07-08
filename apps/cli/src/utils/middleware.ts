import { Command } from 'commander';
import { CLIContext, createCLIContext } from '../context.js';
import { CLIOutput } from './output.js';
import { StructifyCLIError } from './error.js';

import { runCentralizedCleanup } from './prompts.js';

export type CommandAction<T> = (options: T, context: CLIContext) => Promise<void>;

export interface CommandMiddleware {
  name: string;
  before?: (context: CLIContext) => Promise<void>;
  after?: (context: CLIContext, durationMs: number) => Promise<void>;
}

const middlewares: CommandMiddleware[] = [
  {
    name: 'Timing & Lifecycle Logging',
    before: async (context) => {
      if (context.verbose) {
        console.log(`[TRACE] [Middleware] Starting command execution lifecycle.`);
      }
    },
    after: async (context, durationMs) => {
      if (context.verbose) {
        console.log(
          `[TRACE] [Middleware] Command execution finished. Duration: ${durationMs.toFixed(2)}ms`,
        );
      }
    },
  },
];

export function getElapsedMs(startTime: [number, number]): number {
  const diff = process.hrtime(startTime);
  return diff[0] * 1000 + diff[1] / 1000000;
}

export function wrapAction<T extends Record<string, unknown>>(
  commandName: string,
  action: CommandAction<T>,
) {
  return async (options: T, commandInstance: Command & { context?: CLIContext }) => {
    const program = commandInstance.parent;
    const globalOpts = program ? program.opts() : {};

    const context =
      commandInstance.context || createContextFromGlobalOptions({ ...globalOpts, ...options });

    const output = new CLIOutput(context);

    // Run Before Middlewares
    for (const mw of middlewares) {
      if (mw.before) await mw.before(context);
    }

    try {
      await action(options, context);
      const elapsed = getElapsedMs(context.startTime);

      // Run After Middlewares
      for (const mw of middlewares) {
        if (mw.after) await mw.after(context, elapsed);
      }
    } catch (err) {
      const elapsed = getElapsedMs(context.startTime);
      if (err instanceof StructifyCLIError) {
        if (context.json) {
          output.json({
            success: false,
            command: commandName,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            durationMs: elapsed,
            errors: [{ code: err.code, message: err.message }],
            warnings: [],
          });
        } else {
          output.error(`[${err.code}] ${err.message}`);
          if (context.debug && err.details) {
            console.error(err.details);
          }
        }
        process.exit(1);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        if (context.json) {
          output.json({
            success: false,
            command: commandName,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            durationMs: elapsed,
            errors: [{ code: 'INTERNAL_ERROR', message: msg }],
            warnings: [],
          });
        } else {
          output.error(`Unexpected execution failure: ${msg}`);
          if (context.debug) {
            console.error(err);
          }
        }
        process.exit(1);
      }
    } finally {
      runCentralizedCleanup();
    }
  };
}

function createContextFromGlobalOptions(opts: Record<string, unknown>): CLIContext {
  return createCLIContext(process.argv, opts);
}
