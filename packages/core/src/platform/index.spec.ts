import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  DependencyGraph,
  FileTransactionEngine,
  GeneratorCompositionEngine,
  ProjectDiffEngine,
  VirtualFileGraph,
  createPluginSandboxApi,
  readEventLog,
  replayEventTimeline,
  serializeEvents,
  writeEventLog,
} from './index.js';
import { TemplateDslEngine, TemplateInheritanceEngine } from '../templates/index.js';
import { EventBus } from '../events/index.js';
import { NormalizedProjectConfig } from '../types/index.js';

const config: NormalizedProjectConfig = {
  projectName: 'platform-test',
  version: '1.0',
  mode: 'frontend-only',
  language: 'typescript',
  stack: {
    frontend: 'vite-react',
    backend: 'none',
    styling: 'mui',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
  tools: {
    docker: true,
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

describe('Phase 8 Platform Maturity Layer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `structify-platform-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('Template DSL should render variables, conditionals, loops, includes, and helpers', () => {
    const engine = new TemplateDslEngine({
      partials: [{ id: 'footer', content: 'Generated for {{projectName}}' }],
    });
    const rendered = engine.render(
      '{{kebab projectName}}\n{{#if tools.docker}}docker{{/if}}\n{{#each dependencies}}{{this}};{{/each}}\n{{> footer}}',
      {
        projectName: 'My App',
        tools: { docker: true },
        dependencies: ['react', 'vite'],
      },
    );
    expect(rendered).toContain('my-app');
    expect(rendered).toContain('docker');
    expect(rendered).toContain('react;vite;');
    expect(rendered).toContain('Generated for My App');
  });

  it('Template DSL should reject missing variables, unknown helpers, and circular includes', () => {
    expect(() => new TemplateDslEngine().render('{{missing}}', {})).toThrow('Missing');
    expect(() => new TemplateDslEngine().render('{{unsafe value}}', { value: 'x' })).toThrow(
      'Unsupported helper',
    );
    const engine = new TemplateDslEngine({
      partials: [
        { id: 'a', content: '{{> b}}' },
        { id: 'b', content: '{{> a}}' },
      ],
    });
    expect(() => engine.render('{{> a}}', {})).toThrow('Circular include');
  });

  it('Template Inheritance should resolve parent-child slots and detect circular chains', () => {
    const inheritance = new TemplateInheritanceEngine([
      {
        id: 'base',
        targetPath: 'src/App.tsx',
        content: 'base {{#slot body}}default{{/slot}}',
        slots: ['body'],
      },
      {
        id: 'child',
        parentId: 'base',
        targetPath: 'src/App.tsx',
        content: '',
        blocks: { body: 'hello {{projectName}}' },
      },
    ]);
    expect(inheritance.render('child', { projectName: 'demo' }).content).toBe('base hello demo');

    const circular = new TemplateInheritanceEngine([
      { id: 'a', parentId: 'b', targetPath: 'a', content: '' },
      { id: 'b', parentId: 'a', targetPath: 'b', content: '' },
    ]);
    expect(() => circular.validate()).toThrow('Circular');
  });

  it('Virtual File Graph should detect duplicate paths, collisions, reserved names, and dependencies', () => {
    const graph = new VirtualFileGraph();
    graph.addFile({
      targetPath: 'src/index.ts',
      content: 'one',
      sourceGenerator: 'test',
      sourceTemplate: 'test',
      conflictPolicy: 'error',
      dependencies: [],
      fileType: 'source',
      rollback: { deleteOnRollback: true, restoreBackup: false },
    });
    expect(() =>
      graph.addFile({
        targetPath: 'src/index.ts',
        content: 'two',
        sourceGenerator: 'test',
        sourceTemplate: 'test',
        conflictPolicy: 'error',
        dependencies: [],
        fileType: 'source',
        rollback: { deleteOnRollback: true, restoreBackup: false },
      }),
    ).toThrow('Content collision');
    expect(() =>
      graph.addFile({
        targetPath: 'CON',
        content: '',
        sourceGenerator: 'test',
        sourceTemplate: 'test',
        conflictPolicy: 'error',
        dependencies: [],
        fileType: 'text',
        rollback: { deleteOnRollback: true, restoreBackup: false },
      }),
    ).toThrow('reserved Windows');
  });

  it('Diff Engine should categorize create, unchanged, and conflict cases', () => {
    fs.writeFileSync(path.join(tempDir, 'same.txt'), 'same');
    fs.writeFileSync(path.join(tempDir, 'conflict.txt'), 'old');
    const graph = new VirtualFileGraph();
    for (const [targetPath, content] of [
      ['new.txt', 'new'],
      ['same.txt', 'same'],
      ['conflict.txt', 'new'],
    ]) {
      graph.addFile({
        targetPath,
        content,
        sourceGenerator: 'test',
        sourceTemplate: 'test',
        conflictPolicy: 'error',
        dependencies: [],
        fileType: 'text',
        rollback: { deleteOnRollback: true, restoreBackup: false },
      });
    }
    const diff = ProjectDiffEngine.compare(graph, tempDir);
    expect(diff.summary.create).toBe(1);
    expect(diff.summary.unchanged).toBe(1);
    expect(diff.summary.conflict).toBe(1);
  });

  it('Transaction Engine should commit files and rollback created files plus backups', () => {
    const graph = new VirtualFileGraph();
    graph.addFile({
      targetPath: 'created.txt',
      content: 'created',
      sourceGenerator: 'test',
      sourceTemplate: 'test',
      conflictPolicy: 'error',
      dependencies: [],
      fileType: 'text',
      rollback: { deleteOnRollback: true, restoreBackup: false },
    });
    const transaction = new FileTransactionEngine();
    const result = transaction.apply(graph, tempDir);
    expect(result.committed).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'created.txt'))).toBe(true);
    transaction.rollback(tempDir);
    expect(fs.existsSync(path.join(tempDir, 'created.txt'))).toBe(false);

    fs.writeFileSync(path.join(tempDir, 'overwrite.txt'), 'old');
    const overwriteGraph = new VirtualFileGraph();
    overwriteGraph.addFile({
      targetPath: 'overwrite.txt',
      content: 'new',
      sourceGenerator: 'test',
      sourceTemplate: 'test',
      conflictPolicy: 'overwrite',
      dependencies: [],
      fileType: 'text',
      rollback: { deleteOnRollback: false, restoreBackup: true },
    });
    const overwriteTransaction = new FileTransactionEngine();
    overwriteTransaction.apply(overwriteGraph, tempDir, { force: true });
    overwriteTransaction.rollback(tempDir);
    expect(fs.readFileSync(path.join(tempDir, 'overwrite.txt'), 'utf8')).toBe('old');
  });

  it('Dependency Graph should detect version and peer conflicts and produce npm plans', () => {
    const graph = new DependencyGraph();
    graph.add({
      name: 'react',
      version: '^19.0.0',
      type: 'runtime',
      target: 'root',
      packageManager: 'npm',
    });
    graph.add({
      name: 'react',
      version: '^18.0.0',
      type: 'runtime',
      target: 'root',
      packageManager: 'npm',
    });
    graph.add({
      name: 'plugin',
      version: '^1.0.0',
      type: 'dev',
      target: 'root',
      packageManager: 'npm',
      peers: { missing: '^1.0.0' },
    });
    const result = graph.resolve('npm');
    expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
    expect(result.installPlan.some((cmd) => cmd.startsWith('npm install'))).toBe(true);
  });

  it('Generator Composition should validate capabilities and ordering', () => {
    const result = new GeneratorCompositionEngine().compose([
      { id: 'frontend', provides: ['frontend'], requires: [] },
      { id: 'tailwind', provides: ['styling'], requires: ['frontend'], after: ['frontend'] },
      { id: 'prisma', provides: ['orm'], requires: ['backend'] },
    ]);
    expect(result.ordered.indexOf('frontend')).toBeLessThan(result.ordered.indexOf('tailwind'));
    expect(result.errors.some((error) => error.includes('backend'))).toBe(true);
  });

  it('Plugin Sandbox should expose restricted APIs and virtual file contributions only', async () => {
    const bus = new EventBus();
    const graph = new VirtualFileGraph();
    const diagnostics: string[] = [];
    const sandbox = createPluginSandboxApi({
      config,
      sessionId: 'sess-test',
      eventBus: bus,
      virtualFileGraph: graph,
      addDiagnostic: (message) => diagnostics.push(message),
    });
    expect(sandbox.filesystem).toBeUndefined();
    expect(sandbox.process).toBeUndefined();
    sandbox.contributeFile('plugin.txt', 'hello', 'plugin');
    sandbox.addDiagnostic('diag');
    await sandbox.emitInfo('info');
    expect(graph.list()).toHaveLength(1);
    expect(diagnostics).toEqual(['diag']);
    expect(bus.getHistory()).toHaveLength(1);
  });

  it('Event Persistence should serialize, read, and replay event logs', async () => {
    const bus = new EventBus();
    await bus.emit({
      name: 'GenerationStarted',
      sessionId: 'sess-test',
      source: 'test',
      payload: { projectName: 'demo', targetDir: tempDir },
    });
    const serialized = serializeEvents(bus.getHistory());
    expect(serialized).toContain('GenerationStarted');
    const eventPath = path.join(tempDir, 'events.ndjson');
    writeEventLog(eventPath, bus.getHistory());
    const events = readEventLog(eventPath);
    expect(replayEventTimeline(events)[0].name).toBe('GenerationStarted');
  });
});
