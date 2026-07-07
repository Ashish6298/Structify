import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { FileTransactionEngine, TransactionResult } from '../platform/transaction-engine.js';
import { VirtualFileGraph, hashContent } from '../platform/virtual-file-graph.js';
import { NormalizedProjectConfig, PackageManagerOption, ProjectMode } from '../types/index.js';
import { TemplateDslEngine, TemplateObject, TemplateValue } from '../templates/dsl.js';

export type Phase8Scope =
  | 'global'
  | 'project'
  | 'module'
  | 'generator'
  | 'environment'
  | 'computed'
  | 'derived'
  | 'user'
  | 'runtime'
  | 'secret';

export type Phase8HookName =
  | 'beforeValidation'
  | 'afterValidation'
  | 'beforeRendering'
  | 'afterRendering'
  | 'beforeWrite'
  | 'afterWrite'
  | 'beforeInstall'
  | 'afterInstall'
  | 'beforeModuleGeneration'
  | 'afterModuleGeneration'
  | 'beforeWorkspaceGeneration'
  | 'afterWorkspaceGeneration'
  | 'beforeCleanup'
  | 'afterCleanup'
  | 'beforeRollback'
  | 'afterRollback'
  | 'beforeVerification'
  | 'afterVerification';

export interface Phase8Variable {
  name: string;
  scope: Phase8Scope;
  value?: TemplateValue;
  expression?: string;
  secret?: boolean;
}

export interface Phase8RenderContext extends TemplateObject {
  project: TemplateObject;
  stack: TemplateObject;
  answers: TemplateObject;
  workspace: TemplateObject;
  modules: TemplateValue[];
  preset: TemplateObject;
  flags: TemplateObject;
  variables: TemplateObject;
  environment: string;
}

export interface Phase8Template {
  id: string;
  targetPath: string;
  content: string;
  variables?: string[];
  optionalVariables?: string[];
  condition?: string;
  environment?: string[];
  parentId?: string;
  blocks?: Record<string, string>;
  transforms?: Phase8FileTransform[];
  metadata?: Record<string, TemplateValue>;
}

export interface Phase8FileTransform {
  type: 'trim' | 'ensure-final-newline' | 'json-stable' | 'uppercase' | 'lowercase';
}

export interface Phase8RenderedFile {
  path: string;
  content: string;
  templateId: string;
  generatorId?: string;
  checksum: string;
}

export interface Phase8Compatibility {
  stacks?: Partial<Record<keyof NormalizedProjectConfig['stack'], string[]>>;
  packageManagers?: string[];
  runtimes?: string[];
  operatingSystems?: string[];
  structifyVersion?: string;
  modes?: ProjectMode[];
}

export interface Phase8LifecycleHook {
  name: Phase8HookName;
  id: string;
  order?: number;
  run: (context: Phase8PipelineContext) => Promise<void> | void;
}

export interface Phase8Blueprint {
  id: string;
  version: string;
  name: string;
  extends?: string;
  structure?: string[];
  packages?: string[];
  moduleDependencies?: string[];
  requiredTemplates?: string[];
  optionalTemplates?: string[];
  hooks?: string[];
  validationRules?: string[];
  compatibility?: Phase8Compatibility;
  metadata?: Record<string, TemplateValue>;
  supportedPackageManagers?: PackageManagerOption[];
  supportedRuntimes?: string[];
  supportedOperatingSystems?: string[];
  supportedStructifyVersions?: string[];
}

export interface Phase8GeneratorInput {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: TemplateValue;
  choices?: TemplateValue[];
}

export interface Phase8GeneratorMetadata {
  id: string;
  name: string;
  version: string;
  artifactType: string;
  inputs: Phase8GeneratorInput[];
  outputs: string[];
  compatibility?: Phase8Compatibility;
  dependencies?: string[];
  validationRules?: string[];
}

export interface Phase8Generator {
  metadata: Phase8GeneratorMetadata;
  generate: (
    context: Phase8PipelineContext,
  ) => Promise<Phase8RenderedFile[]> | Phase8RenderedFile[];
}

export interface Phase8PromptDefinition {
  id: string;
  message: string;
  type: 'text' | 'boolean' | 'select' | 'multi-select' | 'searchable' | 'hidden';
  group?: string;
  choices?: TemplateValue[] | ((context: Phase8RenderContext) => TemplateValue[]);
  defaultValue?: TemplateValue | ((context: Phase8RenderContext) => TemplateValue);
  condition?: string;
  validate?: (value: TemplateValue, context: Phase8RenderContext) => true | string;
  autocomplete?: (input: string, context: Phase8RenderContext) => string[];
}

export interface Phase8ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface Phase8ValidationResult {
  valid: boolean;
  errors: Phase8ValidationIssue[];
  warnings: Phase8ValidationIssue[];
}

