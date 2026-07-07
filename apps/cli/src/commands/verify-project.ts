import path from 'path';
import { runProjectHealthCheck, validateGeneratedProject } from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';

export interface VerifyProjectOptions {
  path?: string;
  strict?: boolean;
}

export async function handleVerifyProject(
  options: VerifyProjectOptions,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  const projectPath = path.resolve(context.cwd, options.path ?? '.');

  // Unified health check provides all diagnostics
  const healthReport = runProjectHealthCheck(projectPath);
  const { state, drift } = healthReport;

  // Structural validation (file shapes, scripts, graph nodes)
  const result = validateGeneratedProject(projectPath);

  // Strict mode: any WARNING or FIXABLE becomes a failure
  const strictFailure =
    options.strict === true &&
    (healthReport.diagnostics.some((d) => d.status === 'WARNING' || d.status === 'FIXABLE') ||
      drift.warnings.length > 0);

  const success =
    result.valid &&
    healthReport.diagnostics.every((d) => d.status !== 'ERROR') &&
    drift.errors.length === 0 &&
    !strictFailure;

  if (context.json) {
    output.json({
      success,
      command: 'verify-project',
      projectPath,
      strict: options.strict === true,
      overallStatus: healthReport.overallStatus,
      healthSummary: healthReport.healthSummary,
      summary: {
        checkedFiles: result.checkedFiles.length,
        checkedScripts: result.checkedScripts.length,
        checkedGraphNodes: result.checkedGraphNodes.length,
        dependencyChecks: result.dependencyChecks.length,
        warnings:
          result.warnings.length +
          healthReport.diagnostics.filter((d) => d.status === 'WARNING').length,
        errors:
          result.errors.length +
          drift.errors.length +
          healthReport.diagnostics.filter((d) => d.status === 'ERROR').length +
          (strictFailure ? drift.warnings.length : 0),
      },
      state,
      drift,
      detectedStack: healthReport.detectedStack,
      repairability: healthReport.repairability,
      healthDiagnostics: healthReport.diagnostics,
      ...result,
    });
    if (!success) {
      process.exitCode = 1;
    }
    return;
  }

  output.heading('Structify Project Verification');
  output.info(`Project: ${projectPath}`);
  output.info(`Strict Mode: ${options.strict === true ? 'yes' : 'no'}`);
  output.info(`Overall Health Status: ${healthReport.overallStatus}`);
  output.info(`Checked Files: ${result.checkedFiles.length}`);
  output.info(`Checked Scripts: ${result.checkedScripts.length}`);
  output.info(`Checked Graph Nodes: ${result.checkedGraphNodes.length}`);
  output.info(`Dependency Checks: ${result.dependencyChecks.length}`);

  if (result.warnings.length > 0) {
    result.warnings.forEach((issue) => output.warn(`[${issue.code}] ${issue.message}`));
  }

  const healthWarnings = healthReport.diagnostics.filter((d) => d.status === 'WARNING');
  const healthFixable = healthReport.diagnostics.filter((d) => d.status === 'FIXABLE');
  const healthErrors = healthReport.diagnostics.filter((d) => d.status === 'ERROR');

  output.info(`Drift Errors: ${drift.errors.length}`);
  output.info(`Drift Warnings: ${drift.warnings.length}`);
  output.info(
    `Health: ${healthErrors.length} errors / ${healthWarnings.length} warnings / ${healthFixable.length} fixable`,
  );

  if (!success) {
    result.errors.forEach((issue) => output.error(`[${issue.code}] ${issue.message}`));
    drift.errors.forEach((issue) => output.error(`[${issue.code}] ${issue.message}`));
    healthErrors.forEach((d) => output.error(`[${d.code}] ${d.message}`));
    if (options.strict) {
      drift.warnings.forEach((issue) => output.error(`[STRICT:${issue.code}] ${issue.message}`));
      healthWarnings.forEach((d) => output.error(`[STRICT:${d.code}] ${d.message}`));
      healthFixable.forEach((d) =>
        output.error(`[STRICT:${d.code}] ${d.message} (fixable: run repair)`),
      );
    }
    throw new StructifyCLIError(
      'VALIDATION_ERROR',
      'Generated project structural validation failed.',
    );
  }

  output.success('Structural validation passed.');

  if (healthReport.repairability.canAutoRepair) {
    output.warn(
      `${healthReport.repairability.fixableIssues.length} fixable issue(s) detected — run structify repair --dry-run`,
    );
  }

  output.showFooter('verify-project');
}
