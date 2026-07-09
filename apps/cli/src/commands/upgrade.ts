import path from 'path';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { getElapsedMs } from '../utils/middleware.js';
import { createUpgradePlan, executePatchPlan, appendHistoryEntry } from '@structify/core';

export interface UpgradeOptions {
  dryRun?: boolean;
  yes?: boolean;
  path?: string;
}

export async function handleUpgrade(options: UpgradeOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Project Upgrade');
  const projectPath = path.resolve(context.cwd, options.path ?? '.');
  const upgrade = createUpgradePlan(projectPath);
  const elapsed = getElapsedMs(context.startTime);

  if (context.json) {
    if (!options.dryRun && options.yes && !upgrade.reviewRequired) {
      const result = executePatchPlan(projectPath, upgrade.plan);
      appendHistoryEntry(projectPath, {
        operation: 'upgrade',
        status: result.success ? 'success' : 'failed',
        duration: getElapsedMs(context.startTime),
        filesChanged: result.success ? result.appliedOperations.map((op) => op.targetPath) : [],
        summary: 'Dependency Upgrade',
      }, context.packageVersion);
      output.json({
        success: result.success,
        command: 'upgrade',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        durationMs: elapsed,
        code: result.success ? 'UPGRADE_APPLIED' : 'UPGRADE_FAILED',
        warnings: [],
        errors: result.errors,
        data: { projectPath, upgrade, result },
      });
      if (!result.success) process.exitCode = 1;
      return;
    }
    output.json({
      success: !upgrade.reviewRequired,
      command: 'upgrade',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      code: upgrade.code,
      warnings: upgrade.reviewRequired ? [{ code: upgrade.code, message: upgrade.message }] : [],
      errors: [],
      data: { projectPath, upgrade, dryRun: options.dryRun !== false },
    });
    if (upgrade.reviewRequired) process.exitCode = 1;
    return;
  }

  output.info(`Project: ${projectPath}`);
  output.info(`Status: ${upgrade.code}`);
  output.info(`Review Required: ${upgrade.reviewRequired ? 'yes' : 'no'}`);
  output.info(`Patch Operations: ${upgrade.plan.operations.length}`);
  output.info(`Migration Nodes: ${upgrade.plan.migrationGraph.nodes.length}`);

  if (options.dryRun || !options.yes) {
    output.info('Upgrade preview only. No files were changed.');
    if (upgrade.reviewRequired) {
      output.warn('Upgrade requires review before automatic application.');
    }
    output.showFooter('upgrade');
    return;
  }
  if (upgrade.reviewRequired) {
    throw new StructifyCLIError('UPGRADE_REQUIRES_REVIEW', upgrade.message);
  }
  const result = executePatchPlan(projectPath, upgrade.plan);
  appendHistoryEntry(projectPath, {
    operation: 'upgrade',
    status: result.success ? 'success' : 'failed',
    duration: getElapsedMs(context.startTime),
    filesChanged: result.success ? result.appliedOperations.map((op) => op.targetPath) : [],
    summary: 'Dependency Upgrade',
  }, context.packageVersion);
  if (!result.success) {
    throw new StructifyCLIError(
      'INTERNAL_ERROR',
      'Upgrade patch application failed.',
      result.errors,
    );
  }
  output.success(`Applied ${result.appliedOperations.length} upgrade operation(s).`);
  output.showFooter('upgrade');
}
