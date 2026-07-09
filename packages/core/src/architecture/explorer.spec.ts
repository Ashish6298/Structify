import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeProject } from '../intelligence/index.js';
import { createArchitectureExplorerModelFromAnalysis, renderArchitectureExplorerHtml } from './explorer.js';

const tempDirs: string[] = [];

describe('Architecture Explorer HTML', () => {
  afterEach(() => {
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders a self-contained explorer document from the view model payload', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-explorer-'));
    tempDirs.push(projectDir);
    writeProject(projectDir, {
      'package.json': '{"name":"graph-app","dependencies":{"next":"^14.0.0","express":"^4.0.0"}}',
      'app/page.tsx': 'export default function Page() { return null; }',
      'src/server.ts': 'export const server = true;',
      'public/logo.svg': '<svg />',
      'tailwind.config.ts': 'export default {};',
    });

    const analysis = analyzeProject(projectDir);
    analysis.generatedAt = '2024-01-01T00:00:00.000Z';
    const model = createArchitectureExplorerModelFromAnalysis(analysis);
    const html = renderArchitectureExplorerHtml(model);

    expect(snapshotShape(html)).toMatchInlineSnapshot(`
"<!DOCTYPE html>
<html lang="en">
<head>
<title>graph-app Architecture Explorer</title>
<contains>Show Architectural Files</contains>
<contains>Show Complete Project</contains>
<contains>Project Tree</contains>
<contains>Details</contains>
<contains>Total Files</contains>
<contains>Configuration Files</contains>
<contains>const explorerData=</contains>
<contains>"title":"graph-app"</contains>
<contains>"generatedAt":"2024-01-01T00:00:00.000Z"</contains>"
`);
  });
});

function writeProject(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}

function snapshotShape(html: string): string {
  const checks = [
    'Show Architectural Files',
    'Show Complete Project',
    'Project Tree',
    'Details',
    'Total Files',
    'Configuration Files',
    'const explorerData=',
    '"title":"graph-app"',
    '"generatedAt":"2024-01-01T00:00:00.000Z"',
  ];
  const lines = ['<!DOCTYPE html>', '<html lang="en">', '<head>', '<title>graph-app Architecture Explorer</title>'];
  for (const check of checks) {
    if (html.includes(check)) {
      lines.push(`<contains>${check}</contains>`);
    }
  }
  return lines.join('\n');
}
