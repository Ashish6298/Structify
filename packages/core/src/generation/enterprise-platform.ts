import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import {
  CodeMergeEngine,
  ComponentGeneratorFramework,
  DocumentationGenerator,
  EnterpriseTemplateEngine,
  Phase8Blueprint,
  Phase8Compatibility,
  Phase8Generator,
  Phase8RenderedFile,
  Phase8RenderContext,
  Phase8Template,
  Phase8ValidationIssue,
  Phase8ValidationResult,
  WorkspaceGenerator,
} from './enterprise.js';
import { hashContent } from '../platform/virtual-file-graph.js';
import { NormalizedProjectConfig } from '../types/index.js';
import { TemplateObject, TemplateValue } from '../templates/dsl.js';

export type EnterpriseDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface EnterpriseDiagnostic {
  code: string;
  message: string;
  severity: EnterpriseDiagnosticSeverity;
  path?: string;
  suggestion?: string;
  phase?: string;
  durationMs?: number;
}

export interface EnterpriseTemplateSource {
  id: string;
  targetPath?: string;
  content?: string;
  parentIds?: string[];
  partials?: Record<string, string>;
  aliases?: string[];
  fragments?: Record<string, string>;
  defaults?: Record<string, TemplateValue>;
  metadata?: Record<string, TemplateValue>;
}

export interface EnterpriseTemplateRenderOptions {
  debug?: boolean;
  maxDepth?: number;
  environment?: string;
}

export interface EnterpriseTemplateRenderResult {
  content: string;
  diagnostics: EnterpriseDiagnostic[];
  sourceMap: Record<number, string>;
  dependencyGraph: Record<string, string[]>;
  profile: { durationMs: number; cacheHit: boolean; templateId: string };
}

export interface EnterpriseVariableDefinition {
  name: string;
  source: EnterpriseVariableSource;
  value?: TemplateValue;
  expression?: string;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  enum?: TemplateValue[];
  required?: boolean;
  immutable?: boolean;
  schema?: EnterpriseJsonSchema;
}

export type EnterpriseVariableSource =
  | 'globalDefaults'
  | 'workspaceDefaults'
  | 'blueprintDefaults'
  | 'generatorDefaults'
  | 'moduleDefaults'
  | 'templateDefaults'
  | 'environmentVariables'
  | 'cliVariables'
  | 'runtimeVariables'
  | 'computedVariables'
  | 'userOverrides';

export interface EnterpriseJsonSchema {
  type?: EnterpriseVariableDefinition['type'];
  required?: string[];
  enum?: TemplateValue[];
  properties?: Record<string, EnterpriseJsonSchema>;
  items?: EnterpriseJsonSchema;
}

export interface EnterpriseVariableResolutionResult {
  values: TemplateObject;
  diagnostics: EnterpriseDiagnostic[];
  unusedVariables: string[];
  duplicateVariables: string[];
  conflictingVariables: string[];
}

export interface EnterpriseBlueprint extends Omit<Phase8Blueprint, 'extends'> {
  extends?: string | string[];
  compose?: string[];
  modules?: string[];
  overrides?: Record<string, TemplateValue>;
  exclusions?: string[];
  extensionPoints?: string[];
  dependencies?: string[];
  documentation?: string;
  capabilities?: string[];
  tags?: string[];
  categories?: string[];
}

export interface EnterpriseBlueprintGraph {
  nodes: string[];
  edges: { from: string; to: string; relation: 'extends' | 'composes' | 'depends-on' }[];
  cycles: string[][];
}

export type EnterpriseHookPoint =
  | 'beforeGeneration'
  | 'beforeBlueprint'
  | 'beforeTemplate'
  | 'beforeRender'
  | 'beforeFileWrite'
  | 'afterFileWrite'
  | 'afterRender'
  | 'afterBlueprint'
  | 'afterGeneration'
  | 'onValidation'
  | 'onError'
  | 'onRollback'
  | 'onSuccess';

export interface EnterpriseHookContext {
  hookPoint: EnterpriseHookPoint;
  data: Record<string, unknown>;
  diagnostics: EnterpriseDiagnostic[];
  cancelled: boolean;
}

export interface EnterpriseHook {
  id: string;
  point: EnterpriseHookPoint;
  priority?: number;
  dependsOn?: string[];
  timeoutMs?: number;
  retries?: number;
  parallelSafe?: boolean;
  rollback?: (context: EnterpriseHookContext) => Promise<void> | void;
  run: (context: EnterpriseHookContext) => Promise<void> | void;
}

export interface EnterpriseHookExecutionResult {
  executed: string[];
  rolledBack: string[];
  diagnostics: EnterpriseDiagnostic[];
  cancelled: boolean;
  profile: Record<string, number>;
}

export type EnterpriseMergeKind =
  | 'ast'
  | 'json'
  | 'typescript'
  | 'javascript'
  | 'package-json'
  | 'tsconfig'
  | 'eslint'
  | 'prettier'
  | 'prisma'
  | 'routes'
  | 'dependencies'
  | 'imports'
  | 'exports'
  | 'config'
  | 'environment'
  | 'readme'
  | 'markdown'
  | 'yaml'
  | 'docker'
  | 'ci'
  | 'github-workflow'
  | 'ignore'
  | 'license'
  | 'text';

export interface EnterpriseMergeResult {
  path: string;
  kind: EnterpriseMergeKind;
  merged: string;
  changed: boolean;
  conflicts: EnterpriseDiagnostic[];
  strategy: 'automatic' | 'manual' | 'safe-overwrite' | 'three-way' | 'preserve';
  snapshotHash: string;
}

export interface EnterpriseGenerationPlan {
  executionGraph: Record<string, string[]>;
  dependencyGraph: Record<string, string[]>;
  fileGraph: Record<string, string[]>;
  overwriteAnalysis: EnterpriseDiagnostic[];
  mergeAnalysis: EnterpriseMergeResult[];
  generatedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  skippedFiles: string[];
  estimatedExecutionTimeMs: number;
  riskAnalysis: EnterpriseDiagnostic[];
  compatibilityAnalysis: EnterpriseDiagnostic[];
  pluginImpactAnalysis: EnterpriseDiagnostic[];
  rollbackPlan: string[];
  deterministicHash: string;
  markdownReport: string;
}

export interface EnterpriseWorkspaceRequest {
  name: string;
  kind: 'monorepo' | 'microservices' | 'libraries' | 'packages' | 'applications' | 'custom';
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'rush' | 'lerna' | 'custom';
  orchestrator?: 'turborepo' | 'nx' | 'rush' | 'lerna' | 'custom';
  stacks?: string[];
}

export interface EnterpriseRegistryPackage {
  id: string;
  version: string;
  source:
    | 'local'
    | 'git'
    | 'github'
    | 'gitlab'
    | 'bitbucket'
    | 'package'
    | 'private'
    | 'enterprise'
    | 'marketplace';
  location: string;
  checksum?: string;
  signature?: string;
  dependencies?: string[];
  compatibility?: Phase8Compatibility;
  metadata?: Record<string, TemplateValue>;
  deprecated?: boolean;
}

export interface EnterpriseRegistryResult {
  packages: EnterpriseRegistryPackage[];
  diagnostics: EnterpriseDiagnostic[];
  offline: boolean;
  cachePath: string;
}

