export interface ComposableGenerator {
  id: string;
  provides: string[];
  requires: string[];
  after?: string[];
  incompatibleWith?: string[];
}

export interface GeneratorCompositionResult {
  ordered: string[];
  errors: string[];
  capabilities: string[];
}

export class GeneratorCompositionEngine {
  public compose(generators: ComposableGenerator[]): GeneratorCompositionResult {
    const provided = new Map<string, string>();
    const errors: string[] = [];
    for (const generator of generators) {
      for (const capability of generator.provides) {
        const existing = provided.get(capability);
        if (existing) {
          errors.push(
            `Duplicate provider for capability "${capability}": ${existing}, ${generator.id}`,
          );
        }
        provided.set(capability, generator.id);
      }
    }
    for (const generator of generators) {
      for (const required of generator.requires) {
        if (!provided.has(required)) {
          errors.push(`Generator "${generator.id}" requires missing capability "${required}".`);
        }
      }
      for (const incompatible of generator.incompatibleWith ?? []) {
        if (generators.some((candidate) => candidate.id === incompatible)) {
          errors.push(`Generator "${generator.id}" is incompatible with "${incompatible}".`);
        }
      }
    }
    return {
      ordered: [...generators]
        .sort((left, right) => {
          if (left.after?.includes(right.id)) return 1;
          if (right.after?.includes(left.id)) return -1;
          return left.id.localeCompare(right.id);
        })
        .map((generator) => generator.id),
      errors,
      capabilities: [...provided.keys()].sort(),
    };
  }
}
