import { RollbackAction } from '../types/index.js';

export class RollbackManager {
  private stack: RollbackAction[] = [];

  public push(action: RollbackAction): void {
    if (!action.id || !action.type || !action.targetPath) {
      throw new Error('Rollback action must have an id, type, and targetPath.');
    }
    this.stack.push(action);
  }

  public getStack(): RollbackAction[] {
    return [...this.stack];
  }

  public getReverseStack(): RollbackAction[] {
    return [...this.stack].reverse();
  }

  public clear(): void {
    this.stack = [];
  }

  public serialize(): string {
    return JSON.stringify(this.stack, null, 2);
  }
}
