import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeProject } from '../intelligence/index.js';
import {
  ArchitectureViewNode,
  createArchitectureView,
  filterArchitecturalView,
  filterCompleteView,
  groupSections,
  sortNodes,
} from './index.js';

const tempDirs: string[] = [];

describe('Architecture View Model', () => {
  afterEach(() => {
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates an architectural view from ProjectAnalysis', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"view-app","dependencies":{"next":"^14.0.0","express":"^4.0.0"}}',
        'app/page.tsx': 'export default function Page() { return null; }',
        'app/layout.tsx': 'export default function Layout({ children }) { return children; }',
        'src/server.ts': 'export const server = true;',
        'prisma/schema.prisma': 'datasource db { provider = "postgresql" }',
        'public/logo.svg': '<svg />',
        'tailwind.config.ts': 'export default {};',
      }),
    );

    const view = createArchitectureView(analysis);

    expect(view.title).toBe('view-app');
    expect(view.projectType).toBe('external');
    expect(view.mode).toBe('architectural');
    expect(view.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(['Frontend', 'Backend', 'Database', 'Public', 'Configuration']),
    );
    expect(view.statistics.frontendFiles).toBeGreaterThan(0);
    expect(view.statistics.backendFiles).toBeGreaterThan(0);
  });

  it('filters architectural mode more aggressively than complete mode', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"mode-app"}',
        'src/index.ts': 'export {};',
        'README.md': '# docs',
        'notes.txt': 'misc',
      }),
    );

    const architecturalView = filterArchitecturalView(analysis);
    const completeView = filterCompleteView(analysis);

    expect(
      completeView.sections.flatMap((section) => section.childNodes).length,
    ).toBeGreaterThanOrEqual(
      architecturalView.sections.flatMap((section) => section.childNodes).length,
    );
  });

  it('builds collapsible nodes with default collapsed state', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"collapsed-app"}',
        'app/page.tsx': 'export default function Page() { return null; }',
        'app/layout.tsx': 'export default function Layout({ children }) { return children; }',
      }),
    );

    const sections = groupSections(analysis, 'architectural');
    const frontend = sections.find((section) => section.key === 'frontend');

    expect(frontend).toBeDefined();
    expect(frontend?.childNodes[0]?.collapsed).toBe(true);
    expect(frontend?.childNodes[0]?.children.every((child) => child.collapsed === true)).toBe(true);
  });

  it('sorts directories before files and higher-importance nodes first', () => {
    const sorted = sortNodes([
      {
        id: 'file:low',
        name: 'z.ts',
        path: 'z.ts',
        kind: 'file',
        type: 'source',
        importance: 'low',
        children: [],
        collapsed: true,
        category: 'other',
      },
      {
        id: 'dir:a',
        name: 'app',
        path: 'app',
        kind: 'directory',
        type: 'directory',
        importance: 'high',
        children: [],
        collapsed: true,
        category: 'frontend',
      },
      {
        id: 'file:critical',
        name: 'package.json',
        path: 'package.json',
        kind: 'file',
        type: 'manifest',
        importance: 'critical',
        children: [],
        collapsed: true,
        category: 'configuration',
      },
    ]);

    expect(sorted[0]?.kind).toBe('directory');
    expect(sorted[1]?.importance).toBe('critical');
  });

  it('does not include generated files in complete mode', () => {
    const analysis = analyzeProject(
      createProject({
        'package.json': '{"name":"generated-app"}',
        'src/index.ts': 'export {};',
        'coverage/coverage-final.json': '{}',
      }),
    );

    const view = filterCompleteView(analysis);
    const allPaths = view.sections.flatMap((section) =>
      section.childNodes.flatMap((node) => collectPaths(node)),
    );

    expect(allPaths.some((value) => value.startsWith('coverage/'))).toBe(false);
  });
});

function createProject(files: Record<string, string>): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-architecture-'));
  tempDirs.push(tempDir);
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
  return tempDir;
}

function collectPaths(node: ArchitectureViewNode): string[] {
  return [node.path, ...node.children.flatMap((child) => collectPaths(child))];
}
