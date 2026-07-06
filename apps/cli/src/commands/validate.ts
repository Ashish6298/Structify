import fs from 'fs';
import path from 'path';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { validateStack, ProjectConfig } from '@structify/core';
import { getElapsedMs } from '../utils/middleware.js';

export interface ValidateOptions {
  config?: string;
  example?: boolean;
}

export async function handleValidate(options: ValidateOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Configuration Validation');

  let configToValidate: unknown = null;

  if (options.example) {
    configToValidate = {
      projectName: 'my-structify-example',
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
        git: true,
      },
    };
    output.info('Validating built-in example configuration...');
  } else if (options.config) {
    const configPath = path.resolve(context.cwd, options.config);
    if (!fs.existsSync(configPath)) {
      throw new StructifyCLIError(
        'MISSING_FILE_ERROR',
        `Configuration file not found: ${options.config}`,
      );
    }
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      configToValidate = JSON.parse(content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new StructifyCLIError('VALIDATION_ERROR', `Failed to parse config file JSON: ${msg}`);
    }
  } else {
    throw new StructifyCLIError(
      'USAGE_ERROR',
      'Please specify a configuration path using "--config <path>" or use "--example" to check the built-in demo configuration.',
    );
  }

  const result = validateStack(configToValidate as ProjectConfig);
  const elapsed = getElapsedMs(context.startTime);

  if (context.json) {
    output.json({
      success: result.valid,
      command: 'validate',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      warnings: result.warnings,
      errors: result.errors.map((e) => ({ code: e.code, message: e.message })),
      data: { normalizedConfig: result.normalizedConfig },
    });
    if (!result.valid) {
      process.exit(1);
    }
    return;
  }

  if (result.valid) {
    output.success('Configuration is fully valid and compatible!');
    output.info(JSON.stringify(result.normalizedConfig, null, 2));
  } else {
    output.error('Configuration contains compatibility errors:');
    result.errors.forEach((err) => {
      output.info(` - [${err.code}] ${err.field ? `${err.field}: ` : ''}${err.message}`);
    });
    throw new StructifyCLIError('VALIDATION_ERROR', 'Validation checks failed.');
  }

  output.showFooter('validate');
}
