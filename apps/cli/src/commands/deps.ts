import path from 'path';
import { analyzeProject, analyzeDependencies, appendHistoryEntry } from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { getElapsedMs } from '../utils/middleware.js';

export interface DepsOptions {
  path?: string;
}

export async function handleDeps(options: DepsOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Dependency Intelligence');
  const projectPath = path.resolve(context.cwd, options.path ?? '.');

  const analysis = analyzeProject(projectPath);
  const report = analyzeDependencies(projectPath, analysis);
  const elapsed = getElapsedMs(context.startTime);

  appendHistoryEntry(
    projectPath,
    {
      operation: 'deps',
      status: 'success',
      duration: elapsed,
      filesChanged: [],
      summary: 'Dependency Audit',
    },
    context.packageVersion,
  );

  if (context.json) {
    output.json({
      success: true,
      command: 'deps',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      data: report,
    });
    return;
  }

  output.info(`Project: ${projectPath}`);
  output.info('');
  output.heading('Summary');
  output.info(`${report.installedCount} Installed`);
  output.info(`${report.outdatedCount} Outdated`);
  output.info(`${report.deprecatedCount} Deprecated`);
  output.info(`${report.unusedCount} Unused`);
  output.info(`${report.breakingCount} Breaking`);
  output.info(`${report.migrationCount} Migration Required`);
  output.info('');

  if (report.recommendations.length > 0) {
    output.heading('Recommendations');
    for (const rec of report.recommendations) {
      const typeLabel = rec.type.toUpperCase();
      const severityLabel = rec.severity;

      if (rec.severity === 'BREAKING' || rec.severity === 'MIGRATION REQUIRED') {
        output.error(`[${severityLabel}] [${typeLabel}] ${rec.packageName}`);
      } else {
        output.warn(`[${severityLabel}] [${typeLabel}] ${rec.packageName}`);
      }

      output.info(`  Message:   ${rec.message}`);
      output.info(`  Rationale: ${rec.rationale}`);
      output.info('');
    }
  } else {
    output.success('All dependencies are healthy, up to date, and utilized!');
  }

  output.showFooter('deps');
}
