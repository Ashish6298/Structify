import path from 'path';
import * as childProcess from 'child_process';
import { runProjectHealthCheck, validateGeneratedProject } from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';

export interface VerifyProjectOptions {
  path?: string;
  strict?: boolean;
  ci?: boolean;
  build?: boolean;
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

  // Optional build check
  let buildPassed = true;
  let buildError: string | null = null;
  if (options.build) {
    try {
      childProcess.execSync('npm run build', {
        cwd: projectPath,
        stdio: 'pipe',
        env: { ...process.env, CI: 'true' },
        windowsHide: true,
      });
    } catch (e: unknown) {
      buildPassed = false;

      const error = e as {
        stderr?: Buffer;
        stdout?: Buffer;
        message?: string;
      };

      buildError =
        error.stderr?.toString() ||
        error.stdout?.toString() ||
        error.message ||
        'Unknown build error';
    }
  }

  // Strict mode: any WARNING, FIXABLE, or build failure is a failure
  const strictFailure =
    options.strict === true &&
    (healthReport.diagnostics.some((d) => d.status === 'WARNING' || d.status === 'FIXABLE') ||
      drift.warnings.length > 0 ||
      !buildPassed);

  const success =
    result.valid &&
    healthReport.diagnostics.every((d) => d.status !== 'ERROR') &&
    drift.errors.length === 0 &&
    buildPassed &&
    !strictFailure;

  // JSON output format
  if (context.json) {
    output.json({
      success,
      command: 'verify-project',
      projectPath,
      strict: options.strict === true,
      ci: options.ci === true,
      buildChecked: options.build === true,
      buildPassed,
      buildError,
      overallStatus: success ? 'HEALTHY' : 'CRITICAL',
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
          (strictFailure ? drift.warnings.length : 0) +
          (buildPassed ? 0 : 1),
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

  // CI Mode (concise machine-readable diagnostics, no fancy banners)
  if (options.ci) {
    if (!success) {
      if (!buildPassed) {
        console.error(`[VERIFY:ERROR] Build failed: ${buildError}`);
      }
      result.errors.forEach((err) => console.error(`[VERIFY:ERROR] [${err.code}] ${err.message}`));
      drift.errors.forEach((err) => console.error(`[VERIFY:ERROR] [${err.code}] ${err.message}`));
      if (options.strict) {
        result.warnings.forEach((warn) =>
          console.error(`[VERIFY:STRICT_ERROR] [${warn.code}] ${warn.message}`),
        );
      }
      process.exitCode = 1;
      return;
    }
    console.log(`[VERIFY:PASS] Project at ${projectPath} is valid.`);
    return;
  }

  // Human / Interactive mode
  output.heading('Structify Project Verification');
  output.info(`Project: ${projectPath}`);
  output.info(`Strict Mode: ${options.strict === true ? 'yes' : 'no'}`);
  output.info(`Overall Health Status: ${success ? 'HEALTHY' : 'CRITICAL'}`);
  output.info(`Checked Files: ${result.checkedFiles.length}`);
  output.info(`Checked Scripts: ${result.checkedScripts.length}`);
  output.info(`Checked Graph Nodes: ${result.checkedGraphNodes.length}`);
  output.info(`Dependency Checks: ${result.dependencyChecks.length}`);
  output.info(`Build Passed: ${options.build ? (buildPassed ? 'yes' : 'no') : 'skipped'}`);

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
    if (!buildPassed && buildError) {
      output.error(`Build Failure: ${buildError}`);
    }
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
