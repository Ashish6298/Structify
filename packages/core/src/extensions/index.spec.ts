import { describe, expect, it } from 'vitest';
import { EventBus } from '../events/index.js';
import { HookManager } from '../hooks/index.js';
import { ExecutionGraph } from '../execution/graph.js';
import { GenerationSession } from '../execution/session.js';
import { normalizeConfig } from '../normalization/index.js';
import { Registry } from '../registry/base.js';
import {
  GeneratorDefinition,
  ModuleDefinitionSdk,
  PluginManager,
  TemplateDefinition,
  createBuiltInExtensionPlugin,
  renderTemplateDefinition,
  validateGeneratorDefinition,
  validateModuleDefinition,
  validateTemplateDefinition,
} from './index.js';
import { createStructifyManifest } from '../manifest/index.js';
import { NormalizedProjectConfig } from '../types/index.js';

const config: NormalizedProjectConfig = {
  projectName: 'phase-seven',
  version: '1.0',
  mode: 'frontend-only',
  language: 'typescript',
  stack: {
    frontend: 'next',
    backend: 'none',
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

describe('Phase 7 Extension Platform', () => {
  it('Event Bus should emit typed events and notify subscribers', async () => {
    const bus = new EventBus();
    const names: string[] = [];
    bus.subscribe('GenerationStarted', (event) => {
      names.push(`${event.name}:${event.payload.projectName}`);
    });

    const event = await bus.emit({
      name: 'GenerationStarted',
      sessionId: 'sess-test',
      source: 'test',
      payload: { projectName: 'demo', targetDir: 'demo' },
    });

    expect(event.id).toBe('evt-000001');
    expect(names).toEqual(['GenerationStarted:demo']);
    expect(bus.getHistory()).toHaveLength(1);
  });

  it('Hook System should run hooks by priority and support cancellation', async () => {
    const hooks = new HookManager();
    const order: string[] = [];
    hooks.register({
      id: 'low',
      hookPoint: 'beforeGeneration',
      priority: 1,
      run: () => {
        order.push('low');
      },
    });
    hooks.register({
      id: 'high',
      hookPoint: 'beforeGeneration',
      priority: 10,
      run: (context) => {
        order.push('high');
        context.cancel('blocked');
      },
    });

    const result = await hooks.run('beforeGeneration', { sessionId: 'sess-test' });

    expect(order).toEqual(['high']);
    expect(result.cancelled).toBe(true);
    expect(result.cancellationReason).toBe('blocked');
  });

  it('Hook System should capture blocking hook errors', async () => {
    const hooks = new HookManager();
    hooks.register({
      id: 'throws',
      hookPoint: 'beforeFileWrite',
      run: () => {
        throw new Error('no write');
      },
    });

    const result = await hooks.run('beforeFileWrite', { sessionId: 'sess-test' });

    expect(result.cancelled).toBe(true);
    expect(result.errors[0].message).toBe('no write');
  });

  it('Plugin SDK should register built-in extension contributions and reject duplicates', async () => {
    const bus = new EventBus();
    const manager = new PluginManager({
      sessionId: 'sess-test',
      eventBus: bus,
      hookManager: new HookManager(),
      generatorRegistry: new Registry<GeneratorDefinition>(),
      templateRegistry: new Registry<TemplateDefinition>(),
      moduleRegistry: new Registry<ModuleDefinitionSdk>(),
    });

    await manager.register(createBuiltInExtensionPlugin());

    expect(manager.list()).toHaveLength(1);
    await expect(manager.register(createBuiltInExtensionPlugin())).rejects.toThrow(
      'Duplicate plugin id',
    );
    expect(bus.getHistory().some((event) => event.name === 'PluginLoaded')).toBe(true);
  });

  it('Generator SDK should validate metadata and contribute files', () => {
    const generator = createBuiltInExtensionPlugin().generators?.[0];
    expect(generator).toBeDefined();
    if (!generator) throw new Error('missing generator');

    validateGeneratorDefinition(generator);
    const files = generator.generateFiles?.(config) ?? [];

    expect(files.some((file) => file.path === 'package.json')).toBe(true);
  });

  it('Template SDK should validate variables, target paths, and render output', () => {
    const template: TemplateDefinition = {
      id: 'tmpl-test',
      name: 'Test Template',
      version: '1.0.0',
      description: 'A test template.',
      requiredVariables: ['projectName'],
      targetPath: 'README.md',
      render: (variables) => `# ${variables.projectName}`,
    };

    expect(validateTemplateDefinition(template).valid).toBe(true);
    expect(renderTemplateDefinition(template, { projectName: 'demo' }, config).content).toBe(
      '# demo',
    );
    expect(() => renderTemplateDefinition(template, {}, config)).toThrow(
      'Missing required template variable',
    );

    const unsafe = { ...template, id: 'unsafe', targetPath: '../README.md' };
    expect(validateTemplateDefinition(unsafe).valid).toBe(false);
  });

  it('Module SDK should validate built-in module metadata', () => {
    const moduleDefinition = createBuiltInExtensionPlugin().modules?.[0];
    expect(moduleDefinition).toBeDefined();
    if (!moduleDefinition) throw new Error('missing module');

    expect(() => validateModuleDefinition(moduleDefinition)).not.toThrow();
  });

  it('Manifest generation should include plugin, generator, stack, template, and npm metadata', () => {
    const manifest = createStructifyManifest({
      config,
      templatePaths: ['package.json', 'app/page.tsx'],
      now: new Date('2026-07-06T00:00:00.000Z'),
    });

    expect(manifest.packageManager).toBe('npm');
    expect(manifest.pluginVersions['structify-builtins']).toBe('1.0.0');
    expect(manifest.generatorVersions['gen-phase7-deterministic']).toBe('1.0.0');
    expect(manifest.stackHash).toHaveLength(64);
    expect(manifest.templateHash).toHaveLength(64);
  });

  it('GenerationSession should own extension platform references and session id', () => {
    const session = new GenerationSession({
      config,
      context: {},
      graph: new ExecutionGraph(),
      targetDir: 'target',
      sessionId: 'sess-fixed',
    });

    expect(session.sessionId).toBe('sess-fixed');
    expect(session.eventBus).toBeInstanceOf(EventBus);
    expect(session.hookManager).toBeInstanceOf(HookManager);
    expect(session.generatorRegistry.list()).toHaveLength(0);
  });

  it('npm should be the default package manager after normalization', () => {
    const result = normalizeConfig({
      projectName: 'npm-default',
      version: '1.0',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'none',
        orm: 'none',
      },
    });

    expect(result.config?.stack.packageManager).toBe('npm');
  });
});