export interface EnterpriseSdkPlugin {
  generators?: Phase8Generator[];
  blueprints?: EnterpriseBlueprint[];
  templates?: EnterpriseTemplateSource[];
  hooks?: EnterpriseHook[];
  mergeStrategies?: Partial<
    Record<EnterpriseMergeKind, (existing: string, incoming: string) => string>
  >;
  validators?: ((input: unknown) => EnterpriseDiagnostic[])[];
}

export interface EnterprisePlatformReport {
  architecture: string[];
  publicApis: string[];
  cliCommands: string[];
  compatibility: string[];
  benchmark: {
    templatesRendered: number;
    durationMs: number;
    cacheHits: number;
    deterministicHash: string;
  };
  diagnostics: EnterpriseDiagnostic[];
}

const ENTERPRISE_VARIABLE_PRECEDENCE: EnterpriseVariableSource[] = [
  'globalDefaults',
  'workspaceDefaults',
  'blueprintDefaults',
  'generatorDefaults',
  'moduleDefaults',
  'templateDefaults',
  'environmentVariables',
  'cliVariables',
  'runtimeVariables',
  'computedVariables',
  'userOverrides',
];

export class AdvancedEnterpriseTemplateEngine {
  private cache = new Map<string, EnterpriseTemplateRenderResult>();

