import path from 'path';
import { validateGeneratedProject } from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';

export interface VerifyProjectOptions {
  path?: string;
}

export async function handleVerifyProject(
  options: VerifyProjectOptions,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  const projectPath = path.resolve(context.cwd, options.path ?? '.');
  const result = validateGeneratedProject(projectPath);

  if (context.json) {
    output.json({
      success: result.valid,
      command: 'verify-project',
      projectPath,
      ...result,
    });
    return;
  }

  output.heading('Structify Project Verification');
  output.info(`Project: ${projectPath}`);
  output.info(`Checked Files: ${result.checkedFiles.length}`);
  if (!result.valid) {
    result.issues.forEach((issue) => output.error(`[${issue.code}] ${issue.message}`));
    throw new StructifyCLIError(
      'VALIDATION_ERROR',
      'Generated project structural validation failed.',
    );
  }
  output.success('Structural validation passed.');
  output.showFooter('verify-project');
}
