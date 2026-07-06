import { PlanStep } from '../types/index.js';

export interface GraphNode {
  step: PlanStep;
  dependencies: string[];
}

export class ExecutionGraph {
  private nodes = new Map<string, GraphNode>();

  public addNode(step: PlanStep, dependencies: string[] = []): void {
    if (this.nodes.has(step.id)) {
      throw new Error(`Duplicate step ID in execution graph: "${step.id}"`);
    }
    this.nodes.set(step.id, { step, dependencies });
  }

  public getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public validate(): void {
    for (const [id, node] of this.nodes.entries()) {
      for (const depId of node.dependencies) {
        if (!this.nodes.has(depId)) {
          throw new Error(`Step "${id}" depends on missing step "${depId}"`);
        }
      }
    }

    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (id: string) => {
      if (temp.has(id)) {
        throw new Error(`Cycle detected in execution graph involving step "${id}"`);
      }
      if (!visited.has(id)) {
        temp.add(id);
        const node = this.nodes.get(id);
        if (node) {
          for (const depId of node.dependencies) {
            visit(depId);
          }
        }
        temp.delete(id);
        visited.add(id);
      }
    };

    for (const id of this.nodes.keys()) {
      visit(id);
    }
  }

  public topologicalSort(): PlanStep[] {
    this.validate();
    const sorted: PlanStep[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (!visited.has(id)) {
        visited.add(id);
        const node = this.nodes.get(id);
        if (node) {
          for (const depId of node.dependencies) {
            visit(depId);
          }
          sorted.push(node.step);
        }
      }
    };

    for (const id of this.nodes.keys()) {
      visit(id);
    }

    return sorted;
  }

  public serialize(): string {
    return JSON.stringify(this.getNodes(), null, 2);
  }
}
