import { EventEmitter } from 'events';
import { describe, it, expect, vi } from 'vitest';
import { ExecutionGraph } from './graph.js';
import { RollbackManager } from './rollback.js';
import { DefaultCommandExecutor } from './executor.js';
import { PlanStep } from '../types/index.js';

describe('Execution Graph & Rollback Manager', () => {
  describe('ExecutionGraph', () => {
    it('should topologically sort steps and detect cycles', () => {
      const graph = new ExecutionGraph();
      const step1: PlanStep = {
        id: 'step-1',
        type: 'CreateFolder',
        targetPath: './a',
        description: 'desc 1',
      };
      const step2: PlanStep = {
        id: 'step-2',
        type: 'WriteFile',
        targetPath: './b',
        description: 'desc 2',
      };
      const step3: PlanStep = {
        id: 'step-3',
        type: 'RunCommand',
        targetPath: './c',
        description: 'desc 3',
      };

      graph.addNode(step1, []);
      graph.addNode(step2, ['step-1']);
      graph.addNode(step3, ['step-2']);

      const sorted = graph.topologicalSort();
      expect(sorted.map((s) => s.id)).toEqual(['step-1', 'step-2', 'step-3']);

      const graphCycle = new ExecutionGraph();
      graphCycle.addNode(step1, ['step-2']);
      graphCycle.addNode(step2, ['step-1']);
      expect(() => graphCycle.topologicalSort()).toThrow('Cycle detected');
    });
  });

  describe('RollbackManager', () => {
    it('should track rollback steps in LIFO order', () => {
      const rm = new RollbackManager();
      rm.push({ id: 'r1', type: 'DeleteFile', targetPath: './f1', description: 'r1' });
      rm.push({ id: 'r2', type: 'DeleteFolder', targetPath: './f2', description: 'r2' });

      expect(rm.getReverseStack().map((r) => r.id)).toEqual(['r2', 'r1']);
    });
  });

  describe('DefaultCommandExecutor', () => {
    it('should spawn commands without shell launchers or visible Windows consoles', async () => {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: () => void;
      };
      child.stdout = stdout;
      child.stderr = stderr;
      child.kill = vi.fn();
      const spawnCommand = vi.fn().mockReturnValue(child);

      const resultPromise = new DefaultCommandExecutor(spawnCommand).execute(
        'node',
        ['--version'],
        {
          cwd: 'project',
        },
      );
      process.nextTick(() => {
        stdout.emit('data', 'v20.0.0\n');
        child.emit('close', 0);
      });

      await expect(resultPromise).resolves.toEqual({
        code: 0,
        stdout: 'v20.0.0\n',
        stderr: '',
      });
      expect(spawnCommand).toHaveBeenCalledWith('node', ['--version'], {
        cwd: 'project',
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      expect(spawnCommand).not.toHaveBeenCalledWith(
        expect.stringMatching(/^(cmd|cmd\.exe|powershell|powershell\.exe)$/i),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
