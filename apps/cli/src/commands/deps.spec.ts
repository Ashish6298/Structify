import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCLIContext } from '../context.js';
import { handleDeps } from './deps.js';

const tempDirs: string[] = [];

describe('CLI deps command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('prints dependency intelligence pointwise summary and recommendations', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-deps-'));
    tempDirs.push(projectDir);
    writeProject(projectDir, {
      'package.json': '{"name":"cli-deps","dependencies":{"react":"^18.2.0","request":"^2.88.2"}}',
    });

    const context = createCLIContext(['node', 'structify', 'deps'], { cwd: projectDir });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleDeps({}, context);

    const output = logs.join('\n');
    expect(output).toContain('Structify Dependency Intelligence');
    expect(output).toContain('Installed');
    expect(output).toContain('Outdated');
    expect(output).toContain('Deprecated');
    expect(output).toContain('Recommendations');
  });

  it('outputs json format when context.json is active', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-deps-json-'));
    tempDirs.push(projectDir);
    writeProject(projectDir, {
      'package.json': '{"name":"cli-deps-json","dependencies":{"lodash":"^4.17.21"}}',
    });

    const context = createCLIContext(['node', 'structify', 'deps', '--json'], { cwd: projectDir });
    context.json = true;
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleDeps({}, context);

    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.command).toBe('deps');
    expect(parsed.data.installedCount).toBe(1);
  });
});

function writeProject(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}
