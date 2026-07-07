import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  BlueprintSystem,
  CodeMergeEngine,
  ComponentGeneratorFramework,
  createBuiltInPhase8Blueprints,
  createBuiltInPhase8Templates,
  createPhase8RenderContext,
  DocumentationGenerator,
  EnterpriseGenerationPipeline,
  EnterpriseTemplateEngine,
  FileConflictResolver,
  GenerationAnalyticsEngine,
  LifecycleHookRunner,
  OutputPlanningEngine,
  ProjectVariableSystem,
  TemplateRegistryDiscovery,
  TemplateValidator,
  TypedPromptEngine,
  WorkspaceGenerator,
} from './enterprise.js';
import { NormalizedProjectConfig } from '../types/index.js';

const config: NormalizedProjectConfig = {
  projectName: 'phase8-app',
  version: '1.0.0',
  mode: 'fullstack',
  language: 'typescript',
  stack: {
    frontend: 'next',
    backend: 'express',
    styling: 'tailwind',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
  tools: {
    docker: false,
    eslint: true,
    prettier: true,
    githubActions: false,
    git: false,
    editorconfig: true,
    husky: false,
    lintStaged: false,
    commitlint: false,
  },
};

describe('Phase 8 enterprise generation engine', () => {
  it('renders deterministic templates with variables, conditionals, loops, helpers, inheritance, and transforms', () => {
    const context = createPhase8RenderContext({
      config,
      answers: { enabled: true, items: [{ name: 'first' }, { name: 'second' }] },
    });
    const rendered = new EnterpriseTemplateEngine().renderTemplates(
      [
        {
          id: 'base',
          targetPath: 'src/{{kebab project.name}}.ts',
          content: '{{#slot body}}base{{/slot}}',
        },
        {
          id: 'child',
          parentId: 'base',
          targetPath: 'src/{{kebab project.name}}.ts',
          content: '',
          blocks: {
            body: '{{#if answers.enabled}}{{#each answers.items}}{{name}}\n{{/each}}{{/if}}',
          },
          transforms: [{ type: 'ensure-final-newline' }],
        },
      ],
      context,
    );
    expect(rendered).toEqual([
      expect.objectContaining({
        path: 'src/phase8-app.ts',
        content: 'first\nsecond\n',
      }),
    ]);
  });

  it('resolves blueprint inheritance without mutating parents', () => {
    const system = new BlueprintSystem();
    for (const blueprint of createBuiltInPhase8Blueprints()) system.register(blueprint);
    const resolved = system.resolve('fullstack-workspace');
    expect(resolved.structure).toContain('src');
    expect(resolved.structure).toContain('apps/web');
    expect(system.resolve('typescript-application').structure).not.toContain('apps/web');
  });

  it('resolves variable precedence and detects circular references', () => {
    const variables = new ProjectVariableSystem();
    variables.add({ name: 'name', scope: 'global', value: 'base' });
    variables.add({ name: 'name', scope: 'project', value: 'project' });
    variables.add({ name: 'slug', scope: 'computed', expression: '${name}-api' });
    expect(variables.resolve()).toMatchObject({ name: 'project', slug: 'project-api' });

    const circular = new ProjectVariableSystem();
    circular.add({ name: 'a', scope: 'computed', expression: '${b}' });
    circular.add({ name: 'b', scope: 'computed', expression: '${a}' });
    expect(() => circular.resolve()).toThrow(/Circular variable/);
  });

  it('uses schema-driven prompt defaults and validation', () => {
    const context = createPhase8RenderContext({ config });
    const answers = new TypedPromptEngine().resolveDefaults(
      [
        {
          id: 'route',
          message: 'Route',
          type: 'text',
          defaultValue: (ctx) => `/${ctx.project.name}`,
          validate: (value) => (String(value).startsWith('/') ? true : 'Route must start with /'),
        },
      ],
      context,
    );
    expect(answers.route).toBe('/phase8-app');
  });

  it('validates missing variables and duplicate rendered paths before generation', () => {
    const context = createPhase8RenderContext({ config });
    const result = new TemplateValidator().validate({
      context,
      templates: [
        { id: 'a', targetPath: 'same.ts', content: '{{missing.value}}' },
        { id: 'b', targetPath: 'same.ts', content: 'ok' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain('invalid-template-reference');
    expect(result.errors.map((error) => error.code)).toContain('duplicate-generated-path');
  });

  it('plans dry runs and classifies conflicts without overwriting user files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-phase8-plan-'));
    fs.writeFileSync(path.join(tempDir, 'README.md'), 'user content');
    const context = createPhase8RenderContext({ config });
    const files = new EnterpriseTemplateEngine().renderTemplates(
      createBuiltInPhase8Templates(),
      context,
    );
    const conflicts = new FileConflictResolver().classify(files, tempDir);
    const plan = new OutputPlanningEngine().plan(files, tempDir, ['react']);
    expect(conflicts.find((conflict) => conflict.path === 'README.md')?.classification).toBe(
      'user-modified',
    );
    expect(plan.dependenciesToInstall).toEqual(['react']);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('merges structured code and configuration predictably', () => {
    const merge = new CodeMergeEngine();
    expect(
      merge.merge('package.json', '{"dependencies":{"a":"1"}}', '{"dependencies":{"b":"2"}}'),
    ).toContain('"b": "2"');
    expect(
      merge.merge(
        'src/index.ts',
        "import a from 'a';\nexport const a1 = a;",
        "import b from 'b';\nexport const b1 = b;",
      ),
    ).toContain("import b from 'b';");
    expect(merge.merge('.env', 'A=1\n', 'B=2\nA=3\n')).toBe('A=3\nB=2\n');
  });

  it('generates workspace, component, documentation, and analytics artifacts', () => {
    const context = createPhase8RenderContext({ config });
    const workspace = new WorkspaceGenerator().generate('turborepo', context);
    const component = new ComponentGeneratorFramework().generate({ name: 'user-card' });
    const docs = new DocumentationGenerator().generate({ renderContext: context }, workspace);
    const plan = new OutputPlanningEngine().plan(workspace, os.tmpdir());
    const validation = { valid: true, errors: [], warnings: [] };
    const analytics = new GenerationAnalyticsEngine().collect({
      startedAt: Date.now(),
      files: workspace,
      plan,
      validation,
    });
    expect(workspace.map((file) => file.path)).toContain('turbo.json');
    expect(component.map((file) => file.path)).toContain('src/components/UserCard.stories.tsx');
    expect(docs.map((file) => file.path)).toContain('docs/architecture.md');
    expect(analytics.generatedFileCount).toBeGreaterThan(0);
  });

  it('discovers template registry entries with verified checksums', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-phase8-registry-'));
    fs.writeFileSync(
      path.join(tempDir, 'entry.json'),
      JSON.stringify({ id: 'template.react', version: '2.0.0', author: 'Structify' }),
    );
    const entries = new TemplateRegistryDiscovery().discover([tempDir]);
    expect(entries).toEqual([
      expect.objectContaining({ id: 'template.react', version: '2.0.0', integrity: 'verified' }),
    ]);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('executes lifecycle hooks and rolls back failed writes through the transaction engine', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-phase8-pipeline-'));
    fs.writeFileSync(path.join(tempDir, 'README.md'), 'user content');
    const context = createPhase8RenderContext({ config });
    const hooks = new LifecycleHookRunner();
    const order: string[] = [];
    hooks.register({
      name: 'beforeValidation',
      id: 'a',
      run: () => {
        order.push('beforeValidation');
      },
    });
    hooks.register({
      name: 'afterValidation',
      id: 'b',
      run: () => {
        order.push('afterValidation');
      },
    });
    const pipeline = new EnterpriseGenerationPipeline();
    const dryRun = await pipeline.run({
      templates: createBuiltInPhase8Templates(),
      context,
      targetDir: tempDir,
      dryRun: true,
      hooks,
    });
    expect(order).toEqual(['beforeValidation', 'afterValidation']);
    expect(dryRun.plan.filesToOverwrite).toHaveLength(0);
    await expect(
      pipeline.run({
        templates: createBuiltInPhase8Templates(),
        context,
        targetDir: tempDir,
      }),
    ).rejects.toThrow(/File conflict/);
    expect(fs.readFileSync(path.join(tempDir, 'README.md'), 'utf8')).toBe('user content');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
