import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCLIContext } from '../context.js';
import { handleHistory } from './history.js';
import { appendHistoryEntry } from '@structify/core';

const tempDirs: string[] = [];

describe('CLI history command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders a vertical timeline of recorded operations', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-history-'));
    tempDirs.push(projectDir);

    appendHistoryEntry(projectDir, {
      operation: 'init',
      status: 'success',
      duration: 100,
      filesChanged: ['package.json'],
      summary: 'Project Created',
    });

    appendHistoryEntry(projectDir, {
      operation: 'add',
      status: 'success',
      duration: 50,
      filesChanged: ['lib/auth.ts'],
      summary: 'Added Clerk',
    });

    const context = createCLIContext(['node', 'structify', 'history'], { cwd: projectDir });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleHistory({ path: projectDir }, context);

    const output = logs.join('\n');
    expect(output).toContain('Project History Timeline');
    expect(output).toContain('[SUCCESS] Project Created');
    expect(output).toContain('[SUCCESS] Added Clerk');
    expect(output).toContain('↓');
  });

  it('renders raw JSON format', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-history-json-'));
    tempDirs.push(projectDir);

    appendHistoryEntry(projectDir, {
      operation: 'init',
      status: 'success',
      duration: 100,
      filesChanged: [],
      summary: 'Project Created',
    });

    const context = createCLIContext(['node', 'structify', 'history', '--json'], {
      cwd: projectDir,
    });
    context.json = true;
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleHistory({ path: projectDir, json: true }, context);

    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].summary).toBe('Project Created');
  });
});
