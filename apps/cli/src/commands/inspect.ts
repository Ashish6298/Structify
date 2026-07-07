import path from 'path';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { getElapsedMs } from '../utils/middleware.js';
import { createUpgradePlan, runProjectHealthCheck } from '@structify/core';

export interface InspectOptions {
  path?: string;
}

const ALL_BUILT_IN_MODULES = [
  'docker',
  'github-actions',
  'eslint',
  'prettier',
  'tailwind',
  'prisma',
  'mongoose',
];

export async function handleInspect(options: InspectOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Project Inspection');
  const projectPath = path.resolve(context.cwd, options.path ?? '.');

  const healthReport = runProjectHealthCheck(projectPath);
  const { state, drift, detectedStack } = healthReport;
  const upgrade = createUpgradePlan(projectPath);
  const installedModules = Object.keys(state.moduleVersions);
  const availableModules = ALL_BUILT_IN_MODULES.filter(
    (moduleName) => !installedModules.includes(moduleName),
  );
  const elapsed = getElapsedMs(context.startTime);

  if (context.json) {
    output.json({
      success: true,
      command: 'inspect',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      warnings: drift.warnings.map((w) => w.message),
      errors: healthReport.diagnostics.filter((d) => d.status === 'ERROR').map((d) => d.message),
      data: {
        projectPath,
        isStructifyProject: healthReport.isStructifyProject,
        overallStatus: healthReport.overallStatus,
        healthSummary: healthReport.healthSummary,
        detectedStack,
        state,
        driftReport: drift,
        moduleReport: { installedModules, availableCompatibleModules: availableModules },
        upgradeReport: upgrade,
        repairSuggestions: healthReport.repairability.repairSuggestions,
        fixableIssues: healthReport.repairability.fixableIssues,
        notFixableIssues: healthReport.repairability.notFixableIssues,
        metadataHealth:
          drift.deletedMetadataFiles.length === 0 &&
          healthReport.diagnostics.filter(
            (d) => d.category === 'project_metadata' && d.status === 'ERROR',
          ).length === 0
            ? 'ok'
            : 'drift',
        packageHealth:
          drift.changedPackageScripts.length === 0 && drift.missingDependencies.length === 0
            ? 'ok'
            : 'drift',
        dependencyHealth: drift.missingDependencies.length === 0 ? 'ok' : 'drift',
        graphHealth:
          drift.missingProjectGraphNodes.length === 0 && drift.orphanedGraphNodes.length === 0
            ? 'ok'
            : 'drift',
        supportedNextActions: [
          'add',
          'upgrade --dry-run',
          'repair --dry-run',
          'verify-project --strict',
        ],
      },
    });
    return;
  }

  output.info(`Project: ${projectPath}`);
  output.info(`Structify Project: ${healthReport.isStructifyProject ? 'yes' : 'no'}`);
  output.info(`Overall Status: ${healthReport.overallStatus}`);
  output.info(
    `Health: ${healthReport.healthSummary.pass} PASS / ${healthReport.healthSummary.warnings} WARN / ${healthReport.healthSummary.errors} ERROR / ${healthReport.healthSummary.fixable} FIXABLE / ${healthReport.healthSummary.notFixable} NOT_FIXABLE`,
  );

  // Stack info
  output.info(`Package Manager: ${state.packageManager}`);
  output.info(
    `Stack (detected): ${detectedStack.frontend} frontend / ${detectedStack.backend} backend / ${detectedStack.database} database`,
  );
  output.info(
    `Detection Source: ${detectedStack.detectionSource} (confidence: ${detectedStack.confidence})`,
  );

  output.info(`Files: ${state.files.length}`);
  output.info(`Drift: ${drift.hasDrift ? 'yes' : 'no'}`);
  output.info(`Installed Modules: ${installedModules.join(', ') || 'none'}`);
  output.info(`Available Modules: ${availableModules.join(', ') || 'none'}`);
  output.info(`Upgrade: ${upgrade.code}`);
  output.info(`Repair Suggestions: ${healthReport.repairability.repairSuggestions.length}`);

  if (healthReport.repairability.fixableIssues.length > 0) {
    output.warn(
      `Auto-fixable issues (${healthReport.repairability.fixableIssues.length}): run structify repair --dry-run`,
    );
  }
  if (healthReport.repairability.notFixableIssues.length > 0) {
    output.warn(
      `Manual issues (${healthReport.repairability.notFixableIssues.length}): require source control restore or --force`,
    );
  }

  output.showFooter('inspect');
}
