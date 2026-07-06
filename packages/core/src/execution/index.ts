export * from './graph.js';
export * from './rollback.js';
export * from './executor.js';
export * from './session.js';
export * from './engine.js';

import { ExecutionPlan } from '../types/index.js';

export interface ExecutionResult {
  success: boolean;
  executedStepsCount: number;
  error?: string;
}

export async function executePlan(_plan: ExecutionPlan): Promise<ExecutionResult> {
  // Placeholder runner
  return {
    success: true,
    executedStepsCount: 0,
  };
}
