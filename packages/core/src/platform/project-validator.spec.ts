import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createComposableGenerationPlan } from '../generation/composable.js';
import { NormalizedProjectConfig } from '../types/index.js';
import { validateGeneratedProject } from './project-validator.js';

const config: NormalizedProjectConfig = {
  projectName: 'validator-app',
  version: '1.0',
  mode: 'fullstack',
  language: 'typescript',
  stack: {
    frontend: 'next',
    backend: 'express',
    styling: 'tailwind',
    database: 'postgres',
    orm: 'prisma',
    packageManager: 'npm',
  },
  tools: {
    docker: true,
    eslint: true,
    prettier: true,
    githubActions: true,
    git: false,
    editorconfig: true,
    husky: false,
    lintStaged: false,
    commitlint: false,
  },
};

let tmp: string | undefined;

function writeProject(mutate?: (projectPath: string) => void): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-validator-'));
  const plan = createComposableGenerationPlan(config);
  for (const file of plan.files) {
    const target = path.join(tmp, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, 'utf8');
  }
  mutate?.(tmp);
  return tmp;
}

function editJson<T extends Record<string, unknown>>(
  projectPath: string,
  relativePath: string,
  mutate: (json: T) => void,
): void {
  const target = path.join(projectPath, relativePath);
  const json = JSON.parse(fs.readFileSync(target, 'utf8')) as T;
  mutate(json);
  fs.writeFileSync(target, JSON.stringify(json, null, 2), 'utf8');
}

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

describe('verify-project structural validation', () => {
  it('validates manifest, graph, stack files, scripts, and dependencies', () => {
    const projectPath = writeProject();
    const result = validateGeneratedProject(projectPath);

    expect(result.valid).toBe(true);
    expect(result.checkedFiles).toContain('structify.config.json');
    expect(result.checkedFiles).toContain('structify.project-graph.json');
    expect(result.checkedFiles).toContain('Dockerfile');
    expect(result.checkedScripts).toContain('dev');
    expect(result.checkedGraphNodes.length).toBeGreaterThan(0);
    expect(result.dependencyChecks.length).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });

  it('reports manifest metadata mismatches', () => {
    const projectPath = writeProject((target) => {
      editJson(target, 'structify.manifest.json', (manifest) => {
        manifest.structifyVersion = '0.0.0';
      });
    });

    const result = validateGeneratedProject(projectPath);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'STRUCTIFY_VERSION_MISMATCH')).toBe(true);
  });

  it('reports Project Graph validation failures', () => {
    const projectPath = writeProject((target) => {
      editJson(target, 'structify.project-graph.json', (graph) => {
        graph.summary = { ...(graph.summary as Record<string, number>), app: 99 };
        graph.edges = [{ from: 'missing', to: 'app:root', relation: 'contains' }];
      });
    });

    const result = validateGeneratedProject(projectPath);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'PROJECT_GRAPH_SUMMARY_MISMATCH')).toBe(
      true,
    );
    expect(result.errors.some((error) => error.code === 'PROJECT_GRAPH_INVALID_EDGE')).toBe(true);
  });

  it('reports missing stack files and dependency mismatches', () => {
    const projectPath = writeProject((target) => {
      fs.rmSync(path.join(target, 'prisma', 'schema.prisma'));
      editJson(target, 'package.json', (packageJson) => {
        const dependencies = packageJson.dependencies as Record<string, string>;
        delete dependencies.express;
      });
    });

    const result = validateGeneratedProject(projectPath);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path === 'prisma/schema.prisma')).toBe(true);
    expect(
      result.errors.some(
        (error) => error.code === 'DEPENDENCY_MISMATCH' && error.message.includes('express'),
      ),
    ).toBe(true);
  });

  it('reports script mismatches', () => {
    const projectPath = writeProject((target) => {
      editJson(target, 'package.json', (packageJson) => {
        const scripts = packageJson.scripts as Record<string, string>;
        scripts.dev = 'wrong';
      });
    });

    const result = validateGeneratedProject(projectPath);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'SCRIPT_MISMATCH')).toBe(true);
  });
});
