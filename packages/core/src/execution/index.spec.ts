import { describe, it, expect } from 'vitest';
import { ExecutionGraph } from './graph.js';
import { RollbackManager } from './rollback.js';
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
});
