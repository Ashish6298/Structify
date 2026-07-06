import { TemplateDslEngine, TemplateObject } from './dsl.js';

export interface InheritableTemplate {
  id: string;
  targetPath: string;
  content: string;
  parentId?: string;
  blocks?: Record<string, string>;
  slots?: string[];
  includes?: string[];
  condition?: string;
}

export interface ResolvedTemplate {
  id: string;
  targetPath: string;
  content: string;
}

export class TemplateInheritanceEngine {
  private templates = new Map<string, InheritableTemplate>();

  constructor(templates: InheritableTemplate[]) {
    for (const template of templates) {
      if (this.templates.has(template.id)) {
        throw new Error(`Duplicate template id "${template.id}".`);
      }
      if (template.targetPath.includes('..')) {
        throw new Error(`Unsafe template target path "${template.targetPath}".`);
      }
      this.templates.set(template.id, template);
    }
  }

  public validate(): void {
    for (const template of this.templates.values()) {
      this.resolveChain(template.id, []);
      const blockNames = Object.keys(template.blocks ?? {});
      if (new Set(blockNames).size !== blockNames.length) {
        throw new Error(`Template "${template.id}" has duplicate block names.`);
      }
      for (const include of template.includes ?? []) {
        if (!this.templates.has(include)) {
          throw new Error(`Template "${template.id}" includes missing template "${include}".`);
        }
      }
    }
  }

  public render(id: string, data: TemplateObject = {}): ResolvedTemplate {
    this.validate();
    const chain = this.resolveChain(id, []);
    const base = chain[0];
    const finalTemplate = chain[chain.length - 1];
    let content = base.content;
    const allowedSlots = new Set(base.slots ?? []);

    for (const template of chain.slice(1)) {
      for (const [blockName, blockContent] of Object.entries(template.blocks ?? {})) {
        if (!allowedSlots.has(blockName)) {
          throw new Error(`Template "${template.id}" overrides unknown slot "${blockName}".`);
        }
        content = content.replace(
          new RegExp(`\\{\\{#slot\\s+${blockName}\\s*\\}\\}[\\s\\S]*?\\{\\{/slot\\}\\}`, 'g'),
          blockContent,
        );
      }
    }

    content = content.replace(/\{\{#slot\s+[a-zA-Z0-9_.-]+\s*\}\}([\s\S]*?)\{\{\/slot\}\}/g, '$1');
    const partials = [...this.templates.values()].map((template) => ({
      id: template.id,
      content: template.content,
    }));
    return {
      id,
      targetPath: finalTemplate.targetPath || base.targetPath,
      content: new TemplateDslEngine({ partials }).render(content, data),
    };
  }

  private resolveChain(id: string, stack: string[]): InheritableTemplate[] {
    if (stack.includes(id)) {
      throw new Error(`Circular template inheritance detected: ${[...stack, id].join(' -> ')}.`);
    }
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Missing parent template "${id}".`);
    }
    if (!template.parentId) {
      return [template];
    }
    return [...this.resolveChain(template.parentId, [...stack, id]), template];
  }
}
