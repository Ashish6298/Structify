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

  it('writes a self-contained graph.html file', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-graph-'));
    tempDirs.push(projectDir);
    writeProject(projectDir, {
      'package.json': '{"name":"cli-graph","dependencies":{"next":"^14.0.0"}}',
      'app/page.tsx': 'export default function Page() { return null; }',
      'tailwind.config.ts': 'export default {};',
    });

    const context = createCLIContext(['node', 'structify', 'graph'], { cwd: projectDir });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await handleGraph({}, context);

    const outputPath = path.join(projectDir, 'graph.html');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf8')).toContain('Architecture Explorer');
  });

  it('emits JSON output in json mode', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-graph-json-'));
    tempDirs.push(projectDir);
    writeProject(projectDir, {
      'package.json': '{"name":"cli-graph-json","dependencies":{"express":"^4.0.0"}}',
      'src/server.ts': 'export const server = true;',
    });

    const context = createCLIContext(['node', 'structify', '--json', 'graph'], {
      cwd: projectDir,
      json: true,
    });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleGraph({}, context);

    const parsed = JSON.parse(logs.join('\n')) as {
      success: boolean;
      data: { outputPath: string; sections: string[] };
    };
    expect(parsed.success).toBe(true);
    expect(parsed.data.outputPath.endsWith('graph.html')).toBe(true);
    expect(parsed.data.sections.length).toBeGreaterThan(0);
  });
});

function writeProject(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}
