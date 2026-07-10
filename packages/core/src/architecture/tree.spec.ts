import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeProject } from '../intelligence/index.js';
import { createArchitectureView } from './view.js';
import { renderArchitectureTree, renderArchitectureTreeMarkdown } from './tree.js';

const tempDirs: string[] = [];

describe('Architecture tree renderer', () => {
  afterEach(() => {
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders a concise terminal tree for the default overview', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"tree-app"}',
        'README.md': '# Tree App',
        'apps/web/package.json': '{"name":"web"}',
        'apps/web/src/app/page.tsx': 'export default function Page() { return null; }',
        'apps/web/next.config.ts': 'export default {};',
        'node_modules/example/index.js': 'module.exports = {};',
      }),
    );

    const view = createArchitectureView(analysis, 'architectural');
    const rendered = renderArchitectureTree(view);

    expect(rendered.text).toContain('📦');
    expect(rendered.text).toContain('apps');
    expect(rendered.text).toContain('package.json');
    expect(rendered.text).toContain('Summary:');
    expect(rendered.text).not.toContain('node_modules');
  });

  it('honors depth limits and only expands the requested level', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"depth-app"}',
        'apps/web/src/app/page.tsx': 'export default function Page() { return null; }',
        'apps/web/src/app/layout.tsx': 'export default function Layout() { return null; }',
      }),
    );

    const view = createArchitectureView(analysis, 'architectural');
    const rendered = renderArchitectureTree(view, { depth: 1 });

    expect(rendered.text).toContain('apps');
    expect(rendered.text).not.toContain('page.tsx');
  });

  it('renders every architectural file in full mode while hiding ignored folders', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"full-app"}',
        'README.md': '# Full App',
        'src/server.ts': 'export const server = true;',
        'dist/bundle.js': 'console.log(1);',
        'node_modules/pkg/index.js': 'module.exports = 1;',
        'tmp/cache.log': 'cache',
      }),
    );

    const view = createArchitectureView(analysis, 'complete');
    const rendered = renderArchitectureTree(view, { mode: 'full' });

    expect(rendered.text).toContain('README.md');
    expect(rendered.text).toContain('package.json');
    expect(rendered.text).not.toContain('dist');
    expect(rendered.text).not.toContain('node_modules');
    expect(rendered.text).not.toContain('tmp');
  });

  it('shows only important files in important mode', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"important-app"}',
        'README.md': '# Important App',
        'docker-compose.yml': 'services: {}',
        'src/internal.ts': 'export const internal = true;',
        'docs/guide.md': '# Guide',
      }),
    );

    const view = createArchitectureView(analysis, 'architectural');
    const rendered = renderArchitectureTree(view, { mode: 'important' });

    expect(rendered.text).toContain('package.json');
    expect(rendered.text).toContain('README.md');
    expect(rendered.text).toContain('docker-compose.yml');
    expect(rendered.text).not.toContain('internal.ts');
  });

  it('exports markdown inside a fenced code block without metadata', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"md-app"}',
        'README.md': '# Md App',
      }),
    );

    const view = createArchitectureView(analysis, 'architectural');
    const markdown = renderArchitectureTreeMarkdown(view);

    expect(markdown).toContain('```text');
    expect(markdown).toContain('package.json');
    expect(markdown).not.toContain('Summary:');
  });

  it('counts ignored files in the summary and is deterministic', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"summary-app"}',
        'src/index.ts': 'export {};',
        'node_modules/demo/index.js': 'module.exports = 1;',
        'dist/app.js': 'console.log(1);',
      }),
    );

    const view = createArchitectureView(analysis, 'architectural');
    const first = renderArchitectureTree(view);
    const second = renderArchitectureTree(view);

    expect(first.text).toBe(second.text);
    expect(first.summary.ignoredFiles).toBeGreaterThan(0);
    expect(first.summary.filesDisplayed).toBeGreaterThan(0);
  });
});

function createProject(files: Record<string, string>): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-tree-'));
  tempDirs.push(tempDir);
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
  return tempDir;
}
