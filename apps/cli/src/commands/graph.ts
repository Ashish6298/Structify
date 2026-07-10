import fs from 'fs';
import path from 'path';
import {
  analyzeProject,
  createArchitectureView,
  renderArchitectureTree,
  renderArchitectureTreeMarkdown,
  appendHistoryEntry,
} from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { getElapsedMs } from '../utils/middleware.js';

export interface GraphOptions {
  path?: string;
  output?: string;
  depth?: number;
  complete?: boolean;
  architecture?: boolean;
  important?: boolean;
  md?: boolean;
}

export async function handleGraph(options: GraphOptions, context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  const projectPath = path.resolve(context.cwd, options.path ?? '.');
  const analysis = analyzeProject(projectPath);

  const isCompleteMode = options.complete === true;
  const view = createArchitectureView(analysis, isCompleteMode ? 'complete' : 'architectural');

  const renderOptions = {
    mode: options.important ? 'important' : isCompleteMode ? 'full' : 'overview',
    depth: options.depth,
  } as const;

  const rendered = renderArchitectureTree(view, renderOptions);
  const isWritingMarkdown = Boolean(options.md || options.output);
  const elapsed = getElapsedMs(context.startTime);

  appendHistoryEntry(
    projectPath,
    {
      operation: 'graph',
      status: 'success',
      duration: elapsed,
      filesChanged: isWritingMarkdown ? [options.output ?? 'PROJECT_STRUCTURE.md'] : [],
      summary: 'Generated Graph',
    },
    context.packageVersion,
  );

  if (isWritingMarkdown) {
    const markdownPath = path.resolve(projectPath, options.output ?? 'PROJECT_STRUCTURE.md');
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.writeFileSync(markdownPath, renderArchitectureTreeMarkdown(view, renderOptions), 'utf8');

    if (context.json) {
      output.json({
        success: true,
        command: 'graph',
        timestamp: new Date().toISOString(),
        durationMs: getElapsedMs(context.startTime),
        data: {
          projectPath,
          markdownPath,
          projectType: analysis.project.type,
          summary: rendered.summary,
        },
      });
      return;
    }

    output.heading('Architecture Tree');
    output.info(`Project: ${projectPath}`);
    output.info(`Markdown: ${markdownPath}`);
    output.info('');
    output.info(rendered.text);
    output.showFooter('graph');
    return;
  }

  if (context.json) {
    output.json({
      success: true,
      command: 'graph',
      timestamp: new Date().toISOString(),
      durationMs: getElapsedMs(context.startTime),
      data: {
        projectPath,
        projectType: analysis.project.type,
        summary: rendered.summary,
        sections: view.sections.map((section) => section.title),
      },
    });
    return;
  }

  output.heading('Architecture Tree');
  output.info(`Project: ${projectPath}`);
  output.info('');
  output.info(rendered.text);
  output.showFooter('graph');
}
