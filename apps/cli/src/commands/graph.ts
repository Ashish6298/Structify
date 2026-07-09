import fs from 'fs';
import path from 'path';
import {
  analyzeProject,
  createArchitectureExplorerModelFromAnalysis,
  renderArchitectureExplorerHtml,
} from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { getElapsedMs } from '../utils/middleware.js';

export interface GraphOptions {
  path?: string;
  output?: string;
}

export async function handleGraph(options: GraphOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  const projectPath = path.resolve(context.cwd, options.path ?? '.');
  const targetPath = path.resolve(context.cwd, options.output ?? 'graph.html');
  const analysis = analyzeProject(projectPath);
  const model = createArchitectureExplorerModelFromAnalysis(analysis);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, renderArchitectureExplorerHtml(model), 'utf8');

  if (context.json) {
    output.json({
      success: true,
      command: 'graph',
      timestamp: new Date().toISOString(),
      durationMs: getElapsedMs(context.startTime),
      data: {
        projectPath,
        outputPath: targetPath,
        projectType: analysis.project.type,
        sections: model.views.architectural.sections.map((section) => section.title),
      },
    });
    return;
  }

  output.heading('Architecture Explorer');
  output.info(`Project: ${projectPath}`);
  output.info(`Output: ${targetPath}`);
  output.info(
    `Sections: ${model.views.architectural.sections.map((section) => section.title).join(', ')}`,
  );
  output.showFooter('graph');
}
