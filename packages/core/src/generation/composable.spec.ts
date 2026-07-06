import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createComposableGenerationPlan } from './composable.js';
import { validateGeneratedProject } from '../platform/project-validator.js';
import { createServiceToken, ServiceContainer } from '../platform/service-container.js';
import { DependencyGraph } from '../platform/dependency-graph.js';
import { NormalizedProjectConfig } from '../types/index.js';

const baseConfig: NormalizedProjectConfig = {
  projectName: 'snapshot-app',
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

describe('Phase 8.1 composable generation hardening', () => {
  it('composes MVP scaffolds through capability generators and records analytics', () => {
    const plan = createComposableGenerationPlan(baseConfig);
    expect(plan.generators.map((generator) => generator.id)).toContain('gen-next');
    expect(plan.generators.map((generator) => generator.id)).toContain('gen-tailwind');
    expect(plan.projectGraph.nodes.some((node) => node.path === 'app/page.tsx')).toBe(true);
    expect(plan.analytics.generatorCount).toBe(plan.generators.length);
    expect(plan.analytics.dependencyCount).toBeGreaterThan(0);
    expect(plan.files.some((file) => file.path === 'structify.project-graph.json')).toBe(true);
  });

  it('resolves dependencies with source explanations and conflict diagnostics', () => {
    const graph = new DependencyGraph();
    graph.add({
      name: 'react',
      version: '^19.0.0',
      type: 'runtime',
      target: 'root',
      source: { generatorId: 'gen-next', reason: 'Next requires React' },
    });
    graph.add({
      name: 'react',
      version: '^18.0.0',
      type: 'runtime',
      target: 'root',
      source: { generatorId: 'gen-plugin', reason: 'Plugin requested React 18' },
    });
    const resolved = graph.resolve('npm');
    expect(resolved.conflicts[0]).toContain('Version conflict');
    expect(resolved.diagnostics[0]?.sources.map((source) => source.generatorId)).toContain(
      'gen-next',
    );
    expect(resolved.installPlan[0]).toContain('npm install');
  });

  it('provides singleton, scoped, and factory services', () => {
    const token = createServiceToken<{ value: number }>('counter');
    const factoryToken = createServiceToken<{ value: number }>('factory-counter');
    let created = 0;
    const container = new ServiceContainer();
    container.registerSingleton(token, () => ({ value: ++created }));
    container.registerFactory(factoryToken, () => ({ value: ++created }));
    expect(container.resolve(token)).toBe(container.resolve(token));
    expect(container.resolve(factoryToken)).not.toBe(container.resolve(factoryToken));
  });

  it('structurally validates generated files without installing dependencies', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-validate-'));
    const plan = createComposableGenerationPlan(baseConfig);
    for (const file of plan.files) {
      const destination = path.join(tmp, file.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, file.content, 'utf8');
    }
    const result = validateGeneratedProject(tmp);
    expect(result.valid).toBe(true);
    expect(result.projectGraph?.nodes.length).toBeGreaterThan(0);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('snapshots important generated output for supported MVP combinations', () => {
    const variants = [
      baseConfig,
      {
        ...baseConfig,
        projectName: 'vite-mui',
        stack: { ...baseConfig.stack, frontend: 'vite-react' as const, styling: 'mui' as const },
      },
      {
        ...baseConfig,
        projectName: 'express-api',
        mode: 'backend-only' as const,
        stack: {
          ...baseConfig.stack,
          frontend: 'none' as const,
          backend: 'express' as const,
          styling: 'none' as const,
        },
      },
      {
        ...baseConfig,
        projectName: 'nest-api',
        mode: 'backend-only' as const,
        stack: {
          ...baseConfig.stack,
          frontend: 'none' as const,
          backend: 'nest' as const,
          styling: 'none' as const,
        },
      },
      {
        ...baseConfig,
        projectName: 'fullstack',
        mode: 'fullstack' as const,
        stack: { ...baseConfig.stack, backend: 'express' as const },
      },
      {
        ...baseConfig,
        projectName: 'prisma-app',
        stack: { ...baseConfig.stack, database: 'postgres' as const, orm: 'prisma' as const },
      },
      {
        ...baseConfig,
        projectName: 'mongoose-app',
        stack: { ...baseConfig.stack, database: 'mongodb' as const, orm: 'mongoose' as const },
      },
      {
        ...baseConfig,
        projectName: 'docker-ci',
        tools: { ...baseConfig.tools, docker: true, githubActions: true },
      },
    ];
    expect(
      variants.map((config) => {
        const plan = createComposableGenerationPlan(config);
        const packageJson = JSON.parse(
          plan.files.find((file) => file.path === 'package.json')?.content ?? '{}',
        ) as {
          scripts?: Record<string, string>;
        };
        return {
          projectName: config.projectName,
          files: plan.files.map((file) => file.path).sort(),
          scripts: Object.keys(packageJson.scripts ?? {}).sort(),
          projectGraphSummary: plan.projectGraph.summary,
        };
      }),
    ).toMatchSnapshot();
  });
});