export type Phase8ConflictClass =
  | 'identical'
  | 'safely-mergeable'
  | 'user-modified'
  | 'generated-modified'
  | 'conflicting'
  | 'deprecated'
  | 'obsolete'
  | 'orphaned'
  | 'new';

export type Phase8MergeStrategy =
  'replace' | 'preserve' | 'merge' | 'rename' | 'backup' | 'skip' | 'interactive';

export interface Phase8Conflict {
  path: string;
  classification: Phase8ConflictClass;
  strategy: Phase8MergeStrategy;
  existingHash?: string;
  nextHash: string;
  reason: string;
}

export interface Phase8OutputPlan {
  foldersToCreate: string[];
  filesToGenerate: string[];
  filesToOverwrite: string[];
  filesToSkip: string[];
  dependenciesToInstall: string[];
  scriptsToUpdate: string[];
  configurationChanges: string[];
  estimatedGenerationTimeMs: number;
  rollbackCheckpoints: string[];
  postGenerationVerificationTasks: string[];
  conflicts: Phase8Conflict[];
  deterministicHash: string;
}

export interface Phase8Analytics {
  generationDurationMs: number;
  generatedFileCount: number;
  skippedFileCount: number;
  overwrittenFileCount: number;
  mergedFileCount: number;
  conflictsResolved: number;
  rollbackCheckpoints: number;
  installedModules: string[];
  generatedDependencies: string[];
  warnings: Phase8ValidationIssue[];
  validationResult: Phase8ValidationResult;
  verificationResult?: Phase8ValidationResult;
  deterministicHash: string;
}

export interface Phase8RegistryEntry {
  id: string;
  version: string;
  source: 'local' | 'package' | 'marketplace' | 'git' | 'user';
  location: string;
  compatibility?: Phase8Compatibility;
  supportedStacks?: string[];
  dependencies?: string[];
  author?: string;
  checksum: string;
  integrity: 'verified' | 'unverified';
  semver: string;
}

export interface Phase8PipelineContext {
  renderContext: Phase8RenderContext;
  blueprint?: Phase8Blueprint;
  generator?: Phase8GeneratorMetadata;
  plan?: Phase8OutputPlan;
  analytics?: Phase8Analytics;
  targetDir?: string;
}

const VARIABLE_PRECEDENCE: Phase8Scope[] = [
  'global',
  'project',
  'module',
  'generator',
  'environment',
  'computed',
  'derived',
  'user',
  'runtime',
  'secret',
];

export class ProjectVariableSystem {
  private variables: Phase8Variable[] = [];

  public add(variable: Phase8Variable): void {
    this.variables.push(variable);
  }

  public resolve(): TemplateObject {
    const byScope = new Map<Phase8Scope, Phase8Variable[]>();
    for (const variable of this.variables) {
      byScope.set(variable.scope, [...(byScope.get(variable.scope) ?? []), variable]);
    }

    const resolved: TemplateObject = {};
    for (const scope of VARIABLE_PRECEDENCE) {
      for (const variable of byScope.get(scope) ?? []) {
        resolved[variable.name] = this.resolveVariable(variable, resolved, []);
      }
    }
    return sortObject(resolved) as TemplateObject;
  }

  private resolveVariable(
    variable: Phase8Variable,
    current: TemplateObject,
    stack: string[],
  ): TemplateValue {
    if (stack.includes(variable.name)) {
      throw new Error(
        `Circular variable reference detected: ${[...stack, variable.name].join(' -> ')}`,
      );
    }
    if (variable.secret) {
      return `\${${variable.name}}`;
    }
    if (!variable.expression) {
      return variable.value ?? null;
    }
    return variable.expression.replace(/\$\{([a-zA-Z0-9_.-]+)\}/g, (_match, key: string) => {
      const value = resolvePath(current, key);
      if (value === undefined) {
        const referenced = this.variables.find((candidate) => candidate.name === key);
        if (!referenced) throw new Error(`Missing variable reference "${key}".`);
        return String(this.resolveVariable(referenced, current, [...stack, variable.name]));
      }
      return String(value);
    });
  }
}

