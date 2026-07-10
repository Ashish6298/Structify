import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCLIContext } from '../context.js';
import { handleGraph } from './graph.js';

const tempDirs: string[] = [];

describe('CLI graph command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders a terminal architecture tree and does not emit graph.html', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-graph-'));
    tempDirs.push(projectDir);
    writeProject(projectDir, {
      'package.json': '{"name":"cli-graph","dependencies":{"next":"^14.0.0"}}',
      'app/page.tsx': 'export default function Page() { return null; }',
      'tailwind.config.ts': 'export default {};',
    });

    const context = createCLIContext(['node', 'structify', 'graph'], { cwd: projectDir });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleGraph({}, context);

    const outputPath = path.join(projectDir, 'graph.html');
    expect(fs.existsSync(outputPath)).toBe(false);
    expect(logs.join('\n')).toContain('Architecture Tree');
    expect(logs.join('\n')).toContain('package.json');
  });

  it('writes a markdown architecture tree when requested', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-graph-md-'));
    tempDirs.push(projectDir);
    writeProject(projectDir, {
      'package.json': '{"name":"cli-graph-md","dependencies":{"express":"^4.0.0"}}',
      'src/server.ts': 'export const server = true;',
    });

    const context = createCLIContext(['node', 'structify', 'graph', '--md'], { cwd: projectDir });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleGraph({ md: true }, context);

    const markdownPath = path.join(projectDir, 'PROJECT_STRUCTURE.md');
    expect(fs.existsSync(markdownPath)).toBe(true);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('```text');
    expect(logs.join('\n')).toContain('Markdown:');
  });
});

function writeProject(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}
