import path from 'path';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { getElapsedMs } from '../utils/middleware.js';
import {
  createRepairPlan,
  executePatchPlan,
  runProjectHealthCheck,
  HealthDiagnostic,
} from '@structify/core';

export interface RepairOptions {
  dryRun?: boolean;
  apply?: boolean;
  yes?: boolean;
  force?: boolean;
  path?: string;
}

export async function handleRepair(options: RepairOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Project Repair');
  const projectPath = path.resolve(context.cwd, options.path ?? '.');

  // Run unified health check to get diagnostics
  const healthReport = runProjectHealthCheck(projectPath);
  const repair = createRepairPlan(projectPath, { force: options.force, dryRun: options.dryRun });
  const elapsed = getElapsedMs(context.startTime);

  const fixableCount = healthReport.repairability.fixableIssues.length;
  const notFixableCount = healthReport.repairability.notFixableIssues.length;

  if (context.json) {
    if (options.apply && options.yes && repair.plan.operations.length > 0) {
      const result = executePatchPlan(projectPath, repair.plan);
      output.json({
        success: result.success,
        command: 'repair',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        durationMs: elapsed,
        code: result.success ? 'REPAIR_APPLIED' : 'REPAIR_NOT_SAFE',
        warnings: repair.drift.warnings.map((w) => w.message),
        errors: result.errors.map((e) => e.message),
        data: {
          projectPath,
          healthSummary: healthReport.healthSummary,
          overallStatus: healthReport.overallStatus,
          detectedStack: healthReport.detectedStack,
          fixableCount,
          notFixableCount,
          repair,
          result,
        },
      });
      if (!result.success) process.exitCode = 1;
      return;
    }
    output.json({
      success: true,
      command: 'repair',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      code:
        repair.plan.operations.length > 0
          ? 'REPAIR_PLAN_READY'
          : notFixableCount > 0
            ? 'REPAIR_NOT_SAFE'
            : 'NO_REPAIR_NEEDED',
      warnings: repair.drift.warnings.map((w) => w.message),
      errors: [],
      data: {
        projectPath,
        healthSummary: healthReport.healthSummary,
        overallStatus: healthReport.overallStatus,
        detectedStack: healthReport.detectedStack,
        fixableCount,
        notFixableCount,
        dryRun: options.dryRun === true,
        apply: options.apply === true,
        repairSuggestions: healthReport.repairability.repairSuggestions,
        repair,
        fixableIssues: healthReport.repairability.fixableIssues,
        notFixableIssues: healthReport.repairability.notFixableIssues,
      },
    });
    return;
  }

  // ── Human output ──────────────────────────────────────────────────────────
  output.info(`Project: ${projectPath}`);
  output.info(`Overall Status: ${healthReport.overallStatus}`);
  output.info(`Repair Plan: ${repair.code}`);
  output.info(`Repair Operations: ${repair.plan.operations.length}`);
  output.info(`Drift Errors: ${repair.drift.errors.length}`);
  output.info(`Drift Warnings: ${repair.drift.warnings.length}`);
  output.info(`Auto-Fixable Issues: ${fixableCount}`);
  output.info(`Needs Manual Attention: ${notFixableCount}`);

  if (repair.plan.operations.length > 0) {
    output.subheading('\nRepair Operations (Dry-Run Preview):\n');
    for (const op of repair.plan.operations) {
      output.info(`  [${op.type.toUpperCase()}] ${op.targetPath} — ${op.description}`);
    }
  }

  if (healthReport.repairability.notFixableIssues.length > 0) {
    output.subheading('\nIssues Requiring Manual Attention:\n');
    for (const issue of healthReport.repairability.notFixableIssues) {
      renderDiagnostic(output, issue, context.noColor);
    }
  }

  if (healthReport.repairability.repairSuggestions.length > 0) {
    output.subheading('\nSuggestions:\n');
    for (const suggestion of healthReport.repairability.repairSuggestions) {
      output.warn(`  ${suggestion}`);
    }
  }

  if (!options.apply || options.dryRun) {
    output.info('\nDry-run/preview mode. No files were changed.');
    output.showFooter('repair');
    return;
  }
  if (!options.yes) {
    throw new StructifyCLIError('USAGE_ERROR', 'Use --yes with --apply to apply safe repairs.');
  }
  const result = executePatchPlan(projectPath, repair.plan);
  if (!result.success) {
    throw new StructifyCLIError(
      'CONFLICT_ERROR',
      'Repair patch application failed.',
      result.errors,
    );
  }
  output.success(`Applied ${result.appliedOperations.length} repair operation(s).`);
  output.showFooter('repair');
}

function renderDiagnostic(output: CLIOutput, diag: HealthDiagnostic, noColor: boolean): void {
  const statusMap: Record<string, string> = {
    PASS: noColor ? '[PASS]' : '\x1b[32m[PASS]\x1b[0m',
    INFO: noColor ? '[INFO]' : '\x1b[34m[INFO]\x1b[0m',
    WARNING: noColor ? '[WARN]' : '\x1b[33m[WARN]\x1b[0m',
    ERROR: noColor ? '[FAIL]' : '\x1b[31m[FAIL]\x1b[0m',
    FIXABLE: noColor ? '[FIXABLE]' : '\x1b[33m[FIXABLE]\x1b[0m',
    NOT_FIXABLE: noColor ? '[MANUAL]' : '\x1b[31m[MANUAL]\x1b[0m',
  };
  const label = statusMap[diag.status] ?? `[${diag.status}]`;
  const location = diag.path ? ` (${diag.path})` : '';
  const suggestion = diag.suggestion ? `\n    → ${diag.suggestion}` : '';
  output.info(`  ${label} ${diag.message}${location}${suggestion}`);
}
