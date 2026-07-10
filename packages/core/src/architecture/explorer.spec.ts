import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeProject } from '../intelligence/index.js';
import { createArchitectureExplorerModelFromAnalysis } from './explorer.js';

const tempDirs: string[] = [];

describe('Architecture Explorer Model', () => {
  afterEach(() => {
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates explorer model payload correctly', () => {
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

    expect(model.title).toBe('graph-app');
    expect(model.generatedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(model.views.architectural).toBeDefined();
    expect(model.views.complete).toBeDefined();
  });
});

function writeProject(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}
