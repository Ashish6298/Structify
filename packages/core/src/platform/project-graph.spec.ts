import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { hashStable } from '../manifest/index.js';
import { createComposableGenerationPlan } from '../generation/composable.js';
import { NormalizedProjectConfig } from '../types/index.js';
import { validateGeneratedProject } from './project-validator.js';

const baseConfig: NormalizedProjectConfig = {
  projectName: 'graph-app',
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

describe('Project Graph focused verification', () => {
  it('Project Graph creates nodes and edges', () => {
    const graph = createComposableGenerationPlan(baseConfig).projectGraph;
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.nodes.some((node) => node.id === 'app:root')).toBe(true);
  });

  it('Project Graph summary counts node types', () => {
    const graph = createComposableGenerationPlan(baseConfig).projectGraph;
    expect(graph.summary.app).toBe(1);
    expect(graph.summary.page).toBeGreaterThanOrEqual(1);
    expect(graph.summary['config-file']).toBeGreaterThan(0);
  });

  it('Project Graph serializes consistently with manifest metadata', () => {
    const plan = createComposableGenerationPlan(baseConfig);
    const manifest = JSON.parse(
      plan.files.find((file) => file.path === 'structify.manifest.json')?.content ?? '{}',
    ) as { stackHash: string; projectGraphSummary: unknown };
    expect(JSON.parse(JSON.stringify(plan.projectGraph)).stackHash).toBe(
      hashStable(baseConfig.stack),
    );
    expect(manifest.stackHash).toBe(plan.projectGraph.stackHash);
    expect(manifest.projectGraphSummary).toEqual(plan.projectGraph.summary);
  });

  it('Project Graph validates frontend graph output', () => {
    const graph = createComposableGenerationPlan(baseConfig).projectGraph;
    expect(graph.nodes.some((node) => node.path === 'app/page.tsx')).toBe(true);
    expect(graph.nodes.some((node) => node.path === 'app/layout.tsx')).toBe(true);
  });

  it('Project Graph validates backend graph output', () => {
    const plan = createComposableGenerationPlan({
      ...baseConfig,
      mode: 'backend-only',
      stack: { ...baseConfig.stack, frontend: 'none', backend: 'express', styling: 'none' },
    });
    expect(plan.projectGraph.nodes.some((node) => node.path === 'src/app.ts')).toBe(true);
    expect(plan.projectGraph.nodes.some((node) => node.type === 'api-endpoint')).toBe(true);
  });

  it('Project Graph validates database graph output', () => {
    const plan = createComposableGenerationPlan({
      ...baseConfig,
      mode: 'backend-only',
      stack: {
        ...baseConfig.stack,
        frontend: 'none',
        backend: 'express',
        styling: 'none',
        database: 'postgres',
        orm: 'prisma',
      },
    });
    expect(plan.projectGraph.nodes.some((node) => node.path === 'src/db/prisma.ts')).toBe(true);
    expect(plan.projectGraph.nodes.some((node) => node.path === 'prisma/schema.prisma')).toBe(true);
  });

  it('Project Graph validates fullstack graph output', () => {
    const plan = createComposableGenerationPlan({
      ...baseConfig,
      mode: 'fullstack',
      stack: { ...baseConfig.stack, backend: 'express' },
    });
    expect(plan.projectGraph.nodes.some((node) => node.path === 'frontend/app/page.tsx')).toBe(
      true,
    );
    expect(plan.projectGraph.nodes.some((node) => node.path === 'backend/src/app.ts')).toBe(true);
  });

  it('Project Graph detects invalid graph metadata during project verification', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-invalid-graph-'));
    const plan = createComposableGenerationPlan(baseConfig);
    for (const file of plan.files) {
      const destination = path.join(tmp, file.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, file.content, 'utf8');
    }
    const graphPath = path.join(tmp, 'structify.project-graph.json');
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8')) as { stackHash: string };
    graph.stackHash = 'invalid';
    fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2), 'utf8');
    const result = validateGeneratedProject(tmp);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'PROJECT_GRAPH_STACK_HASH_MISMATCH')).toBe(
      true,
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
