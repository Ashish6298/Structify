export type TemplateValue = string | number | boolean | null | TemplateObject | TemplateValue[];
export interface TemplateObject {
  [key: string]: TemplateValue;
}

export interface DslPartial {
  id: string;
  content: string;
}

export interface DslRenderOptions {
  partials?: DslPartial[];
  helpers?: Record<string, (value: TemplateValue) => string>;
  maxIncludeDepth?: number;
}

export class TemplateDslEngine {
  private partials: Map<string, string>;
  private helpers: Record<string, (value: TemplateValue) => string>;
  private maxIncludeDepth: number;

  constructor(options: DslRenderOptions = {}) {
    this.partials = new Map(
      (options.partials ?? []).map((partial) => [partial.id, partial.content]),
    );
    this.helpers = {
      kebab: (value) =>
        String(value)
          .trim()
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .toLowerCase(),
      json: (value) => JSON.stringify(value),
      ...(options.helpers ?? {}),
    };
    this.maxIncludeDepth = options.maxIncludeDepth ?? 10;
  }

  public render(template: string, data: TemplateObject): string {
    return this.renderInternal(template, data, data, []);
  }

  private renderInternal(
    template: string,
    data: TemplateObject,
    root: TemplateObject,
    includeStack: string[],
  ): string {
    if (includeStack.length > this.maxIncludeDepth) {
      throw new Error('Template include depth exceeded.');
    }
    let rendered = template;

    rendered = rendered.replace(
      /\{\{>\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
      (_match, partialId: string) => {
        if (partialId.includes('..') || partialId.includes('/') || partialId.includes('\\')) {
          throw new Error(`Unsafe partial include "${partialId}".`);
        }
        if (includeStack.includes(partialId)) {
          throw new Error(`Circular include detected for partial "${partialId}".`);
        }
        const partial = this.partials.get(partialId);
        if (partial === undefined) {
          throw new Error(`Unknown partial "${partialId}".`);
        }
        return this.renderInternal(partial, data, root, [...includeStack, partialId]);
      },
    );

    rendered = rendered.replace(
      /\{\{#if\s+([a-zA-Z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, key: string, body: string) => {
        const value = this.resolveValue(key, data, root);
        return value ? this.renderInternal(body, data, root, includeStack) : '';
      },
    );

    rendered = rendered.replace(
      /\{\{#each\s+([a-zA-Z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_match, key: string, body: string) => {
        const value = this.resolveValue(key, data, root);
        if (!Array.isArray(value)) {
          throw new Error(`Loop target "${key}" is not an array.`);
        }
        return value
          .map((item) => {
            const itemData =
              item !== null && typeof item === 'object' && !Array.isArray(item)
                ? (item as TemplateObject)
                : { this: item };
            return this.renderInternal(body, itemData, root, includeStack);
          })
          .join('');
      },
    );

    rendered = rendered.replace(
      /\{\{([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_.]+)\s*\}\}/g,
      (_match, helperName: string, key: string) => {
        const helper = this.helpers[helperName];
        if (!helper) {
          throw new Error(`Unsupported helper "${helperName}".`);
        }
        return this.escape(helper(this.resolveValue(key, data, root)));
      },
    );

    rendered = rendered.replace(/\{\{([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
      return this.escape(this.resolveValue(key, data, root));
    });

    return rendered;
  }

  private resolveValue(key: string, data: TemplateObject, root: TemplateObject): TemplateValue {
    if (key.includes('..')) {
      throw new Error(`Unsafe variable path "${key}".`);
    }
    const source = key.startsWith('@root.') ? root : data;
    const parts = key.startsWith('@root.') ? key.slice(6).split('.') : key.split('.');
    let current: TemplateValue = source;
    for (const part of parts) {
      if (current === null || typeof current !== 'object' || Array.isArray(current)) {
        throw new Error(`Missing template variable "${key}".`);
      }
      current = (current as TemplateObject)[part];
      if (current === undefined) {
        throw new Error(`Missing template variable "${key}".`);
      }
    }
    return current;
  }

  private escape(value: TemplateValue): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
