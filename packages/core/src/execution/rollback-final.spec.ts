import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { NormalizedProjectConfig, PlanStep } from '../types/index.js';
import { ExecutionGraph } from './graph.js';
import { GenerationEngine } from './engine.js';
import { GenerationSession } from './session.js';
import { CommandExecutor } from './executor.js';

const config: NormalizedProjectConfig = {
  projectName: 'rollback-final',
  version: '1.0',
  mode: 'frontend-only',
  language: 'typescript',
  stack: {
    frontend: 'next',
    backend: 'none',
    styling: 'tailwind',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
  tools: {
    docker: false,
    eslint: true,
    prettier: true,
    githubActions: false,
    git: false,
    editorconfig: true,
    husky: false,
    lintStaged: false,
    commitlint: false,
  },
};

let tmp: string | undefined;

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

function listRelativeFiles(root: string): string[] {
  const result: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else result.push(path.relative(root, absolute).replace(/\\/g, '/'));
    }
  };
  visit(root);
  return result.sort();
}

describe('Phase 8.2 final rollback consistency', () => {
  it('restores an existing workspace exactly after post-write failure', async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-final-rollback-'));
    const target = path.join(tmp, 'existing');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'keep.txt'), 'original', 'utf8');

    const scaffold: PlanStep = {
      id: 'scaffold',
      type: 'ScaffoldTemplate',
      targetPath: target,
      description: 'Scaffold deterministic templates',
    };
    const fail: PlanStep = {
      id: 'fail-after-write',
      type: 'RunCommand',
      targetPath: target,
      description: 'Simulate post-write failure',
      commandStep: { commandLine: 'node fail.js', cwd: target },
    };
    const graph = new ExecutionGraph();
    graph.addNode(scaffold, []);
    graph.addNode(fail, ['scaffold']);
    const executor: CommandExecutor = {
      async execute() {
        return { code: 1, stdout: '', stderr: 'simulated failure' };
      },
    };

    const session = new GenerationSession({
      config,
      context: {},
      graph,
      targetDir: target,
    });
    const result = await GenerationEngine.execute(session, { force: true, executor });

    expect(result.success).toBe(false);
    expect(result.plannedRollbackActions.length).toBeGreaterThan(0);
    expect(result.rollbackResults.length).toBe(result.plannedRollbackActions.length);
    expect(result.rollbackResults.every((rollback) => rollback.success)).toBe(true);
    expect(listRelativeFiles(target)).toEqual(['keep.txt']);
    expect(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8')).toBe('original');
  });
});