export class EnterpriseTemplateEngine {
  public renderTemplates(
    templates: Phase8Template[],
    context: Phase8RenderContext,
  ): Phase8RenderedFile[] {
    const resolved = this.resolveTemplateInheritance(templates);
    const parentIds = new Set(templates.map((template) => template.parentId).filter(Boolean));
    return resolved
      .filter((template) => !parentIds.has(template.id))
      .filter((template) => this.shouldRender(template, context))
      .map((template) => this.renderTemplate(template, context))
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  public renderTemplate(
    template: Phase8Template,
    context: Phase8RenderContext,
  ): Phase8RenderedFile {
    const dsl = new TemplateDslEngine({
      partials: [],
      helpers: {
        pascal: (value) =>
          String(value)
            .replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_match, _sep, char: string) =>
              char.toUpperCase(),
            )
            .replace(/[^a-zA-Z0-9]/g, ''),
      },
    });
    const renderedPath = dsl.render(template.targetPath, context);
    const rawContent = dsl.render(template.content, context);
    const content = this.applyTransforms(rawContent, template.transforms ?? []);
    return {
      path: normalizeGeneratedPath(renderedPath),
      content,
      templateId: template.id,
      checksum: hashContent(content),
    };
  }

  private resolveTemplateInheritance(templates: Phase8Template[]): Phase8Template[] {
    const map = new Map(templates.map((template) => [template.id, template]));
    return [...map.keys()].map((id) => this.resolveOne(id, map, []));
  }

  private resolveOne(
    id: string,
    map: Map<string, Phase8Template>,
    stack: string[],
  ): Phase8Template {
    if (stack.includes(id)) {
      throw new Error(`Cyclic template inheritance detected: ${[...stack, id].join(' -> ')}`);
    }
    const template = map.get(id);
    if (!template) throw new Error(`Missing template "${id}".`);
    if (!template.parentId) return template;
    const parent = this.resolveOne(template.parentId, map, [...stack, id]);
    let content = parent.content;
    for (const [blockName, block] of Object.entries(template.blocks ?? {})) {
      content = content.replace(
        new RegExp(`\\{\\{#slot\\s+${blockName}\\s*\\}\\}[\\s\\S]*?\\{\\{/slot\\}\\}`, 'g'),
        block,
      );
    }
    content = content.replace(/\{\{#slot\s+[a-zA-Z0-9_.-]+\s*\}\}([\s\S]*?)\{\{\/slot\}\}/g, '$1');
    return {
      ...parent,
      ...template,
      content,
      variables: [...(parent.variables ?? []), ...(template.variables ?? [])],
    };
  }

  private shouldRender(template: Phase8Template, context: Phase8RenderContext): boolean {
    if (template.environment && !template.environment.includes(context.environment)) return false;
    if (!template.condition) return true;
    return Boolean(resolvePath(context, template.condition));
  }

  private applyTransforms(content: string, transforms: Phase8FileTransform[]): string {
    let next = content;
    for (const transform of transforms) {
      if (transform.type === 'trim') next = next.trim();
      if (transform.type === 'ensure-final-newline' && !next.endsWith('\n')) next += '\n';
      if (transform.type === 'uppercase') next = next.toUpperCase();
      if (transform.type === 'lowercase') next = next.toLowerCase();
      if (transform.type === 'json-stable')
        next = JSON.stringify(sortObject(JSON.parse(next)), null, 2) + '\n';
    }
    return next;
  }
}

export class BlueprintSystem {
  private blueprints = new Map<string, Phase8Blueprint>();

  public register(blueprint: Phase8Blueprint): void {
    if (this.blueprints.has(blueprint.id))
      throw new Error(`Duplicate blueprint "${blueprint.id}".`);
    this.blueprints.set(blueprint.id, blueprint);
  }

  public list(): Phase8Blueprint[] {
    return [...this.blueprints.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  public resolve(id: string): Phase8Blueprint {
    return this.resolveInternal(id, []);
  }

  private resolveInternal(id: string, stack: string[]): Phase8Blueprint {
    if (stack.includes(id)) {
      throw new Error(`Cyclic blueprint inheritance detected: ${[...stack, id].join(' -> ')}`);
    }
    const blueprint = this.blueprints.get(id);
    if (!blueprint) throw new Error(`Missing blueprint "${id}".`);
    if (!blueprint.extends) return clone(blueprint);
    return mergeBlueprints(this.resolveInternal(blueprint.extends, [...stack, id]), blueprint);
  }
}

export class GeneratorFramework {
  private generators = new Map<string, Phase8Generator>();

  public register(generator: Phase8Generator): void {
    if (this.generators.has(generator.metadata.id)) {
      throw new Error(`Duplicate generator "${generator.metadata.id}".`);
    }
    this.generators.set(generator.metadata.id, generator);
  }

  public list(): Phase8GeneratorMetadata[] {
    return [...this.generators.values()]
      .map((generator) => generator.metadata)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  public async execute(id: string, context: Phase8PipelineContext): Promise<Phase8RenderedFile[]> {
    const generator = this.generators.get(id);
    if (!generator) throw new Error(`Unknown generator "${id}".`);
    context.generator = generator.metadata;
    const files = await generator.generate(context);
    return files
      .map((file) => ({
        ...file,
        generatorId: generator.metadata.id,
        checksum: file.checksum || hashContent(file.content),
      }))
      .sort((left, right) => left.path.localeCompare(right.path));
  }
}

export class TypedPromptEngine {
  public resolveDefaults(
    prompts: Phase8PromptDefinition[],
    context: Phase8RenderContext,
  ): Record<string, TemplateValue> {
    const answers: Record<string, TemplateValue> = {};
    for (const prompt of prompts.sort((left, right) => left.id.localeCompare(right.id))) {
      if (prompt.condition && !resolvePath(context, prompt.condition)) continue;
      const value =
        typeof prompt.defaultValue === 'function'
          ? prompt.defaultValue(context)
          : (prompt.defaultValue ?? null);
      const validation = prompt.validate?.(value, context);
      if (validation && validation !== true) throw new Error(validation);
      answers[prompt.id] = value;
    }
    return answers;
  }
}

export class TemplateValidator {
  public validate(input: {
    templates: Phase8Template[];
    blueprints?: Phase8Blueprint[];
    context: Phase8RenderContext;
    generators?: Phase8GeneratorMetadata[];
  }): Phase8ValidationResult {
    const errors: Phase8ValidationIssue[] = [];
    const warnings: Phase8ValidationIssue[] = [];
    const ids = new Set(input.templates.map((template) => template.id));
    const paths = new Set<string>();

    for (const template of input.templates) {
      if (template.parentId && !ids.has(template.parentId)) {
        errors.push({
          code: 'missing-template-parent',
          message: `Template "${template.id}" extends missing "${template.parentId}".`,
        });
      }
      const target = normalizeGeneratedPath(template.targetPath.replace(/\{\{.*?\}\}/g, 'token'));
      if (paths.has(target)) {
        errors.push({
          code: 'duplicate-generated-path',
          message: `Duplicate generated path "${target}".`,
          path: target,
        });
      }
      paths.add(target);
      for (const variable of template.variables ?? []) {
        if (resolvePath(input.context, variable) === undefined) {
          errors.push({
            code: 'missing-variable',
            message: `Template "${template.id}" requires missing variable "${variable}".`,
          });
        }
      }
      for (const reference of extractTemplateReferences(template.content)) {
        if (
          resolvePath(input.context, reference) === undefined &&
          !reference.startsWith('@root.')
        ) {
          errors.push({
            code: 'invalid-template-reference',
            message: `Template "${template.id}" references missing "${reference}".`,
          });
        }
      }
    }

    try {
      const system = new BlueprintSystem();
      for (const blueprint of input.blueprints ?? []) system.register(blueprint);
      for (const blueprint of input.blueprints ?? []) system.resolve(blueprint.id);
    } catch (error) {
      errors.push({ code: 'invalid-blueprint-inheritance', message: getErrorMessage(error) });
    }

    for (const generator of input.generators ?? []) {
      const duplicateOutput = generator.outputs.find(
        (output, index) => generator.outputs.indexOf(output) !== index,
      );
      if (duplicateOutput) {
        errors.push({
          code: 'conflicting-generator-output',
          message: `Generator "${generator.id}" duplicates "${duplicateOutput}".`,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

export class LifecycleHookRunner {
  private hooks: Phase8LifecycleHook[] = [];

  public register(hook: Phase8LifecycleHook): void {
    this.hooks.push(hook);
  }

  public async run(name: Phase8HookName, context: Phase8PipelineContext): Promise<void> {
    const hooks = this.hooks
      .filter((hook) => hook.name === name)
      .sort(
        (left, right) => (left.order ?? 0) - (right.order ?? 0) || left.id.localeCompare(right.id),
      );
    for (const hook of hooks) await hook.run(context);
  }
}

export class OutputPlanningEngine {
  public plan(
    files: Phase8RenderedFile[],
    targetDir: string,
    dependencies: string[] = [],
  ): Phase8OutputPlan {
    const conflicts = new FileConflictResolver().classify(files, targetDir);
    const foldersToCreate = uniqueSorted(
      files.map((file) => path.posix.dirname(file.path)).filter((dir) => dir !== '.'),
    );
    const filesToGenerate = conflicts
      .filter((conflict) => conflict.classification === 'new')
      .map((conflict) => conflict.path);
    const filesToOverwrite = conflicts
      .filter((conflict) =>
        ['generated-modified', 'safely-mergeable'].includes(conflict.classification),
      )
      .map((conflict) => conflict.path);
    const filesToSkip = conflicts
      .filter((conflict) => conflict.strategy === 'skip' || conflict.classification === 'identical')
      .map((conflict) => conflict.path);
    const planPayload = {
      foldersToCreate,
      filesToGenerate,
      filesToOverwrite,
      filesToSkip,
      dependencies,
    };
    return {
      foldersToCreate,
      filesToGenerate,
      filesToOverwrite,
      filesToSkip,
      dependenciesToInstall: uniqueSorted(dependencies),
      scriptsToUpdate: [],
      configurationChanges: files
        .filter((file) => file.path.endsWith('.json') || file.path.endsWith('.yml'))
        .map((file) => file.path)
        .sort(),
      estimatedGenerationTimeMs: Math.max(25, files.length * 12),
      rollbackCheckpoints: files.map((file) => `before:${file.path}`).sort(),
      postGenerationVerificationTasks: ['validate-template', 'verify-project'],
      conflicts,
      deterministicHash: stableHash(planPayload),
    };
  }
}

export class FileConflictResolver {
  public classify(files: Phase8RenderedFile[], targetDir: string): Phase8Conflict[] {
    return files
      .map((file) => this.classifyOne(file, targetDir))
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  private classifyOne(file: Phase8RenderedFile, targetDir: string): Phase8Conflict {
    const destination = path.resolve(targetDir, file.path);
    if (!fs.existsSync(destination)) {
      return {
        path: file.path,
        classification: 'new',
        strategy: 'replace',
        nextHash: file.checksum,
        reason: 'File will be created.',
      };
    }
    const existing = fs.readFileSync(destination, 'utf8');
    const existingHash = hashContent(existing);
    if (existingHash === file.checksum) {
      return {
        path: file.path,
        classification: 'identical',
        strategy: 'skip',
        existingHash,
        nextHash: file.checksum,
        reason: 'Existing file is identical.',
      };
    }
    if (isMergeable(file.path)) {
      return {
        path: file.path,
        classification: 'safely-mergeable',
        strategy: 'merge',
        existingHash,
        nextHash: file.checksum,
        reason: 'Structured merge is available.',
      };
    }
    const generatedMarker =
      existing.includes('@generated by Structify') ||
      existing.includes('generatedBy": "structify"');
    return {
      path: file.path,
      classification: generatedMarker ? 'generated-modified' : 'user-modified',
      strategy: generatedMarker ? 'backup' : 'preserve',
      existingHash,
      nextHash: file.checksum,
      reason: generatedMarker
        ? 'Generated file changed since last run.'
        : 'User-owned file differs.',
    };
  }
}

export class CodeMergeEngine {
  public merge(pathName: string, existing: string, incoming: string): string {
    if (pathName.endsWith('.json') || path.basename(pathName) === 'package.json') {
      return (
        JSON.stringify(sortObject(deepMerge(JSON.parse(existing), JSON.parse(incoming))), null, 2) +
        '\n'
      );
    }
    if (pathName.endsWith('.ts') || pathName.endsWith('.tsx')) {
      return mergeTypeScript(existing, incoming);
    }
    if (pathName.endsWith('.env')) {
      return mergeEnv(existing, incoming);
    }
    return existing === incoming ? existing : `${existing.trimEnd()}\n${incoming.trimEnd()}\n`;
  }
}

export class WorkspaceGenerator {
  public generate(
    kind: 'npm' | 'pnpm' | 'turborepo' | 'nx',
    context: Phase8RenderContext,
  ): Phase8RenderedFile[] {
    const projectName = String(context.project.name ?? 'workspace');
    const files: Phase8RenderedFile[] = [
      file(
        'package.json',
        JSON.stringify(
          { name: projectName, private: true, workspaces: ['apps/*', 'packages/*'] },
          null,
          2,
        ) + '\n',
        'workspace',
      ),
      file('packages/shared/src/index.ts', 'export const sharedPackage = true;\n', 'workspace'),
      file('apps/web/src/index.ts', 'export const app = true;\n', 'workspace'),
      file(
        'tsconfig.json',
        JSON.stringify(
          { references: [{ path: 'packages/shared' }, { path: 'apps/web' }] },
          null,
          2,
        ) + '\n',
        'workspace',
      ),
      file(
        'docs/dependency-graph.md',
        '# Dependency Graph\n\n- apps/web -> packages/shared\n',
        'workspace',
      ),
    ];
    if (kind === 'pnpm')
      files.push(
        file('pnpm-workspace.yaml', 'packages:\n  - "apps/*"\n  - "packages/*"\n', 'workspace'),
      );
    if (kind === 'turborepo')
      files.push(
        file(
          'turbo.json',
          JSON.stringify({ tasks: { build: { dependsOn: ['^build'] } } }, null, 2) + '\n',
          'workspace',
        ),
      );
    if (kind === 'nx')
      files.push(
        file(
          'nx.json',
          JSON.stringify({ npmScope: projectName, affected: { defaultBase: 'main' } }, null, 2) +
            '\n',
          'workspace',
        ),
      );
    return files.sort((left, right) => left.path.localeCompare(right.path));
  }
}

export class ComponentGeneratorFramework {
  public generate(schema: {
    name: string;
    framework?: 'react';
    props?: Record<string, string>;
  }): Phase8RenderedFile[] {
    const name = toPascal(schema.name);
    const propEntries = Object.entries(schema.props ?? {});
    const propType = propEntries.length
      ? propEntries.map(([key, type]) => `  ${key}: ${type};`).join('\n')
      : '  children?: React.ReactNode;';
    return [
      file(
        `src/components/${name}.tsx`,
        `import React from 'react';\n\nexport interface ${name}Props {\n${propType}\n}\n\nexport function ${name}(props: ${name}Props) {\n  return <section>{props.children}</section>;\n}\n`,
        'component',
      ),
      file(
        `src/components/${name}.test.tsx`,
        `import { ${name} } from './${name}';\n\ndescribe('${name}', () => {\n  it('exports the component', () => {\n    expect(${name}).toBeDefined();\n  });\n});\n`,
        'component',
      ),
      file(
        `src/components/${name}.stories.tsx`,
        `import { ${name} } from './${name}';\n\nexport default { component: ${name}, title: 'Components/${name}' };\nexport const Basic = {};\n`,
        'component',
      ),
      file(
        `src/components/${name}.md`,
        `# ${name}\n\nGenerated component documentation and examples.\n`,
        'component',
      ),
      file('src/components/index.ts', `export * from './${name}';\n`, 'component'),
      file(
        `.structify/components/${name}.json`,
        JSON.stringify({ name, generatedBy: 'structify' }, null, 2) + '\n',
        'component',
      ),
    ].sort((left, right) => left.path.localeCompare(right.path));
  }
}

export class DocumentationGenerator {
  public generate(
    context: Phase8PipelineContext,
    files: Phase8RenderedFile[],
  ): Phase8RenderedFile[] {
    const name = String(context.renderContext.project.name ?? 'Structify Project');
    const fileList = files
      .map((generated) => `- ${generated.path}`)
      .sort()
      .join('\n');
    return [
      file(
        'README.md',
        `# ${name}\n\nGenerated by Structify Phase 8.\n\n## Files\n\n${fileList}\n`,
        'documentation',
      ),
      file(
        'docs/architecture.md',
        `# Architecture\n\nBlueprint: ${context.blueprint?.id ?? 'none'}\n\n## Folders\n\n${uniqueSorted(
          files.map((generated) => path.posix.dirname(generated.path)),
        )
          .map((dir) => `- ${dir}`)
          .join('\n')}\n`,
        'documentation',
      ),
      file(
        'docs/environment.md',
        `# Environment\n\nActive environment: ${context.renderContext.environment}\n`,
        'documentation',
      ),
      file(
        'docs/commands.md',
        '# Commands\n\n- structify generate\n- structify plan\n- structify render\n',
        'documentation',
      ),
      file(
        'docs/metadata.md',
        JSON.stringify(
          sortObject({
            project: context.renderContext.project,
            blueprint: context.blueprint?.id ?? null,
          }),
          null,
          2,
        ) + '\n',
        'documentation',
      ),
    ];
  }
}

export class GenerationAnalyticsEngine {
  public collect(input: {
    startedAt: number;
    files: Phase8RenderedFile[];
    plan: Phase8OutputPlan;
    validation: Phase8ValidationResult;
    modules?: string[];
    dependencies?: string[];
    verification?: Phase8ValidationResult;
  }): Phase8Analytics {
    return {
      generationDurationMs: Date.now() - input.startedAt,
      generatedFileCount: input.plan.filesToGenerate.length,
      skippedFileCount: input.plan.filesToSkip.length,
      overwrittenFileCount: input.plan.filesToOverwrite.length,
      mergedFileCount: input.plan.conflicts.filter((conflict) => conflict.strategy === 'merge')
        .length,
      conflictsResolved: input.plan.conflicts.filter(
        (conflict) => conflict.classification !== 'new' && conflict.classification !== 'identical',
      ).length,
      rollbackCheckpoints: input.plan.rollbackCheckpoints.length,
      installedModules: uniqueSorted(input.modules ?? []),
      generatedDependencies: uniqueSorted(input.dependencies ?? []),
      warnings: input.validation.warnings,
      validationResult: input.validation,
      verificationResult: input.verification,
      deterministicHash: stableHash(
        input.files.map((generated) => [generated.path, generated.checksum]),
      ),
    };
  }
}

export class TemplateRegistryDiscovery {
  public discover(locations: string[]): Phase8RegistryEntry[] {
    const entries: Phase8RegistryEntry[] = [];
    for (const location of locations.sort()) {
      if (!fs.existsSync(location)) continue;
      const stat = fs.statSync(location);
      const files = stat.isDirectory()
        ? fs
            .readdirSync(location)
            .filter((name) => name.endsWith('.json'))
            .map((name) => path.join(location, name))
        : [location];
      for (const filePath of files.sort()) {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content) as Partial<Phase8RegistryEntry> & {
          id: string;
          version?: string;
        };
        entries.push({
          id: parsed.id,
          version: parsed.version ?? '1.0.0',
          source: parsed.source ?? 'local',
          location: filePath,
          compatibility: parsed.compatibility,
          supportedStacks: parsed.supportedStacks ?? [],
          dependencies: parsed.dependencies ?? [],
          author: parsed.author,
          checksum: createHash('sha256').update(content).digest('hex'),
          integrity: 'verified',
          semver: parsed.semver ?? `^${parsed.version ?? '1.0.0'}`,
        });
      }
    }
    return entries.sort((left, right) => left.id.localeCompare(right.id));
  }
}

export class EnterpriseGenerationPipeline {
  public async run(input: {
    templates: Phase8Template[];
    context: Phase8RenderContext;
    targetDir: string;
    blueprint?: Phase8Blueprint;
    dryRun?: boolean;
    dependencies?: string[];
    hooks?: LifecycleHookRunner;
  }): Promise<{
    files: Phase8RenderedFile[];
    plan: Phase8OutputPlan;
    analytics: Phase8Analytics;
    transaction?: TransactionResult;
  }> {
    const startedAt = Date.now();
    const pipelineContext: Phase8PipelineContext = {
      renderContext: input.context,
      blueprint: input.blueprint,
      targetDir: input.targetDir,
    };
    await input.hooks?.run('beforeValidation', pipelineContext);
    const validation = new TemplateValidator().validate({
      templates: input.templates,
      context: input.context,
      blueprints: input.blueprint ? [input.blueprint] : [],
    });
    await input.hooks?.run('afterValidation', pipelineContext);
    if (!validation.valid)
      throw new Error(validation.errors.map((issue) => issue.message).join('\n'));

    await input.hooks?.run('beforeRendering', pipelineContext);
    const files = new EnterpriseTemplateEngine().renderTemplates(input.templates, input.context);
    await input.hooks?.run('afterRendering', pipelineContext);
    const plan = new OutputPlanningEngine().plan(files, input.targetDir, input.dependencies);
    pipelineContext.plan = plan;
    const analytics = new GenerationAnalyticsEngine().collect({
      startedAt,
      files,
      plan,
      validation,
      dependencies: input.dependencies,
    });
    pipelineContext.analytics = analytics;
    if (input.dryRun) return { files, plan, analytics };

    await input.hooks?.run('beforeWrite', pipelineContext);
    const graph = new VirtualFileGraph();
    for (const generated of files) {
      graph.addFile({
        targetPath: generated.path,
        content: generated.content,
        sourceGenerator: generated.generatorId ?? 'phase8-template-engine',
        sourceTemplate: generated.templateId,
        conflictPolicy: 'error',
        dependencies: [],
        fileType: classifyVirtualFile(generated.path),
        rollback: { deleteOnRollback: true, restoreBackup: true },
      });
    }
    const transaction = new FileTransactionEngine().apply(graph, input.targetDir);
    await input.hooks?.run('afterWrite', pipelineContext);
    return { files, plan, analytics, transaction };
  }
}

export function createPhase8RenderContext(input: {
  config: NormalizedProjectConfig;
  answers?: TemplateObject;
  workspace?: TemplateObject;
  modules?: TemplateValue[];
  flags?: TemplateObject;
  variables?: Phase8Variable[];
  environment?: string;
}): Phase8RenderContext {
  const variables = new ProjectVariableSystem();
  variables.add({ name: 'projectName', scope: 'project', value: input.config.projectName });
  variables.add({
    name: 'packageManager',
    scope: 'project',
    value: input.config.stack.packageManager,
  });
  for (const variable of input.variables ?? []) variables.add(variable);
  const resolvedVariables = variables.resolve();
  return {
    project: {
      name: input.config.projectName,
      version: input.config.version,
      mode: input.config.mode,
    },
    stack: input.config.stack as unknown as TemplateObject,
    answers: input.answers ?? {},
    workspace: input.workspace ?? {},
    modules: input.modules ?? [],
    preset: (input.config.preset ?? {}) as unknown as TemplateObject,
    flags: input.flags ?? {},
    variables: resolvedVariables,
    environment: input.environment ?? 'development',
  };
}

export function createBuiltInPhase8Templates(): Phase8Template[] {
  return [
    {
      id: 'base-readme',
      targetPath: 'README.md',
      content: '# {{project.name}}\n\nStack: {{stack.frontend}} / {{stack.backend}}\n',
      variables: ['project.name', 'stack.frontend', 'stack.backend'],
      transforms: [{ type: 'ensure-final-newline' }],
    },
    {
      id: 'package-json',
      targetPath: 'package.json',
      content: '{"name":"{{project.name}}","version":"{{project.version}}","private":true}',
      variables: ['project.name', 'project.version'],
      transforms: [{ type: 'json-stable' }],
    },
  ];
}

export function createBuiltInPhase8Blueprints(): Phase8Blueprint[] {
  return [
    {
      id: 'typescript-application',
      version: '1.0.0',
      name: 'TypeScript Application',
      structure: ['src', 'docs', 'tests'],
      requiredTemplates: ['base-readme', 'package-json'],
      moduleDependencies: [],
      compatibility: { packageManagers: ['npm'], structifyVersion: '>=1.0.0' },
      supportedPackageManagers: ['npm'],
      supportedRuntimes: ['node'],
      supportedOperatingSystems: ['linux', 'darwin', 'win32'],
      supportedStructifyVersions: ['>=1.0.0'],
    },
    {
      id: 'fullstack-workspace',
      version: '1.0.0',
      name: 'Fullstack Workspace',
      extends: 'typescript-application',
      structure: ['apps/web', 'apps/api', 'packages/shared'],
      optionalTemplates: ['workspace-package'],
      metadata: { workspace: true },
    },
  ];
}

function file(pathName: string, content: string, templateId: string): Phase8RenderedFile {
  return {
    path: normalizeGeneratedPath(pathName),
    content,
    templateId,
    checksum: hashContent(content),
  };
}

function normalizeGeneratedPath(pathName: string): string {
  if (pathName.includes('..')) throw new Error(`Unsafe generated path "${pathName}".`);
  return path.posix.normalize(pathName.replace(/\\/g, '/'));
}

function resolvePath(source: TemplateObject, key: string): TemplateValue | undefined {
  const normalized = key.startsWith('@root.') ? key.slice(6) : key;
  let current: TemplateValue | undefined = source;
  for (const part of normalized.split('.')) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as TemplateObject)[part];
    if (current === undefined) return undefined;
  }
  return current;
}

function extractTemplateReferences(content: string): string[] {
  const references = new Set<string>();
  const regex = /\{\{(?:#if\s+|#each\s+|[a-zA-Z0-9_]+\s+)?([@a-zA-Z0-9_.]+)\s*\}\}/g;
  let match = regex.exec(content);
  while (match) {
    const reference = match[1];
    if (!reference.startsWith('/')) references.add(reference);
    match = regex.exec(content);
  }
  return [...references].sort();
}

function mergeBlueprints(parent: Phase8Blueprint, child: Phase8Blueprint): Phase8Blueprint {
  return {
    ...parent,
    ...child,
    structure: uniqueSorted([...(parent.structure ?? []), ...(child.structure ?? [])]),
    packages: uniqueSorted([...(parent.packages ?? []), ...(child.packages ?? [])]),
    moduleDependencies: uniqueSorted([
      ...(parent.moduleDependencies ?? []),
      ...(child.moduleDependencies ?? []),
    ]),
    requiredTemplates: uniqueSorted([
      ...(parent.requiredTemplates ?? []),
      ...(child.requiredTemplates ?? []),
    ]),
    optionalTemplates: uniqueSorted([
      ...(parent.optionalTemplates ?? []),
      ...(child.optionalTemplates ?? []),
    ]),
    hooks: uniqueSorted([...(parent.hooks ?? []), ...(child.hooks ?? [])]),
    validationRules: uniqueSorted([
      ...(parent.validationRules ?? []),
      ...(child.validationRules ?? []),
    ]),
    compatibility: deepMerge(
      parent.compatibility ?? {},
      child.compatibility ?? {},
    ) as Phase8Compatibility,
    metadata: deepMerge(parent.metadata ?? {}, child.metadata ?? {}) as Record<
      string,
      TemplateValue
    >,
  };
}

function deepMerge(left: unknown, right: unknown): unknown {
  if (Array.isArray(left) || Array.isArray(right)) {
    return uniqueSorted(
      [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].map(String),
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const result: Record<string, unknown> = { ...left };
    for (const key of Object.keys(right).sort()) {
      result[key] = key in result ? deepMerge(result[key], right[key]) : right[key];
    }
    return result;
  }
  return right ?? left;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function stableHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortObject(value)))
    .digest('hex');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMergeable(pathName: string): boolean {
  return (
    pathName.endsWith('.json') ||
    path.basename(pathName) === 'package.json' ||
    pathName.endsWith('.ts') ||
    pathName.endsWith('.tsx') ||
    pathName.endsWith('.env')
  );
}

function mergeTypeScript(existing: string, incoming: string): string {
  const imports = uniqueSorted(
    [...existing.split('\n'), ...incoming.split('\n')].filter((line) => line.startsWith('import ')),
  );
  const existingBody = existing
    .split('\n')
    .filter((line) => !line.startsWith('import '))
    .join('\n')
    .trim();
  const incomingBody = incoming
    .split('\n')
    .filter((line) => !line.startsWith('import '))
    .join('\n')
    .trim();
  return `${imports.join('\n')}\n\n${existingBody}\n${incomingBody ? `\n${incomingBody}\n` : '\n'}`;
}

function mergeEnv(existing: string, incoming: string): string {
  const entries = new Map<string, string>();
  for (const line of `${existing}\n${incoming}`.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const [key] = line.split('=');
    entries.set(key, line);
  }
  return [...entries.values()].sort().join('\n') + '\n';
}

function toPascal(value: string): string {
  return value
    .replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_match, _sep, char: string) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function classifyVirtualFile(pathName: string): 'text' | 'json' | 'config' | 'source' | 'asset' {
  if (pathName.endsWith('.json')) return 'json';
  if (pathName.endsWith('.ts') || pathName.endsWith('.tsx')) return 'source';
  if (pathName.startsWith('.') || pathName.endsWith('.yml') || pathName.endsWith('.yaml'))
    return 'config';
  return 'text';
}
