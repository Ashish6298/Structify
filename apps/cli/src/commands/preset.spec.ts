import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handlePreset } from './preset.js';
import { handleInit } from './init.js';
import { createCLIContext } from '../context.js';
import { StructifyCLIError } from '../utils/error.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('CLI Presets and Command Alias Routing', () => {
  let tempCwd: string;

  beforeEach(() => {
    tempCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-presets-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempCwd, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup error
    }
  });

  it('should list all predefined presets in console and JSON modes', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    const contextJson = createCLIContext(['node', 'structify', '--json', 'preset', 'list'], {
      json: true,
      cwd: tempCwd,
    });
    await handlePreset('list', undefined, undefined, contextJson);

    const parsedJson = JSON.parse(logs.join('\n'));
    expect(parsedJson.success).toBe(true);
    expect(
      parsedJson.data.presets.some(
        (p: Record<string, unknown>) => p.name === 'next-postgres-tailwind',
      ),
    ).toBe(true);

    logs.length = 0;
    const contextHuman = createCLIContext(['node', 'structify', 'preset', 'list'], {
      cwd: tempCwd,
    });
    await handlePreset('list', undefined, undefined, contextHuman);
    expect(logs.join('\n')).toContain('next-postgres-tailwind');

    logSpy.mockRestore();
  });

  it('should show preset configuration settings', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    const contextJson = createCLIContext(
      ['node', 'structify', '--json', 'preset', 'show', 'next-postgres-tailwind'],
      {
        json: true,
        cwd: tempCwd,
      },
    );
    await handlePreset('show', 'next-postgres-tailwind', undefined, contextJson);

    const parsedJson = JSON.parse(logs.join('\n'));
    expect(parsedJson.success).toBe(true);
    expect(parsedJson.data.meta.name).toBe('next-postgres-tailwind');
    expect(parsedJson.data.config.stack.frontend).toBe('next');

    logSpy.mockRestore();
  });

  it('should throw PRESET_NOT_FOUND error on unknown preset name', async () => {
    const context = createCLIContext(['node', 'structify', 'preset', 'show', 'non-existent'], {
      cwd: tempCwd,
    });
    await expect(handlePreset('show', 'non-existent', undefined, context)).rejects.toThrowError(
      new StructifyCLIError(
        'PRESET_NOT_FOUND',
        'PRESET_NOT_FOUND: Preset "non-existent" was not found.',
      ),
    );
  });

  it('should support generate command as alias of init', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    const context = createCLIContext(['node', 'structify', '--json', 'generate'], {
      json: true,
      cwd: tempCwd,
    });
    context.commandName = 'generate';

    await handleInit({ dryRun: true, yes: true, output: 'alias-app' }, context);
    logSpy.mockRestore();

    const parsed = JSON.parse(logs.join('\n'));
    expect(parsed.command).toBe('generate');
    expect(parsed.aliasFor).toBe('init');
    expect(parsed.plannedFiles.length).toBeGreaterThan(0);
  });

  it('should create, export, import, copy, rename and remove presets', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    const context = createCLIContext(['node', 'structify', '--json'], {
      json: true,
      cwd: tempCwd,
    });

    // 1. Create
    await handlePreset('create', 'custom-cli-preset', undefined, context);
    let lastLog = JSON.parse(logs[logs.length - 1]);
    expect(lastLog.success).toBe(true);
    expect(lastLog.data.name).toBe('custom-cli-preset');

    // 2. Export
    const exportDest = path.join(tempCwd, 'exported.json');
    await handlePreset('export', 'custom-cli-preset', exportDest, context);
    expect(fs.existsSync(exportDest)).toBe(true);

    // 3. Import
    await handlePreset('import', exportDest, undefined, context);
    lastLog = JSON.parse(logs[logs.length - 1]);
    expect(lastLog.success).toBe(true);

    // 4. Copy
    await handlePreset('copy', 'custom-cli-preset', 'copied-preset', context);
    lastLog = JSON.parse(logs[logs.length - 1]);
    expect(lastLog.success).toBe(true);

    // 5. Rename
    await handlePreset('rename', 'copied-preset', 'renamed-preset', context);
    lastLog = JSON.parse(logs[logs.length - 1]);
    expect(lastLog.success).toBe(true);

    // 6. Info
    await handlePreset('info', 'renamed-preset', undefined, context);
    lastLog = JSON.parse(logs[logs.length - 1]);
    expect(lastLog.success).toBe(true);
    expect(lastLog.data.meta.name).toBe('renamed-preset');

    // 7. Validate
    await handlePreset('validate', 'renamed-preset', undefined, context);
    lastLog = JSON.parse(logs[logs.length - 1]);
    expect(lastLog.success).toBe(true);

    // 8. Remove
    await handlePreset('remove', 'renamed-preset', undefined, context);
    lastLog = JSON.parse(logs[logs.length - 1]);
    expect(lastLog.success).toBe(true);

    logSpy.mockRestore();
  });
});