  public render(
    templateId: string,
    templates: EnterpriseTemplateSource[],
    context: TemplateObject,
    options: EnterpriseTemplateRenderOptions = {},
  ): EnterpriseTemplateRenderResult {
    const startedAt = Date.now();
    const cacheKey = stableHash({ templateId, templates, context, options });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, profile: { ...cached.profile, cacheHit: true } };
    }
    const map = new Map<string, EnterpriseTemplateSource>();
    const aliasMap = new Map<string, string>();
    for (const template of templates) {
      map.set(template.id, template);
      for (const alias of template.aliases ?? []) aliasMap.set(alias, template.id);
    }
    const actualId = aliasMap.get(templateId) ?? templateId;
    const dependencyGraph: Record<string, string[]> = {};
    const diagnostics: EnterpriseDiagnostic[] = [];
    const sourceMap: Record<number, string> = {};
    const content = this.renderInternal(actualId, map, context, {
      stack: [],
      depth: 0,
      maxDepth: options.maxDepth ?? 25,
      diagnostics,
      dependencyGraph,
      sourceMap,
      debug: options.debug === true,
    });
    const result: EnterpriseTemplateRenderResult = {
      content,
      diagnostics,
      sourceMap,
      dependencyGraph: sortRecordArrays(dependencyGraph),
      profile: { durationMs: Date.now() - startedAt, cacheHit: false, templateId: actualId },
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  public lint(template: EnterpriseTemplateSource): Phase8ValidationResult {
    const errors: Phase8ValidationIssue[] = [];
    const warnings: Phase8ValidationIssue[] = [];
    const content = template.content ?? '';
    const opens = (content.match(/\{\{#(if|each|foreach|range|switch|match|raw)\b/g) ?? []).length;
    const closes = (content.match(/\{\{\/(if|each|foreach|range|switch|match|raw)\}\}/g) ?? [])
      .length;
    if (opens !== closes) {
      errors.push({
        code: 'template-block-mismatch',
        message: `Template "${template.id}" has ${opens} block openings and ${closes} closings.`,
      });
    }
    if (template.targetPath?.includes('..')) {
      errors.push({
        code: 'unsafe-template-path',
        message: `Template "${template.id}" contains path traversal.`,
      });
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  private renderInternal(
    templateId: string,
    templates: Map<string, EnterpriseTemplateSource>,
    context: TemplateObject,
    state: {
      stack: string[];
      depth: number;
      maxDepth: number;
      diagnostics: EnterpriseDiagnostic[];
      dependencyGraph: Record<string, string[]>;
      sourceMap: Record<number, string>;
      debug: boolean;
    },
  ): string {
    if (state.depth > state.maxDepth) {
      throw new Error(`Template recursion limit exceeded at "${templateId}".`);
    }
    if (state.stack.includes(templateId)) {
      throw new Error(
        `Circular template dependency detected: ${[...state.stack, templateId].join(' -> ')}`,
      );
    }
    const template = templates.get(templateId);
    if (!template) throw new Error(`Unknown template "${templateId}".`);
    const nextStack = [...state.stack, templateId];
    const parents = template.parentIds ?? [];
    state.dependencyGraph[templateId] = uniqueSorted([
      ...parents,
      ...Object.keys(template.partials ?? {}),
      ...extractIncludes(template.content ?? ''),
    ]);
    let content = template.content ?? '';
    if (parents.length > 0) {
      content = parents
        .map((parentId) => this.resolveLayoutContent(parentId, templates, nextStack))
        .join('\n');
      for (const [name, fragment] of Object.entries(template.fragments ?? {})) {
        content = content.replace(
          new RegExp(
            `\\{\\{#slot\\s+${escapeRegex(name)}\\s*\\}\\}[\\s\\S]*?\\{\\{/slot\\}\\}`,
            'g',
          ),
          fragment,
        );
      }
      content = content.replace(
        /\{\{#slot\s+[a-zA-Z0-9_.-]+\s*\}\}([\s\S]*?)\{\{\/slot\}\}/g,
        '$1',
      );
    }
    const scopedContext = deepFreezeObject(
      deepMerge(template.defaults ?? {}, context),
    ) as TemplateObject;
    const rendered = this.renderBlocks(content, template, templates, scopedContext, {
      ...state,
      stack: nextStack,
      depth: state.depth + 1,
    });
    rendered.split('\n').forEach((_line, index) => {
      state.sourceMap[index + 1] = templateId;
    });
    return state.debug ? `<!-- template:${templateId} -->\n${rendered}` : rendered;
  }

  private resolveLayoutContent(
    templateId: string,
    templates: Map<string, EnterpriseTemplateSource>,
    stack: string[],
  ): string {
    if (stack.includes(templateId)) {
      throw new Error(
        `Circular template dependency detected: ${[...stack, templateId].join(' -> ')}`,
      );
    }
    const template = templates.get(templateId);
    if (!template) throw new Error(`Unknown template "${templateId}".`);
    const parents = template.parentIds ?? [];
    if (parents.length === 0) return template.content ?? '';
    let content = parents
      .map((parentId) => this.resolveLayoutContent(parentId, templates, [...stack, templateId]))
      .join('\n');
    for (const [name, fragment] of Object.entries(template.fragments ?? {})) {
      content = content.replace(
        new RegExp(`\\{\\{#slot\\s+${escapeRegex(name)}\\s*\\}\\}[\\s\\S]*?\\{\\{/slot\\}\\}`, 'g'),
        fragment,
      );
    }
    return content;
  }

  private renderBlocks(
    content: string,
    template: EnterpriseTemplateSource,
    templates: Map<string, EnterpriseTemplateSource>,
    context: TemplateObject,
    state: Parameters<AdvancedEnterpriseTemplateEngine['renderInternal']>[3],
  ): string {
    let output = content;
    const rawSegments: string[] = [];
    output = output.replace(/\{\{![\s\S]*?\}\}/g, '');
    output = output.replace(/\{\{#raw\}\}([\s\S]*?)\{\{\/raw\}\}/g, (_match, raw: string) => {
      const token = `__STRUCTIFY_RAW_${rawSegments.length}__`;
      rawSegments.push(raw);
      return token;
    });
    output = output.replace(
      /\{\{>\s*([a-zA-Z0-9_.-]+|\([a-zA-Z0-9_.]+\))\s*\}\}/g,
      (_match, id: string) => {
        const partialId = id.startsWith('(')
          ? String(resolveValue(context, id.slice(1, -1)) ?? '')
          : id;
        if (
          !partialId ||
          partialId.includes('..') ||
          partialId.includes('/') ||
          partialId.includes('\\')
        ) {
          throw new Error(`Unsafe or missing partial include "${partialId}".`);
        }
        const inlinePartial = template.partials?.[partialId];
        if (inlinePartial !== undefined) {
          return this.renderBlocks(inlinePartial, template, templates, context, state);
        }
        return this.renderInternal(partialId, templates, context, state);
      },
    );
    output = output.replace(
      /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, expr: string, body: string) => {
        const sections = splitConditionalSections(body);
        const first = [{ condition: expr.trim(), body: sections.head }, ...sections.elseIfs].find(
          (section) => evaluateExpression(section.condition, context),
        );
        if (first) return this.renderBlocks(first.body, template, templates, context, state);
        return sections.elseBody
          ? this.renderBlocks(sections.elseBody, template, templates, context, state)
          : '';
      },
    );
    output = output.replace(
      /\{\{#(?:each|foreach)\s+([a-zA-Z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\/(?:each|foreach)\}\}/g,
      (_match, key: string, body: string) => {
        const value = resolveValue(context, key);
        if (!Array.isArray(value)) throw new Error(`Loop target "${key}" is not an array.`);
        return value
          .map((item, index) =>
            this.renderBlocks(
              body,
              template,
              templates,
              { ...context, this: item, index, item: asTemplateValue(item) },
              state,
            ),
          )
          .join('');
      },
    );
    output = output.replace(
      /\{\{#range\s+(-?\d+)\s+(-?\d+)\s*\}\}([\s\S]*?)\{\{\/range\}\}/g,
      (_match, startValue: string, endValue: string, body: string) => {
        const start = Number(startValue);
        const end = Number(endValue);
        const values = Array.from(
          { length: Math.max(0, end - start + 1) },
          (_value, index) => start + index,
        );
        return values
          .map((value) =>
            this.renderBlocks(body, template, templates, { ...context, this: value }, state),
          )
          .join('');
      },
    );
    output = output.replace(
      /\{\{#switch\s+([a-zA-Z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\/switch\}\}/g,
      (_match, key: string, body: string) =>
        renderSwitch(body, String(resolveValue(context, key) ?? ''), (segment) =>
          this.renderBlocks(segment, template, templates, context, state),
        ),
    );
    output = output.replace(
      /\{\{#match\s+([a-zA-Z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\/match\}\}/g,
      (_match, key: string, body: string) =>
        renderSwitch(body, String(resolveValue(context, key) ?? ''), (segment) =>
          this.renderBlocks(segment, template, templates, context, state),
        ),
    );
    output = output.replace(/\{\{\{\s*([^}]+)\s*\}\}\}/g, (_match, expr: string) =>
      String(resolveValue(context, expr.trim()) ?? ''),
    );
    output = output.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expr: string) =>
      escapeHtml(formatExpression(expr.trim(), context)),
    );
    output = output.replace(
      /__STRUCTIFY_RAW_(\d+)__/g,
      (_match, index: string) => rawSegments[Number(index)] ?? '',
    );
    return output;
  }
}

export class DeterministicVariableResolutionEngine {
  public resolve(
    definitions: EnterpriseVariableDefinition[],
    usedVariables: string[] = [],
  ): EnterpriseVariableResolutionResult {
    const diagnostics: EnterpriseDiagnostic[] = [];
    const values: TemplateObject = {};
    const seen = new Map<string, EnterpriseVariableDefinition>();
    const duplicateVariables: string[] = [];
    const conflictingVariables: string[] = [];

    for (const source of ENTERPRISE_VARIABLE_PRECEDENCE) {
      for (const definition of definitions
        .filter((candidate) => candidate.source === source)
        .sort((left, right) => left.name.localeCompare(right.name))) {
        const previous = seen.get(definition.name);
        if (previous) {
          duplicateVariables.push(definition.name);
          if (previous.immutable) {
            conflictingVariables.push(definition.name);
            diagnostics.push(
              errorDiagnostic(
                'immutable-variable-conflict',
                `Variable "${definition.name}" cannot be overridden.`,
                'Use a different variable name.',
              ),
            );
            continue;
          }
          if (JSON.stringify(previous.value) !== JSON.stringify(definition.value)) {
            conflictingVariables.push(definition.name);
          }
        }
        seen.set(definition.name, definition);
        values[definition.name] = this.evaluate(definition, definitions, values, []);
        this.validate(definition, values[definition.name], diagnostics);
      }
    }

    for (const definition of definitions) {
      if (definition.required && values[definition.name] === undefined) {
        diagnostics.push(
          errorDiagnostic(
            'missing-required-variable',
            `Missing variable "${definition.name}".`,
            `Provide ${definition.name} as a user override or CLI variable.`,
          ),
        );
      }
    }
    const unusedVariables = [...seen.keys()].filter((name) => !usedVariables.includes(name)).sort();
    for (const name of unusedVariables) {
      diagnostics.push({
        code: 'unused-variable',
        message: `Variable "${name}" was resolved but not used.`,
        severity: 'info',
        suggestion: 'Remove it or reference it from a template.',
      });
    }

    return {
      values: sortObject(values) as TemplateObject,
      diagnostics,
      unusedVariables,
      duplicateVariables: uniqueSorted(duplicateVariables),
      conflictingVariables: uniqueSorted(conflictingVariables),
    };
  }

  private evaluate(
    definition: EnterpriseVariableDefinition,
    definitions: EnterpriseVariableDefinition[],
    values: TemplateObject,
    stack: string[],
  ): TemplateValue {
    if (stack.includes(definition.name)) {
      throw new Error(
        `Circular variable reference detected: ${[...stack, definition.name].join(' -> ')}`,
      );
    }
    if (!definition.expression) return definition.value ?? null;
    return definition.expression.replace(
      /\$\{([a-zA-Z0-9_.-]+)(?::([^}]+))?\}/g,
      (_match, name: string, fallback: string | undefined) => {
        const referenced = definitions
          .filter((candidate) => candidate.name === name)
          .sort(
            (left, right) =>
              ENTERPRISE_VARIABLE_PRECEDENCE.indexOf(right.source) -
                ENTERPRISE_VARIABLE_PRECEDENCE.indexOf(left.source) ||
              right.name.localeCompare(left.name),
          )[0];
        if (referenced && referenced.name !== definition.name) {
          return String(
            this.evaluate(referenced, definitions, values, [...stack, definition.name]),
          );
        }
        const existing = resolveValue(values, name);
        if (existing !== undefined) return String(existing);
        if (!referenced) {
          if (fallback !== undefined) return fallback;
          throw new Error(`Missing variable reference "${name}".`);
        }
        return String(this.evaluate(referenced, definitions, values, [...stack, definition.name]));
      },
    );
  }

  private validate(
    definition: EnterpriseVariableDefinition,
    value: TemplateValue | undefined,
    diagnostics: EnterpriseDiagnostic[],
  ): void {
    if (value === undefined || value === null) {
      if (definition.required)
        diagnostics.push(
          errorDiagnostic('missing-variable', `Variable "${definition.name}" is required.`),
        );
      return;
    }
    if (definition.type && inferType(value) !== definition.type) {
      diagnostics.push(
        errorDiagnostic(
          'invalid-variable-type',
          `Variable "${definition.name}" expected ${definition.type} but received ${inferType(value)}.`,
        ),
      );
    }
    if (
      definition.enum &&
      !definition.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))
    ) {
      diagnostics.push(
        errorDiagnostic(
          'invalid-variable-enum',
          `Variable "${definition.name}" is outside its allowed enum.`,
        ),
      );
    }
    if (definition.schema) validateSchema(definition.name, value, definition.schema, diagnostics);
  }
}

export class EnterpriseBlueprintInheritanceSystem {
  private blueprints = new Map<string, EnterpriseBlueprint>();

  public register(blueprint: EnterpriseBlueprint): void {
    if (this.blueprints.has(blueprint.id))
      throw new Error(`Duplicate blueprint "${blueprint.id}".`);
    this.blueprints.set(blueprint.id, blueprint);
  }

  public resolve(id: string): EnterpriseBlueprint {
    return this.resolveInternal(id, []);
  }

  public search(query: string): EnterpriseBlueprint[] {
    const normalized = query.toLowerCase();
    return [...this.blueprints.values()]
      .filter((blueprint) =>
        [blueprint.id, blueprint.name, ...(blueprint.tags ?? []), ...(blueprint.categories ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  public graph(): EnterpriseBlueprintGraph {
    const edges: EnterpriseBlueprintGraph['edges'] = [];
    for (const blueprint of this.blueprints.values()) {
      for (const parent of normalizeList(blueprint.extends))
        edges.push({ from: blueprint.id, to: parent, relation: 'extends' });
      for (const composed of blueprint.compose ?? [])
        edges.push({ from: blueprint.id, to: composed, relation: 'composes' });
      for (const dependency of blueprint.dependencies ?? [])
        edges.push({ from: blueprint.id, to: dependency, relation: 'depends-on' });
    }
    return {
      nodes: [...this.blueprints.keys()].sort(),
      edges: edges.sort((left, right) =>
        `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`),
      ),
      cycles: findCycles(edges),
    };
  }

  private resolveInternal(id: string, stack: string[]): EnterpriseBlueprint {
    if (stack.includes(id))
      throw new Error(`Circular blueprint inheritance detected: ${[...stack, id].join(' -> ')}`);
    const blueprint = this.blueprints.get(id);
    if (!blueprint) throw new Error(`Missing blueprint "${id}".`);
    const parents = normalizeList(blueprint.extends).map((parentId) =>
      this.resolveInternal(parentId, [...stack, id]),
    );
    const composed = (blueprint.compose ?? []).map((composeId) =>
      this.resolveInternal(composeId, [...stack, id]),
    );
    const merged = [...parents, ...composed, blueprint].reduce(mergeEnterpriseBlueprints);
    if (blueprint.exclusions?.length) {
      merged.structure = (merged.structure ?? []).filter(
        (entry) => !blueprint.exclusions?.includes(entry),
      );
      merged.requiredTemplates = (merged.requiredTemplates ?? []).filter(
        (entry) => !blueprint.exclusions?.includes(entry),
      );
    }
    return merged;
  }
}

export class LifecycleExecutionEngine {
  private hooks: EnterpriseHook[] = [];

  public register(hook: EnterpriseHook): void {
    this.hooks.push(hook);
  }

  public async run(
    point: EnterpriseHookPoint,
    data: Record<string, unknown> = {},
  ): Promise<EnterpriseHookExecutionResult> {
    const diagnostics: EnterpriseDiagnostic[] = [];
    const context: EnterpriseHookContext = {
      hookPoint: point,
      data,
      diagnostics,
      cancelled: false,
    };
    const hooks = this.orderHooks(this.hooks.filter((hook) => hook.point === point));
    const executed: string[] = [];
    const rolledBack: string[] = [];
    const profile: Record<string, number> = {};
    try {
      for (const hook of hooks) {
        const startedAt = Date.now();
        await this.runHookWithRetries(hook, context);
        profile[hook.id] = Date.now() - startedAt;
        executed.push(hook.id);
        if (context.cancelled) break;
      }
    } catch (error) {
      diagnostics.push(errorDiagnostic('hook-execution-failed', getErrorMessage(error)));
      for (const hook of hooks.filter((hook) => executed.includes(hook.id)).reverse()) {
        if (hook.rollback) {
          await hook.rollback(context);
          rolledBack.push(hook.id);
        }
      }
    }
    return { executed, rolledBack, diagnostics, cancelled: context.cancelled, profile };
  }

  private orderHooks(hooks: EnterpriseHook[]): EnterpriseHook[] {
    const byId = new Map(hooks.map((hook) => [hook.id, hook]));
    const ordered: EnterpriseHook[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (hook: EnterpriseHook) => {
      if (visited.has(hook.id)) return;
      if (visiting.has(hook.id)) throw new Error(`Circular hook dependency at "${hook.id}".`);
      visiting.add(hook.id);
      for (const dependency of hook.dependsOn ?? []) {
        const dep = byId.get(dependency);
        if (dep) visit(dep);
      }
      visiting.delete(hook.id);
      visited.add(hook.id);
      ordered.push(hook);
    };
    for (const hook of hooks.sort(
      (left, right) =>
        (left.priority ?? 0) - (right.priority ?? 0) || left.id.localeCompare(right.id),
    ))
      visit(hook);
    return ordered;
  }

  private async runHookWithRetries(
    hook: EnterpriseHook,
    context: EnterpriseHookContext,
  ): Promise<void> {
    const attempts = (hook.retries ?? 0) + 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await withTimeout(Promise.resolve(hook.run(context)), hook.timeoutMs ?? 30000, hook.id);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}

export class IntelligentMergeEngine {
  private baseMerge = new CodeMergeEngine();

  public merge(
    pathName: string,
    existing: string,
    incoming: string,
    base?: string,
  ): EnterpriseMergeResult {
    const kind = classifyMergeKind(pathName);
    const conflicts: EnterpriseDiagnostic[] = [];
    let merged = incoming;
    let strategy: EnterpriseMergeResult['strategy'] = 'automatic';
    try {
      if (base !== undefined && existing !== base && incoming !== base) {
        strategy = 'three-way';
        merged = this.threeWay(existing, incoming, base, conflicts);
      } else if (kind === 'yaml') {
        merged = mergeUniqueLines(existing, incoming);
      } else if (
        kind === 'markdown' ||
        kind === 'readme' ||
        kind === 'ignore' ||
        kind === 'docker' ||
        kind === 'ci' ||
        kind === 'license'
      ) {
        merged = mergeUniqueLines(existing, incoming);
      } else if (kind === 'prisma') {
        merged = mergePrisma(existing, incoming);
      } else {
        merged = this.baseMerge.merge(pathName, existing, incoming);
      }
    } catch (error) {
      strategy = 'manual';
      merged = existing;
      conflicts.push(
        errorDiagnostic(
          'merge-conflict',
          getErrorMessage(error),
          'Resolve manually or run with an explicit merge strategy.',
        ),
      );
    }
    return {
      path: pathName,
      kind,
      merged,
      changed: merged !== existing,
      conflicts,
      strategy,
      snapshotHash: stableHash({
        pathName,
        existing: hashContent(existing),
        incoming: hashContent(incoming),
        merged: hashContent(merged),
      }),
    };
  }

  public preview(pathName: string, existing: string, incoming: string): EnterpriseMergeResult {
    return this.merge(pathName, existing, incoming);
  }

  private threeWay(
    existing: string,
    incoming: string,
    base: string,
    conflicts: EnterpriseDiagnostic[],
  ): string {
    if (existing === incoming) return existing;
    if (existing === base) return incoming;
    if (incoming === base) return existing;
    conflicts.push(
      errorDiagnostic(
        'three-way-conflict',
        'Both existing and incoming content changed from the base snapshot.',
      ),
    );
    return mergeUniqueLines(existing, incoming);
  }
}

export class EnterpriseFileGenerationPlanningEngine {
  public createPlan(
    files: Phase8RenderedFile[],
    targetDir: string,
    plugins: string[] = [],
  ): EnterpriseGenerationPlan {
    const merge = new IntelligentMergeEngine();
    const mergeAnalysis: EnterpriseMergeResult[] = [];
    const generatedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const overwriteAnalysis: EnterpriseDiagnostic[] = [];
    for (const file of files.sort((left, right) => left.path.localeCompare(right.path))) {
      const absolute = path.resolve(targetDir, file.path);
      if (!fs.existsSync(absolute)) {
        generatedFiles.push(file.path);
      } else {
        const existing = fs.readFileSync(absolute, 'utf8');
        if (hashContent(existing) === file.checksum) {
          skippedFiles.push(file.path);
        } else {
          modifiedFiles.push(file.path);
          mergeAnalysis.push(merge.preview(file.path, existing, file.content));
          overwriteAnalysis.push({
            code: 'overwrite-risk',
            message: `${file.path} already exists and differs from generated output.`,
            severity: 'warning',
            path: file.path,
            suggestion: 'Use merge preview before writing.',
          });
        }
      }
    }
    const executionGraph = Object.fromEntries(files.map((file) => [file.path, [] as string[]]));
    const dependencyGraph = Object.fromEntries(files.map((file) => [file.path, [] as string[]]));
    const fileGraph = Object.fromEntries(files.map((file) => [file.path, [file.templateId]]));
    const riskAnalysis = overwriteAnalysis.length
      ? overwriteAnalysis
      : [{ code: 'low-risk', message: 'No overwrite risks detected.', severity: 'info' as const }];
    const compatibilityAnalysis = [
      {
        code: 'compatible',
        message: 'Plan uses additive enterprise APIs.',
        severity: 'info' as const,
      },
    ];
    const pluginImpactAnalysis = plugins.map((plugin) => ({
      code: 'plugin-impact',
      message: `Plugin ${plugin} may contribute generation hooks or templates.`,
      severity: 'info' as const,
    }));
    const rollbackPlan = [
      ...generatedFiles.map((file) => `delete:${file}`),
      ...modifiedFiles.map((file) => `restore:${file}`),
    ].sort();
    const deterministicHash = stableHash({
      executionGraph,
      dependencyGraph,
      fileGraph,
      generatedFiles,
      modifiedFiles,
      skippedFiles,
      rollbackPlan,
    });
    return {
      executionGraph,
      dependencyGraph,
      fileGraph,
      overwriteAnalysis,
      mergeAnalysis,
      generatedFiles,
      modifiedFiles,
      deletedFiles: [],
      skippedFiles,
      estimatedExecutionTimeMs: Math.max(25, files.length * 10 + mergeAnalysis.length * 20),
      riskAnalysis,
      compatibilityAnalysis,
      pluginImpactAnalysis,
      rollbackPlan,
      deterministicHash,
      markdownReport: renderPlanMarkdown(generatedFiles, modifiedFiles, skippedFiles, rollbackPlan),
    };
  }
}

export class EnterpriseWorkspaceGenerationPlatform {
  public generate(
    request: EnterpriseWorkspaceRequest,
    context: Phase8RenderContext,
  ): Phase8RenderedFile[] {
    const workspaceKind =
      request.orchestrator === 'nx'
        ? 'nx'
        : request.orchestrator === 'turborepo'
          ? 'turborepo'
          : request.packageManager === 'pnpm'
            ? 'pnpm'
            : 'npm';
    const base = new WorkspaceGenerator().generate(workspaceKind, {
      ...context,
      project: { ...context.project, name: request.name },
    });
    const files = [
      ...base,
      generatedFile(
        'apps/api/src/index.ts',
        'export const apiService = true;\n',
        'enterprise-workspace',
      ),
      generatedFile(
        'packages/types/src/index.ts',
        'export interface SharedType { id: string }\n',
        'enterprise-workspace',
      ),
      generatedFile(
        'packages/testing/src/index.ts',
        'export const testPackage = true;\n',
        'enterprise-workspace',
      ),
      generatedFile(
        'packages/docs/README.md',
        `# ${request.name} Documentation\n`,
        'enterprise-workspace',
      ),
    ];
    if (request.stacks?.includes('nestjs'))
      files.push(
        generatedFile(
          'apps/api/src/app.module.ts',
          'export class AppModule {}\n',
          'enterprise-workspace',
        ),
      );
    if (request.stacks?.includes('fastify'))
      files.push(
        generatedFile(
          'apps/api/src/fastify.ts',
          'export const fastifyPlugin = true;\n',
          'enterprise-workspace',
        ),
      );
    return files.sort((left, right) => left.path.localeCompare(right.path));
  }
}

export class EnterpriseGeneratorSdk {
  private generators = new Map<string, Phase8Generator>();
  private blueprints = new Map<string, EnterpriseBlueprint>();
  private templates = new Map<string, EnterpriseTemplateSource>();
  private hooks = new Map<string, EnterpriseHook>();

  public registerPlugin(plugin: EnterpriseSdkPlugin): void {
    for (const generator of plugin.generators ?? [])
      this.generators.set(generator.metadata.id, generator);
    for (const blueprint of plugin.blueprints ?? []) this.blueprints.set(blueprint.id, blueprint);
    for (const template of plugin.templates ?? []) this.templates.set(template.id, template);
    for (const hook of plugin.hooks ?? []) this.hooks.set(hook.id, hook);
  }

  public docs(): string {
    return [
      '# Structify Enterprise SDK',
      '',
      `Generators: ${this.generators.size}`,
      `Blueprints: ${this.blueprints.size}`,
      `Templates: ${this.templates.size}`,
      `Hooks: ${this.hooks.size}`,
    ].join('\n');
  }

  public snapshot(): Record<string, string[]> {
    return {
      generators: [...this.generators.keys()].sort(),
      blueprints: [...this.blueprints.keys()].sort(),
      templates: [...this.templates.keys()].sort(),
      hooks: [...this.hooks.keys()].sort(),
    };
  }
}

export class EnterpriseRegistryArchitecture {
  private packages = new Map<string, EnterpriseRegistryPackage>();

  public install(pkg: EnterpriseRegistryPackage): EnterpriseRegistryResult {
    this.verify(pkg);
    this.packages.set(pkg.id, { ...pkg, checksum: pkg.checksum ?? stableHash(pkg) });
    return this.result();
  }

  public update(pkg: EnterpriseRegistryPackage): EnterpriseRegistryResult {
    return this.install(pkg);
  }

  public remove(id: string): EnterpriseRegistryResult {
    this.packages.delete(id);
    return this.result();
  }

  public search(query: string): EnterpriseRegistryResult {
    const normalized = query.toLowerCase();
    return this.result(
      [...this.packages.values()].filter((pkg) =>
        `${pkg.id} ${pkg.source}`.toLowerCase().includes(normalized),
      ),
    );
  }

  public list(): EnterpriseRegistryResult {
    return this.result();
  }

  private verify(pkg: EnterpriseRegistryPackage): void {
    if (pkg.location.includes('..'))
      throw new Error(`Registry package "${pkg.id}" has unsafe location.`);
    if (
      pkg.signature &&
      pkg.checksum &&
      pkg.signature !== stableHash({ id: pkg.id, version: pkg.version, checksum: pkg.checksum })
    ) {
      throw new Error(`Registry package "${pkg.id}" failed signature verification.`);
    }
  }

  private result(
    packages: EnterpriseRegistryPackage[] = [...this.packages.values()],
  ): EnterpriseRegistryResult {
    return {
      packages: packages.sort((left, right) => left.id.localeCompare(right.id)),
      diagnostics: [],
      offline: false,
      cachePath: '.structify/cache/registry',
    };
  }
}

export class EnterpriseValidationFramework {
  public validate(input: {
    templates?: EnterpriseTemplateSource[];
    variables?: EnterpriseVariableResolutionResult;
    blueprints?: EnterpriseBlueprintGraph;
    hooks?: EnterpriseHook[];
    plugins?: EnterpriseSdkPlugin[];
    generatedFiles?: Phase8RenderedFile[];
    registry?: EnterpriseRegistryResult;
  }): Phase8ValidationResult {
    const diagnostics: EnterpriseDiagnostic[] = [];
    const templateIds = new Set<string>();
    for (const template of input.templates ?? []) {
      if (templateIds.has(template.id))
        diagnostics.push(
          errorDiagnostic('duplicate-template', `Duplicate template "${template.id}".`),
        );
      templateIds.add(template.id);
      if (template.targetPath?.includes('..'))
        diagnostics.push(
          errorDiagnostic('unsafe-template-path', `Template "${template.id}" has an unsafe path.`),
        );
    }
    diagnostics.push(...(input.variables?.diagnostics ?? []));
    for (const cycle of input.blueprints?.cycles ?? [])
      diagnostics.push(
        errorDiagnostic('cyclic-blueprint', `Blueprint cycle detected: ${cycle.join(' -> ')}.`),
      );
    const hookIds = input.hooks?.map((hook) => hook.id) ?? [];
    for (const duplicate of duplicates(hookIds))
      diagnostics.push(errorDiagnostic('duplicate-hook', `Duplicate hook "${duplicate}".`));
    for (const pkg of input.registry?.packages ?? []) {
      if (pkg.deprecated)
        diagnostics.push({
          code: 'deprecated-registry-package',
          message: `${pkg.id} is deprecated.`,
          severity: 'warning',
        });
    }
    const errors = diagnostics.filter((diag) => diag.severity === 'error').map(toValidationIssue);
    const warnings = diagnostics.filter((diag) => diag.severity !== 'error').map(toValidationIssue);
    return { valid: errors.length === 0, errors, warnings };
  }
}

export class EnterpriseDiagnosticsSubsystem {
  public report(
    diagnostics: EnterpriseDiagnostic[],
    format: 'json' | 'markdown' | 'console' = 'json',
  ): string {
    const sorted = diagnostics.sort((left, right) =>
      `${left.severity}:${left.code}`.localeCompare(`${right.severity}:${right.code}`),
    );
    if (format === 'json') return JSON.stringify(sorted, null, 2);
    if (format === 'markdown') {
      return [
        '# Enterprise Diagnostics',
        '',
        ...sorted.map((diag) => `- **${diag.severity}** ${diag.code}: ${diag.message}`),
      ].join('\n');
    }
    return sorted
      .map((diag) => `[${diag.severity.toUpperCase()}] ${diag.code}: ${diag.message}`)
      .join('\n');
  }

  public statistics(input: {
    templates?: EnterpriseTemplateSource[];
    files?: Phase8RenderedFile[];
    variables?: EnterpriseVariableResolutionResult;
    plugins?: EnterpriseSdkPlugin[];
  }): Record<string, number> {
    return {
      templates: input.templates?.length ?? 0,
      files: input.files?.length ?? 0,
      variables: Object.keys(input.variables?.values ?? {}).length,
      variableDiagnostics: input.variables?.diagnostics.length ?? 0,
      plugins: input.plugins?.length ?? 0,
    };
  }
}

export class EnterpriseDocumentationPlatform {
  public generate(
    context: Phase8RenderContext,
    files: Phase8RenderedFile[],
    blueprints: EnterpriseBlueprint[] = [],
  ): Phase8RenderedFile[] {
    return [
      ...new DocumentationGenerator().generate(
        { renderContext: context, blueprint: blueprints[0] as Phase8Blueprint | undefined },
        files,
      ),
      generatedFile(
        'docs/enterprise-blueprints.md',
        renderBlueprintDocs(blueprints),
        'enterprise-docs',
      ),
      generatedFile(
        'docs/enterprise-variables.md',
        '# Variables\n\nGenerated variable documentation placeholder.\n',
        'enterprise-docs',
      ),
      generatedFile(
        'docs/enterprise-sdk.md',
        new EnterpriseGeneratorSdk().docs() + '\n',
        'enterprise-docs',
      ),
      generatedFile(
        'docs/generation-report.json',
        JSON.stringify({ files: files.map((file) => file.path).sort() }, null, 2) + '\n',
        'enterprise-docs',
      ),
    ].sort((left, right) => left.path.localeCompare(right.path));
  }
}

export function createEnterprisePlatformReport(
  config: NormalizedProjectConfig,
): EnterprisePlatformReport {
  const context: Phase8RenderContext = {
    project: { name: config.projectName, version: config.version, mode: config.mode },
    stack: config.stack as unknown as TemplateObject,
    answers: {},
    workspace: {},
    modules: [],
    preset: {},
    flags: {},
    variables: {},
    environment: 'development',
  };
  const templates: EnterpriseTemplateSource[] = [
    { id: 'report', content: 'Project {{project.name | kebab}} uses {{stack.packageManager}}.' },
  ];
  const engine = new AdvancedEnterpriseTemplateEngine();
  const startedAt = Date.now();
  const first = engine.render('report', templates, context);
  const second = engine.render('report', templates, context);
  return {
    architecture: [
      'AdvancedEnterpriseTemplateEngine',
      'DeterministicVariableResolutionEngine',
      'EnterpriseBlueprintInheritanceSystem',
      'LifecycleExecutionEngine',
      'IntelligentMergeEngine',
      'EnterpriseFileGenerationPlanningEngine',
      'EnterpriseWorkspaceGenerationPlatform',
      'EnterpriseGeneratorSdk',
      'EnterpriseRegistryArchitecture',
      'EnterpriseValidationFramework',
      'EnterpriseDiagnosticsSubsystem',
    ],
    publicApis: [
      'render',
      'lint',
      'resolve',
      'graph',
      'run',
      'merge',
      'createPlan',
      'generate',
      'registerPlugin',
      'install',
      'search',
      'validate',
      'report',
    ],
    cliCommands: createEnterpriseCliCommandList(),
    compatibility: [
      'Existing init/generate/add/repair/doctor/inspect/verify-project flows are unchanged.',
      'Phase 8 APIs remain exported.',
      'Enterprise APIs are opt-in.',
    ],
    benchmark: {
      templatesRendered: 2,
      durationMs: Date.now() - startedAt + first.profile.durationMs + second.profile.durationMs,
      cacheHits: second.profile.cacheHit ? 1 : 0,
      deterministicHash: stableHash({ first: first.content, second: second.content }),
    },
    diagnostics: [...first.diagnostics, ...second.diagnostics],
  };
}

export function createEnterpriseCliCommandList(): string[] {
  return [
    'registry',
    'install',
    'uninstall',
    'update',
    'search',
    'publish',
    'validate-workspace',
    'diagnose',
    'explain-generation',
    'explain-merge',
    'explain-blueprint',
    'explain-hook',
    'graph',
    'dependency-graph',
    'template-graph',
    'blueprint-graph',
    'plugin-graph',
    'workspace-report',
    'export-report',
    'profile',
    'benchmark',
    'clean-cache',
    'warm-cache',
    'migration',
    'rollback',
    'snapshot',
    'restore',
  ];
}

export function createEnterpriseComponentGenerators(): Record<
  string,
  (name: string) => Phase8RenderedFile[]
> {
  const component = new ComponentGeneratorFramework();
  const simple = (type: string, name: string) => [
    generatedFile(
      `src/${type}/${toKebab(name)}.ts`,
      `export const ${toCamel(name)} = true;\n`,
      `enterprise-${type}`,
    ),
    generatedFile(
      `src/${type}/${toKebab(name)}.test.ts`,
      `import './${toKebab(name)}';\n`,
      `enterprise-${type}`,
    ),
    generatedFile(`docs/${type}/${toKebab(name)}.md`, `# ${name}\n`, `enterprise-${type}`),
  ];
  return Object.fromEntries(
    [
      'pages',
      'layouts',
      'routes',
      'rest-apis',
      'graphql-apis',
      'services',
      'repositories',
      'controllers',
      'middleware',
      'hooks',
      'utilities',
      'authentication',
      'authorization',
      'rbac',
      'crud-modules',
      'database-models',
      'prisma-models',
      'forms',
      'dialogs',
      'tables',
      'dashboards',
      'charts',
      'workflows',
      'queues',
      'workers',
      'cron-jobs',
      'emails',
      'notifications',
      'logging',
      'monitoring',
      'analytics',
      'testing',
      'documentation',
    ].map((kind) => [
      kind,
      (name: string) => (kind === 'forms' ? component.generate({ name }) : simple(kind, name)),
    ]),
  );
}

export function renderWithPhase8Compatibility(
  template: Phase8Template,
  context: Phase8RenderContext,
): Phase8RenderedFile {
  return new EnterpriseTemplateEngine().renderTemplate(template, context);
}

function formatExpression(expr: string, context: TemplateObject): string {
  const [pathExpression, ...filters] = expr.split('|').map((part) => part.trim());
  const [pathName, fallback] = pathExpression.split('??').map((part) => part.trim());
  let value = resolveValue(context, pathName);
  if ((value === undefined || value === null || value === '') && fallback !== undefined) {
    value = fallback.replace(/^['"]|['"]$/g, '');
  }
  return filters.reduce((current, filter) => applyFilter(current, filter), String(value ?? ''));
}

function applyFilter(value: string, filter: string): string {
  if (filter === 'camel') return toCamel(value);
  if (filter === 'pascal') return toPascal(value);
  if (filter === 'snake')
    return value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  if (filter === 'kebab') return toKebab(value);
  if (filter === 'title')
    return value.replace(
      /\w\S*/g,
      (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    );
  if (filter === 'upper') return value.toUpperCase();
  if (filter === 'lower') return value.toLowerCase();
  if (filter === 'trim') return value.trim();
  if (filter === 'plural') return value.endsWith('s') ? value : `${value}s`;
  if (filter === 'singular') return value.endsWith('s') ? value.slice(0, -1) : value;
  if (filter.startsWith('indent:'))
    return value
      .split('\n')
      .map((line) => `${' '.repeat(Number(filter.split(':')[1] ?? 0))}${line}`)
      .join('\n');
  return value;
}

function evaluateExpression(expr: string, context: TemplateObject): boolean {
  const trimmed = expr.trim();
  if (trimmed.includes('==')) {
    const [left, right] = trimmed
      .split('==')
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ''));
    return String(resolveValue(context, left) ?? left) === right;
  }
  if (trimmed.includes('!=')) {
    const [left, right] = trimmed
      .split('!=')
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ''));
    return String(resolveValue(context, left) ?? left) !== right;
  }
  return Boolean(resolveValue(context, trimmed));
}

function splitConditionalSections(body: string): {
  head: string;
  elseIfs: { condition: string; body: string }[];
  elseBody?: string;
} {
  const elseMatch = body.match(/\{\{else\}\}/);
  const beforeElse = elseMatch ? body.slice(0, elseMatch.index) : body;
  const elseBody = elseMatch ? body.slice((elseMatch.index ?? 0) + '{{else}}'.length) : undefined;
  const parts = beforeElse.split(/\{\{elseif\s+([^}]+)\}\}/g);
  const head = parts[0] ?? '';
  const elseIfs: { condition: string; body: string }[] = [];
  for (let index = 1; index < parts.length; index += 2) {
    elseIfs.push({ condition: parts[index], body: parts[index + 1] ?? '' });
  }
  return { head, elseIfs, elseBody };
}

function renderSwitch(
  body: string,
  value: string,
  renderSegment: (segment: string) => string,
): string {
  const caseRegex =
    /\{\{case\s+['"]?([^'"}]+)['"]?\}\}([\s\S]*?)(?=\{\{case\s+|\{\{default\}\}|\s*$)/g;
  let match = caseRegex.exec(body);
  while (match) {
    if (match[1] === value) return renderSegment(match[2]);
    match = caseRegex.exec(body);
  }
  const defaultMatch = body.match(/\{\{default\}\}([\s\S]*)/);
  return defaultMatch ? renderSegment(defaultMatch[1]) : '';
}

function resolveValue(source: TemplateObject, key: string): TemplateValue | undefined {
  if (!key || key.includes('..')) return undefined;
  if (key === 'this') return source.this;
  let current: TemplateValue | undefined = source;
  for (const part of key.split('.')) {
    if (part === 'this') {
      current = source.this;
      continue;
    }
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as TemplateObject)[part];
  }
  return current;
}

function validateSchema(
  name: string,
  value: TemplateValue,
  schema: EnterpriseJsonSchema,
  diagnostics: EnterpriseDiagnostic[],
): void {
  if (schema.type && inferType(value) !== schema.type)
    diagnostics.push(errorDiagnostic('json-schema-type', `${name} must be ${schema.type}.`));
  if (
    schema.enum &&
    !schema.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))
  )
    diagnostics.push(errorDiagnostic('json-schema-enum', `${name} is not in the allowed enum.`));
  if (
    schema.type === 'object' &&
    schema.properties &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    for (const required of schema.required ?? []) {
      if (!((value as TemplateObject)[required] !== undefined))
        diagnostics.push(
          errorDiagnostic('json-schema-required', `${name}.${required} is required.`),
        );
    }
  }
}

function inferType(value: TemplateValue): EnterpriseVariableDefinition['type'] {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (typeof value === 'object') return 'object';
  return typeof value as 'string' | 'number' | 'boolean';
}

function classifyMergeKind(pathName: string): EnterpriseMergeKind {
  const base = path.basename(pathName).toLowerCase();
  if (base === 'package.json') return 'package-json';
  if (base === 'tsconfig.json') return 'tsconfig';
  if (base.includes('eslint')) return 'eslint';
  if (base.includes('prettier')) return 'prettier';
  if (pathName.endsWith('.json')) return 'json';
  if (pathName.endsWith('.ts') || pathName.endsWith('.tsx')) return 'typescript';
  if (pathName.endsWith('.js') || pathName.endsWith('.jsx')) return 'javascript';
  if (pathName.endsWith('.prisma')) return 'prisma';
  if (pathName.endsWith('.env')) return 'environment';
  if (base === 'readme.md') return 'readme';
  if (pathName.endsWith('.md')) return 'markdown';
  if (pathName.endsWith('.yml') || pathName.endsWith('.yaml'))
    return pathName.includes('.github') ? 'github-workflow' : 'yaml';
  if (base.startsWith('dockerfile') || base.includes('docker-compose')) return 'docker';
  if (base.endsWith('ignore')) return 'ignore';
  if (base === 'license') return 'license';
  return 'text';
}

function mergeUniqueLines(existing: string, incoming: string): string {
  return (
    uniqueSorted(
      [...existing.split(/\r?\n/), ...incoming.split(/\r?\n/)].filter(
        (line) => line.trim().length > 0,
      ),
    ).join('\n') + '\n'
  );
}

function mergePrisma(existing: string, incoming: string): string {
  return mergeUniqueLines(existing, incoming);
}

function renderPlanMarkdown(
  generated: string[],
  modified: string[],
  skipped: string[],
  rollback: string[],
): string {
  return [
    '# Enterprise Generation Plan',
    '',
    `Generated files: ${generated.length}`,
    `Modified files: ${modified.length}`,
    `Skipped files: ${skipped.length}`,
    '',
    '## Rollback',
    ...rollback.map((step) => `- ${step}`),
  ].join('\n');
}

function renderBlueprintDocs(blueprints: EnterpriseBlueprint[]): string {
  return [
    '# Blueprints',
    '',
    ...blueprints
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((blueprint) => `## ${blueprint.name}\n\n${blueprint.documentation ?? blueprint.id}\n`),
  ].join('\n');
}

function mergeEnterpriseBlueprints(
  left: EnterpriseBlueprint,
  right: EnterpriseBlueprint,
): EnterpriseBlueprint {
  return {
    ...left,
    ...right,
    structure: uniqueSorted([...(left.structure ?? []), ...(right.structure ?? [])]),
    requiredTemplates: uniqueSorted([
      ...(left.requiredTemplates ?? []),
      ...(right.requiredTemplates ?? []),
    ]),
    optionalTemplates: uniqueSorted([
      ...(left.optionalTemplates ?? []),
      ...(right.optionalTemplates ?? []),
    ]),
    modules: uniqueSorted([...(left.modules ?? []), ...(right.modules ?? [])]),
    dependencies: uniqueSorted([...(left.dependencies ?? []), ...(right.dependencies ?? [])]),
    capabilities: uniqueSorted([...(left.capabilities ?? []), ...(right.capabilities ?? [])]),
    tags: uniqueSorted([...(left.tags ?? []), ...(right.tags ?? [])]),
    categories: uniqueSorted([...(left.categories ?? []), ...(right.categories ?? [])]),
    metadata: deepMerge(left.metadata ?? {}, right.metadata ?? {}) as Record<string, TemplateValue>,
    overrides: deepMerge(left.overrides ?? {}, right.overrides ?? {}) as Record<
      string,
      TemplateValue
    >,
  };
}

function findCycles(edges: EnterpriseBlueprintGraph['edges']): string[][] {
  const graph = new Map<string, string[]>();
  for (const edge of edges) graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge.to]);
  const cycles: string[][] = [];
  const visit = (node: string, stack: string[]) => {
    if (stack.includes(node)) {
      cycles.push([...stack.slice(stack.indexOf(node)), node]);
      return;
    }
    for (const next of graph.get(node) ?? []) visit(next, [...stack, node]);
  };
  for (const node of graph.keys()) visit(node, []);
  return cycles;
}

function extractIncludes(content: string): string[] {
  return uniqueSorted(
    [...content.matchAll(/\{\{>\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1]),
  );
}

function sortRecordArrays(record: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, uniqueSorted(values)]),
  );
}

function generatedFile(filePath: string, content: string, templateId: string): Phase8RenderedFile {
  if (filePath.includes('..')) throw new Error(`Unsafe generated path "${filePath}".`);
  return {
    path: filePath.replace(/\\/g, '/'),
    content,
    templateId,
    checksum: hashContent(content),
  };
}

function errorDiagnostic(code: string, message: string, suggestion?: string): EnterpriseDiagnostic {
  return { code, message, severity: 'error', suggestion };
}

function toValidationIssue(diagnostic: EnterpriseDiagnostic): Phase8ValidationIssue {
  return { code: diagnostic.code, message: diagnostic.message, path: diagnostic.path };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated].sort();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeList(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function stableHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortObject(value)))
    .digest('hex');
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObject(value[key])]),
  );
}

function deepMerge(left: unknown, right: unknown): unknown {
  if (Array.isArray(left) || Array.isArray(right))
    return [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])];
  if (isRecord(left) && isRecord(right)) {
    const merged: Record<string, unknown> = { ...left };
    for (const [key, value] of Object.entries(right))
      merged[key] = key in merged ? deepMerge(merged[key], value) : value;
    return merged;
  }
  return right ?? left;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepFreezeObject(value: unknown): unknown {
  if (isRecord(value)) {
    for (const entry of Object.values(value)) deepFreezeObject(entry);
    return Object.freeze(value);
  }
  if (Array.isArray(value)) {
    for (const entry of value) deepFreezeObject(entry);
    return Object.freeze(value);
  }
  return value;
}

function asTemplateValue(value: unknown): TemplateValue {
  if (value === undefined) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  )
    return value;
  if (Array.isArray(value)) return value.map(asTemplateValue);
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, asTemplateValue(entry)]),
    );
  return String(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toKebab(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function toCamel(value: string): string {
  return toKebab(value).replace(/-([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function toPascal(value: string): string {
  const camel = toCamel(value);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, hookId: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Hook "${hookId}" timed out after ${timeoutMs}ms.`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
