import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createComposableGenerationPlan } from '../generation/composable.js';
import { NormalizedProjectConfig } from '../types/index.js';
import {
  createModulePlan,
  createRepairPlan,
  createUpgradePlan,
  detectProjectDrift,
  executePatchPlan,
  readProjectState,
} from './phase9.js';

const config: NormalizedProjectConfig = {
  projectName: 'phase9-app',
  version: '1.0',
  mode: 'frontend-only',
  language: 'typescript',
  stack: {
    frontend: 'next',
    backend: 'none',
    styling: 'none',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
  tools: {
    docker: false,
    eslint: false,
    prettier: false,
    githubActions: false,
    git: false,
    editorconfig: true,
    husky: false,
    lintStaged: false,
    commitlint: false,
  },
};

let tmp: string | undefined;

function writeProject(projectConfig = config): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-phase9-'));
  const plan = createComposableGenerationPlan(projectConfig);
  for (const file of plan.files) {
    const target = path.join(tmp, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, 'utf8');
  }
  return tmp;
}

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

describe('Phase 9 project state and drift', () => {
  it('reads normalized state from generated metadata and filesystem', () => {
    const project = writeProject();
    const state = readProjectState(project);
    expect(state.config?.projectName).toBe('phase9-app');
    expect(state.packageManager).toBe('npm');
    expect(state.files).toContain('package.json');
    expect(state.missingFiles).toEqual([]);
  });

  it('detects missing files, modified generated files, script drift, and dependency drift', () => {
    const project = writeProject();
    fs.rmSync(path.join(project, 'app', 'page.tsx'));
    fs.appendFileSync(path.join(project, 'README.md'), '\nmanual edit\n');
    const packageJsonPath = path.join(project, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    packageJson.scripts.test = 'wrong';
    delete packageJson.dependencies.next;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    const drift = detectProjectDrift(readProjectState(project));

    expect(drift.hasDrift).toBe(true);
    expect(drift.missingGeneratedFiles).toContain('app/page.tsx');
    expect(drift.modifiedGeneratedFiles).toContain('README.md');
    expect(drift.changedPackageScripts).toContain('test');
    expect(drift.missingDependencies.some((dep) => dep.includes('next'))).toBe(true);
  });
});

describe('Phase 9 patch, module, repair, and upgrade planning', () => {
  it('creates and applies a Docker module patch with metadata history', () => {
    const project = writeProject();
    const modulePlan = createModulePlan(project, 'docker', { dryRun: true });
    expect(modulePlan.code).toBe('MODULE_PLAN_READY');
    expect(modulePlan.plan?.filesChanged).toContain('Dockerfile');
    expect(modulePlan.plan?.migrationGraph.nodes.length).toBeGreaterThan(0);

    const result = executePatchPlan(project, modulePlan.plan!);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(project, 'Dockerfile'))).toBe(true);
    const state = readProjectState(project);
    expect(state.moduleVersions.docker).toBe('1.0.0');
    expect(state.manifest?.operationHistory?.[0]?.type).toBe('module-add');
  });

  it('detects already-installed and incompatible modules', () => {
    const project = writeProject({ ...config, tools: { ...config.tools, docker: true } });
    expect(createModulePlan(project, 'docker').code).toBe('MODULE_ALREADY_PRESENT');
    expect(createModulePlan(project, 'mongoose', { database: undefined }).code).toBe(
      'MODULE_PLAN_READY',
    );
  });

  it('detects patch conflicts without force', () => {
    const project = writeProject();
    fs.writeFileSync(path.join(project, 'Dockerfile'), 'user dockerfile');
    const modulePlan = createModulePlan(project, 'docker');
    expect(modulePlan.code).toBe('PATCH_CONFLICT');
    expect(modulePlan.plan?.conflicts[0]?.code).toBe('PATCH_CONFLICT');
  });

  it('creates repair and upgrade plans', () => {
    const project = writeProject();
    fs.rmSync(path.join(project, '.eslintrc.json'), { force: true });
    const repair = createRepairPlan(project, { dryRun: true });
    expect(repair.plan.migrationGraph.operation).toBe('repair');
    const upgrade = createUpgradePlan(project);
    expect(upgrade.plan.migrationGraph.operation).toBe('upgrade');
  });

  it('rolls back patch operations after a failed operation', () => {
    const project = writeProject();
    const modulePlan = createModulePlan(project, 'docker');
    modulePlan.plan!.operations.push({
      id: 'invalid-write',
      type: 'create-file',
      targetPath: 'bad\u0000path',
      description: 'Force a filesystem failure',
      content: 'bad',
      conflictPolicy: 'error',
    });
    const result = executePatchPlan(project, modulePlan.plan!);
    expect(result.success).toBe(false);
    expect(result.rollbackResults.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(project, 'Dockerfile'))).toBe(false);
  });
});
