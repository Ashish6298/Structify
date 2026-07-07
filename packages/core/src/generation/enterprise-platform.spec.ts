import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  AdvancedEnterpriseTemplateEngine,
  createEnterpriseComponentGenerators,
  createEnterprisePlatformReport,
  DeterministicVariableResolutionEngine,
  EnterpriseBlueprintInheritanceSystem,
  EnterpriseDiagnosticsSubsystem,
  EnterpriseFileGenerationPlanningEngine,
  EnterpriseGeneratorSdk,
  EnterpriseRegistryArchitecture,
  EnterpriseValidationFramework,
  EnterpriseWorkspaceGenerationPlatform,
  IntelligentMergeEngine,
  LifecycleExecutionEngine,
  renderWithPhase8Compatibility,
} from './enterprise-platform.js';
import { createPhase8RenderContext, Phase8Template } from './enterprise.js';
import { NormalizedProjectConfig } from '../types/index.js';

const config: NormalizedProjectConfig = {
  projectName: 'enterprise-app',
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

describe('Phase 9-12 enterprise platform', () => {
  it('renders inheritance, nested partials, dynamic includes, conditionals, switch, ranges, filters, raw, comments, and cache profiles', () => {
    const engine = new AdvancedEnterpriseTemplateEngine();
    const templates = [
      {
        id: 'layout',
        content: 'Header\n{{#slot body}}default{{/slot}}\nFooter',
      },
      {
        id: 'dynamic-partial',
        content: 'Dynamic {{project.name | pascal}}',
      },
      {
        id: 'page',
        parentIds: ['layout'],
        aliases: ['home'],
        fragments: {
          body: '{{! hidden }}{{#if flags.enabled}}Yes{{elseif flags.pending}}Pending{{else}}No{{/if}}\n{{#switch stack.frontend}}{{case "next"}}Next{{default}}Other{{/switch}}\n{{#range 1 3}}{{this}}{{/range}}\n{{> nested}}\n{{> (partialName)}}\n{{{rawHtml}}}\n{{#raw}}{{notRendered}}{{/raw}}',
        },
        partials: {
          nested: 'Nested {{project.name | kebab}}',
        },
      },
    ];
    const context = {
      project: { name: 'Enterprise App' },
      stack: { frontend: 'next' },
      flags: { enabled: true, pending: false },
      partialName: 'dynamic-partial',
      rawHtml: '<strong>raw</strong>',
    };
    const first = engine.render('home', templates, context, { debug: true });
    const second = engine.render('home', templates, context, { debug: true });
    expect(first.content).toContain('<!-- template:page -->');
    expect(first.content).toContain('Yes');
    expect(first.content).toContain('Next');
    expect(first.content).toContain('123');
    expect(first.content).toContain('Nested enterprise-app');
    expect(first.content).toContain('Dynamic EnterpriseApp');
    expect(first.content).toContain('<strong>raw</strong>');
    expect(first.content).toContain('{{notRendered}}');
    expect(first.dependencyGraph.page).toContain('layout');
    expect(second.profile.cacheHit).toBe(true);
  });

  it('detects recursive template includes and lint failures', () => {
    const engine = new AdvancedEnterpriseTemplateEngine();
    expect(() =>
      engine.render(
        'a',
        [
          { id: 'a', content: '{{> b}}' },
          { id: 'b', content: '{{> a}}' },
        ],
        {},
      ),
    ).toThrow(/Circular template dependency/);
    expect(engine.lint({ id: 'bad', content: '{{#if enabled}}' }).valid).toBe(false);
  });

  it('resolves variables using the exact enterprise precedence and validates schemas', () => {
    const result = new DeterministicVariableResolutionEngine().resolve(
      [
        { name: 'name', source: 'globalDefaults', value: 'global', type: 'string' },
        { name: 'name', source: 'workspaceDefaults', value: 'workspace', type: 'string' },
        { name: 'name', source: 'userOverrides', value: 'user', type: 'string' },
        { name: 'mode', source: 'templateDefaults', value: 'api', enum: ['api', 'web'] },
        {
          name: 'slug',
          source: 'computedVariables',
          expression: '${name}-${mode}',
          type: 'string',
        },
        {
          name: 'settings',
          source: 'runtimeVariables',
          value: { port: 3000 },
          schema: { type: 'object', required: ['port'] },
        },
      ],
      ['name', 'mode', 'slug', 'settings'],
    );
    expect(result.values.name).toBe('user');
    expect(result.values.slug).toBe('user-api');
    expect(result.duplicateVariables).toContain('name');
    expect(result.diagnostics.filter((diag) => diag.severity === 'error')).toHaveLength(0);
  });

  it('supports multiple blueprint inheritance, composition, exclusions, search, graph, and cycle diagnostics', () => {
    const system = new EnterpriseBlueprintInheritanceSystem();
    system.register({
      id: 'base',
      version: '1.0.0',
      name: 'Base',
      structure: ['src', 'legacy'],
      tags: ['typescript'],
    });
    system.register({
      id: 'api',
      version: '1.0.0',
      name: 'API',
      structure: ['apps/api'],
      capabilities: ['rest'],
    });
    system.register({
      id: 'workspace',
      version: '1.0.0',
      name: 'Workspace',
      extends: ['base'],
      compose: ['api'],
      exclusions: ['legacy'],
      dependencies: ['base'],
      categories: ['monorepo'],
    });
    expect(system.resolve('workspace').structure).toEqual(['apps/api', 'src']);
    expect(system.search('mono').map((blueprint) => blueprint.id)).toEqual(['workspace']);
    expect(system.graph().edges).toContainEqual({
      from: 'workspace',
      to: 'base',
      relation: 'extends',
    });
  });

  it('executes lifecycle hooks with ordering, dependencies, retries, timeout metadata, and rollback', async () => {
    const engine = new LifecycleExecutionEngine();
    const order: string[] = [];
    engine.register({
      id: 'a',
      point: 'beforeGeneration',
      priority: 2,
      run: () => {
        order.push('a');
      },
      rollback: () => {
        order.push('rollback-a');
      },
    });
    engine.register({
      id: 'b',
      point: 'beforeGeneration',
      priority: 1,
      dependsOn: ['a'],
      retries: 1,
      timeoutMs: 1000,
      run: () => {
        order.push('b');
      },
    });
    const result = await engine.run('beforeGeneration');
    expect(result.executed).toEqual(['a', 'b']);
    expect(order).toEqual(['a', 'b']);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('merges enterprise file types and builds a rich planning report', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-enterprise-plan-'));
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{"dependencies":{"a":"1"}}\n');
    const merge = new IntelligentMergeEngine();
    const merged = merge.merge(
      'package.json',
      '{"dependencies":{"a":"1"}}',
      '{"dependencies":{"b":"2"}}',
    );
    expect(merged.merged).toContain('"b": "2"');
    const files = [
      {
        path: 'package.json',
        content: '{"dependencies":{"b":"2"}}\n',
        templateId: 'pkg',
        checksum: 'x',
      },
      {
        path: 'src/index.ts',
        content: 'export const ok = true;\n',
        templateId: 'src',
        checksum: 'y',
      },
    ];
    const plan = new EnterpriseFileGenerationPlanningEngine().createPlan(files, tempDir, [
      'plugin-a',
    ]);
    expect(plan.generatedFiles).toContain('src/index.ts');
    expect(plan.modifiedFiles).toContain('package.json');
    expect(plan.pluginImpactAnalysis[0].message).toContain('plugin-a');
    expect(plan.markdownReport).toContain('Enterprise Generation Plan');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates enterprise workspace files and component generator catalog entries', () => {
    const context = createPhase8RenderContext({ config });
    const files = new EnterpriseWorkspaceGenerationPlatform().generate(
      {
        name: 'enterprise-suite',
        kind: 'monorepo',
        packageManager: 'pnpm',
        orchestrator: 'turborepo',
        stacks: ['nestjs', 'fastify'],
      },
      context,
    );
    expect(files.map((file) => file.path)).toContain('packages/types/src/index.ts');
    expect(files.map((file) => file.path)).toContain('apps/api/src/app.module.ts');
    const catalog = createEnterpriseComponentGenerators();
    expect(catalog.services('billing').map((file) => file.path)).toContain(
      'src/services/billing.ts',
    );
  });

  it('registers SDK plugins, registry packages, diagnostics, validation, documentation, and reports', () => {
    const sdk = new EnterpriseGeneratorSdk();
    sdk.registerPlugin({
      templates: [{ id: 'plugin-template', content: 'ok' }],
      blueprints: [{ id: 'plugin-blueprint', version: '1.0.0', name: 'Plugin Blueprint' }],
    });
    expect(sdk.snapshot().templates).toEqual(['plugin-template']);
    expect(sdk.docs()).toContain('Structify Enterprise SDK');

    const registry = new EnterpriseRegistryArchitecture();
    const installed = registry.install({
      id: 'template.react',
      version: '1.0.0',
      source: 'github',
      location: 'github.com/acme/template.react',
    });
    expect(installed.packages[0].id).toBe('template.react');
    expect(registry.search('react').packages).toHaveLength(1);

    const validation = new EnterpriseValidationFramework().validate({
      templates: [
        { id: 'a', content: 'ok' },
        { id: 'a', content: 'duplicate' },
      ],
      registry: installed,
    });
    expect(validation.valid).toBe(false);

    const diagnostics = new EnterpriseDiagnosticsSubsystem();
    expect(
      diagnostics.report([{ code: 'x', message: 'y', severity: 'warning' }], 'markdown'),
    ).toContain('Enterprise Diagnostics');
    expect(createEnterprisePlatformReport(config).compatibility[0]).toContain('unchanged');
  });

  it('keeps Phase 8 template rendering compatible', () => {
    const context = createPhase8RenderContext({ config });
    const template: Phase8Template = {
      id: 'phase8-compatible',
      targetPath: 'README.md',
      content: '# {{project.name}}\n',
    };
    expect(renderWithPhase8Compatibility(template, context).content).toBe('# enterprise-app\n');
  });
});
