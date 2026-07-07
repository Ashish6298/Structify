import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCLIContext } from './context.js';
import { handleInit } from './commands/init.js';
import { handleVerifyProject } from './commands/verify-project.js';

let tmp: string | undefined;

function tempDir(prefix: string): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return tmp;
}

afterEach(() => {
  vi.restoreAllMocks();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

describe('Phase 8.2 final CLI consistency', () => {
  it('emits consistent dry-run planned file metadata without writing files', async () => {
    const cwd = tempDir('structify-final-dry-run-');
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    await handleInit(
      { dryRun: true, yes: true, output: 'dry-app' },
      createCLIContext(['node', 'structify', '--json', 'init'], { json: true, cwd }),
    );

    const parsed = JSON.parse(logs.join('\n')) as {
      generatedFiles: string[];
      plannedFiles: string[];
      virtualFileGraph: { fileCount: number; files: string[] };
      data: {
        graph: { fileCount: number; files: string[] };
        analytics: { fileCount: number };
        projectGraph: { nodes: { path?: string }[] };
        diff: { summary: { create: number } };
      };
    };

    expect(parsed.generatedFiles).toEqual([]);
    expect(parsed.plannedFiles).toEqual(parsed.virtualFileGraph.files);
    expect(parsed.data.graph).toEqual(parsed.virtualFileGraph);
    expect(parsed.data.analytics.fileCount).toBe(parsed.virtualFileGraph.fileCount);
    expect(parsed.data.diff.summary.create).toBe(parsed.virtualFileGraph.fileCount);
    expect(parsed.data.projectGraph.nodes.filter((node) => node.path).length).toBe(
      parsed.virtualFileGraph.fileCount - 1,
    );
    expect(fs.existsSync(path.join(cwd, 'dry-app'))).toBe(false);
  });

  it('classifies non-empty target conflicts as user-facing conflict JSON', async () => {
    const cwd = tempDir('structify-final-conflict-');
    const target = path.join(cwd, 'target');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'existing.txt'), 'existing');
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);

    await expect(
      handleInit(
        { yes: true, output: target },
        createCLIContext(['node', 'structify', '--json', 'init'], { json: true, cwd }),
      ),
    ).rejects.toThrow('process.exit');

    const parsed = JSON.parse(logs.join('\n')) as {
      success: boolean;
      errors: { code: string; message: string }[];
      virtualFileGraph: { fileCount: number };
    };
    expect(parsed.success).toBe(false);
    expect(parsed.errors[0]?.code).toBe('TARGET_DIRECTORY_NOT_EMPTY');
    expect(parsed.errors[0]?.message).not.toContain('INTERNAL_ERROR');
    expect(parsed.virtualFileGraph.fileCount).toBe(0);
  });

  it('emits structured verify-project JSON with summary counts', async () => {
    const cwd = tempDir('structify-final-verify-');
    const project = path.join(cwd, 'app');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await handleInit(
      { yes: true, output: project },
      createCLIContext(['node', 'structify', 'init'], { cwd }),
    );

    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });
    await handleVerifyProject(
      { path: project },
      createCLIContext(['node', 'structify', '--json', 'verify-project'], {
        json: true,
        cwd,
      }),
    );

    const parsed = JSON.parse(logs.join('\n')) as {
      success: boolean;
      summary: {
        checkedFiles: number;
        checkedScripts: number;
        checkedGraphNodes: number;
        dependencyChecks: number;
      };
    };
    expect(parsed.success).toBe(true);
    expect(parsed.summary.checkedFiles).toBeGreaterThan(0);
    expect(parsed.summary.checkedScripts).toBeGreaterThan(0);
    expect(parsed.summary.checkedGraphNodes).toBeGreaterThan(0);
    expect(parsed.summary.dependencyChecks).toBeGreaterThan(0);
  });
});
