import fs from 'fs';
import path from 'path';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { getElapsedMs } from '../utils/middleware.js';
import { readEventLog, replayEventTimeline } from '@structify/core';

export async function handleInspect(context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  if (!context.json) {
    output.heading('Structify Project Inspection');
  }

  const configPath = path.join(context.cwd, 'structify.config.json');
  const manifestPath = path.join(context.cwd, 'structify.manifest.json');
  const projectGraphPath = path.join(context.cwd, 'structify.project-graph.json');
  const packageJsonPath = path.join(context.cwd, 'package.json');
  const eventLogPath = path.join(context.cwd, '.structify', 'events.ndjson');
  const hasConfig = fs.existsSync(configPath);
  const hasManifest = fs.existsSync(manifestPath);
  const hasProjectGraph = fs.existsSync(projectGraphPath);
  const hasPackageJson = fs.existsSync(packageJsonPath);
  const knownGeneratedFiles = [
    'app/page.tsx',
    'src/App.tsx',
    'src/app.ts',
    'src/main.ts',
    'prisma/schema.prisma',
    '.github/workflows/ci.yml',
  ];
  const detectedFiles = knownGeneratedFiles.filter((file) =>
    fs.existsSync(path.join(context.cwd, file)),
  );
  let parsedConfig: unknown = null;
  let parsedManifest: unknown = null;
  let parsedProjectGraph: unknown = null;
  let packageScripts: Record<string, string> = {};
  const events = readEventLog(eventLogPath);
  const eventTimeline = replayEventTimeline(events);

  if (hasManifest) {
    try {
      parsedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (_e) {
      parsedManifest = { error: 'Unable to parse structify.manifest.json' };
    }
  }
  if (hasConfig) {
    try {
      parsedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (_e) {
      parsedConfig = { error: 'Unable to parse structify.config.json' };
    }
  }
  if (hasProjectGraph) {
    try {
      parsedProjectGraph = JSON.parse(fs.readFileSync(projectGraphPath, 'utf8'));
    } catch (_e) {
      parsedProjectGraph = { error: 'Unable to parse structify.project-graph.json' };
    }
  }
  if (hasPackageJson) {
    try {
      const parsedPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
        scripts?: Record<string, string>;
      };
      packageScripts = parsedPackage.scripts ?? {};
    } catch (_e) {
      packageScripts = {};
    }
  }

  const elapsed = getElapsedMs(context.startTime);

  if (context.json) {
    output.json({
      success: true,
      command: 'inspect',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      warnings: [],
      errors: [],
      data: {
        cwd: context.cwd,
        isStructifyProject: hasManifest || hasConfig || hasProjectGraph || detectedFiles.length > 0,
        manifest: parsedManifest,
        projectGraph: parsedProjectGraph,
        config: parsedConfig,
        packageScripts,
        detectedFiles,
        generatedFiles:
          parsedManifest && typeof parsedManifest === 'object' && 'templateHash' in parsedManifest
            ? detectedFiles
            : detectedFiles,
        eventTimeline,
        supportedFutureActions: ['add-module-plan', 'repair-suggestions', 'upgrade-preview'],
      },
    });
    return;
  }

  output.info(`Current working directory: ${context.cwd}`);
  if (hasManifest || hasConfig || hasProjectGraph || detectedFiles.length > 0) {
    output.success('Structify project signals detected.');
    if (hasManifest) {
      output.info(JSON.stringify(parsedManifest, null, 2));
    }
    if (hasConfig) {
      output.info(JSON.stringify(parsedConfig, null, 2));
    }
    if (hasProjectGraph) {
      output.info('Project Graph detected: structify.project-graph.json');
    }
    if (detectedFiles.length > 0) {
      output.info(`Known generated files: ${detectedFiles.join(', ')}`);
    }
    if (Object.keys(packageScripts).length > 0) {
      output.info(`Package scripts: ${Object.keys(packageScripts).join(', ')}`);
    }
    if (eventTimeline.length > 0) {
      output.info(`Event log entries: ${eventTimeline.length}`);
    }
  } else {
    output.warn(
      'No structify.config.json configuration detected. To initialize a project, run: structify init',
    );
  }
  output.showFooter('inspect');
}
