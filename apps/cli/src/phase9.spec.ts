import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCLIContext } from './context.js';
import { handleInit } from './commands/init.js';
import { handleAdd } from './commands/add.js';
import { handleInspect } from './commands/inspect.js';
import { handleRepair } from './commands/repair.js';
import { handleUpgrade } from './commands/upgrade.js';
import { handleVerifyProject } from './commands/verify-project.js';

let tmp: string | undefined;

function makeTmp(): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-cli-phase9-'));
  return tmp;
}

async function generatedProject(): Promise<string> {
  const cwd = makeTmp();
  const project = path.join(cwd, 'app');
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  await handleInit(
    { yes: true, output: project },
    createCLIContext(['node', 'structify', 'init'], { cwd }),
  );
  vi.restoreAllMocks();
  return project;
}

async function captureJson(fn: () => Promise<void>): Promise<Record<string, unknown>> {
  const logs: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
    logs.push(String(message));
  });
  await fn();
  vi.restoreAllMocks();
  return JSON.parse(logs.join('\n')) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

describe('Phase 9 CLI workflows', () => {
  it('adds Docker with --yes and reports already-present on second run', async () => {
    const project = await generatedProject();
    const first = await captureJson(() =>
      handleAdd(
        'docker',
        { yes: true, path: project },
        createCLIContext(['node', 'structify', '--json', 'add'], { json: true, cwd: project }),
      ),
    );
    expect(first.success).toBe(true);
    expect(fs.existsSync(path.join(project, 'Dockerfile'))).toBe(true);

    const second = await captureJson(() =>
      handleAdd(
        'docker',
        { dryRun: true, path: project },
        createCLIContext(['node', 'structify', '--json', 'add'], { json: true, cwd: project }),
      ),
    );
    expect(second.code).toBe('MODULE_ALREADY_PRESENT');
  });

  it('returns dry-run plans for upgrade and repair', async () => {
    const project = await generatedProject();
    const upgrade = await captureJson(() =>
      handleUpgrade(
        { dryRun: true, path: project },
        createCLIContext(['node', 'structify', '--json', 'upgrade'], { json: true, cwd: project }),
      ),
    );
    expect(upgrade.command).toBe('upgrade');

    fs.rmSync(path.join(project, 'structify.project-graph.json'));
    const repair = await captureJson(() =>
      handleRepair(
        { dryRun: true, path: project },
        createCLIContext(['node', 'structify', '--json', 'repair'], { json: true, cwd: project }),
      ),
    );
    expect(repair.command).toBe('repair');
  });

  it('inspect reports drift and verify-project strict fails on drift', async () => {
    const project = await generatedProject();
    fs.appendFileSync(path.join(project, 'README.md'), '\nmanual edit\n');
    const inspect = await captureJson(() =>
      handleInspect(
        { path: project },
        createCLIContext(['node', 'structify', '--json', 'inspect'], { json: true, cwd: project }),
      ),
    );
    const data = inspect.data as { driftReport: { hasDrift: boolean } };
    expect(data.driftReport.hasDrift).toBe(true);

    const verify = await captureJson(() =>
      handleVerifyProject(
        { path: project, strict: true },
        createCLIContext(['node', 'structify', '--json', 'verify-project'], {
          json: true,
          cwd: project,
        }),
      ),
    );
    expect(verify.success).toBe(false);
  });
});
