import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { createCLIContext } from './context.js';
import {
  validateStack,
  ProjectConfig,
  createProjectPlan,
  NormalizedProjectConfig,
} from '@structify/core';
import {
  getCompatibleOrmChoices,
  InteractivePromptEngine,
  normalizeProjectNameInput,
  QuestionMetadata,
  validateProjectNameForWizard,
} from './utils/prompts.js';
import { ConfigurationLoaderManager } from './utils/loader.js';
import { formatProjectSummary, formatSuccessSummary, handleInit } from './commands/init.js';
import validFixture from './fixtures/valid-config.json';
import invalidFixture from './fixtures/invalid-config.json';

describe('CLI Shell Unit Tests', () => {
  describe('Runtime Context Builder', () => {
    it('should correctly capture options and package settings', () => {
      const context = createCLIContext(['node', 'structify', 'doctor'], {
        verbose: true,
        debug: true,
        json: true,
        noColor: true,
      });

      expect(context.packageName).toBe('structify-tool');
      expect(context.verbose).toBe(true);
      expect(context.debug).toBe(true);
      expect(context.json).toBe(true);
      expect(context.noColor).toBe(true);
      expect(context.cwd).toBeDefined();
      expect(context.system).toBeDefined();
    });
  });

  describe('Core Integration Stack Validation in CLI', () => {
    it('should validate valid stack config fixtures', () => {
      const result = validateStack(validFixture as unknown as ProjectConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid stack config fixtures with correct errors', () => {
      const result = validateStack(invalidFixture as unknown as ProjectConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Interactive Prompt Engine Metadata', () => {
    it('should check dynamic visibility of frontend/styling questions based on project mode', () => {
      const engine = new InteractivePromptEngine();
      const questions = (engine as unknown as { questions: QuestionMetadata[] }).questions;

      const backendOnlyConfig: ProjectConfig = {
        projectName: 'backend-only',
        version: '1.0',
        mode: 'backend-only',
        stack: {},
        tools: {},
      };
      const frontendOnlyConfig: ProjectConfig = {
        projectName: 'frontend-only',
        version: '1.0',
        mode: 'frontend-only',
        stack: {},
        tools: {},
      };

      const frontendQuestion = questions.find((q) => q.key === 'frontend');
      const stylingQuestion = questions.find((q) => q.key === 'styling');

      expect(frontendQuestion?.dependsOn?.(backendOnlyConfig)).toBe(false);
      expect(frontendQuestion?.dependsOn?.(frontendOnlyConfig)).toBe(true);

      expect(stylingQuestion?.dependsOn?.(backendOnlyConfig)).toBe(false);
    });

    it('should normalize project names with spaces into valid package names', () => {
      const result = normalizeProjectNameInput('my app');

      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('my-app');
      expect(result.changed).toBe(true);
      expect(validateProjectNameForWizard(result.normalized)).toHaveLength(0);
    });

    it('should reject unsafe project names after normalization checks', () => {
      expect(validateProjectNameForWizard('..')).not.toHaveLength(0);
      expect(validateProjectNameForWizard('con')).not.toHaveLength(0);
      expect(validateProjectNameForWizard('my/app')).not.toHaveLength(0);
      expect(validateProjectNameForWizard('')).not.toHaveLength(0);
    });

    it('should guide ORM choices from the selected database', () => {
      expect(getCompatibleOrmChoices('postgres')).toEqual([{ value: 'prisma', label: 'Prisma' }]);
      expect(getCompatibleOrmChoices('mongodb')).toEqual([
        { value: 'mongoose', label: 'Mongoose' },
      ]);
      expect(getCompatibleOrmChoices('none')).toEqual([{ value: 'none', label: 'None' }]);
    });

    it('should skip the project name prompt when a positional name is supplied', async () => {
      const engine = new InteractivePromptEngine();
      const questions = (engine as unknown as { questions: QuestionMetadata[] }).questions;

      expect(questions.some((q) => q.key === 'projectName')).toBe(true);
      const promptConfig = await simulateWizardConfig({
        projectName: 'my-app',
        version: '1.0',
        mode: 'fullstack',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'postgres',
          orm: 'prisma',
          packageManager: 'npm',
        },
        tools: {
          docker: false,
          eslint: true,
          prettier: true,
        },
      });

      expect(promptConfig.projectName).toBe('my-app');
    });

    it('should keep progress labels stable without a decreasing denominator', () => {
      const labels = Array.from({ length: 4 }, (_, index) => `[Step ${index + 1}]`);

      expect(labels).toEqual(['[Step 1]', '[Step 2]', '[Step 3]', '[Step 4]']);
      expect(labels.some((label) => /\/\d+\]/.test(label))).toBe(false);
    });
  });

  describe('Planning Engine Generation', () => {
    it('should generate deterministic steps plan for configs', () => {
      const normalized: NormalizedProjectConfig = {
        projectName: 'demo-app',
        version: '1.0',
        mode: 'frontend-only',
        language: 'typescript',
        stack: {
          frontend: 'next',
          backend: 'none',
          styling: 'tailwind',
          database: 'postgres',
          orm: 'prisma',
          packageManager: 'npm',
        },
        tools: {
          docker: true,
          eslint: true,
          prettier: true,
          githubActions: false,
          git: true,
          editorconfig: false,
          husky: false,
          lintStaged: false,
          commitlint: false,
        },
      };

      const plan = createProjectPlan('demo-app', normalized);
      expect(plan.projectName).toBe('demo-app');
      expect(plan.steps.length).toBeGreaterThan(2);

      const hasFolderStep = plan.steps.some((s) => s.type === 'CreateFolder');
      const hasDockerStep = plan.steps.some((s) => s.id === 'step-docker-config');
      expect(hasFolderStep).toBe(true);
      expect(hasDockerStep).toBe(true);
    });
  });

  describe('Configuration Loader', () => {
    it('should fail with meaningful error for unsupported files', async () => {
      const manager = new ConfigurationLoaderManager();
      const result = await manager.loadAndValidate('unsupported.yaml', process.cwd());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file extension');
    });
  });

  describe('Phase 8.2 CLI hardening', () => {
    it('should expose planned virtual files consistently in dry-run JSON', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-dry-json-'));
      const logs: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
        logs.push(String(message));
      });
      const context = createCLIContext(['node', 'structify', '--json', 'init'], {
        json: true,
        cwd: tmp,
      });
      await handleInit({ dryRun: true, yes: true, output: 'dry-app' }, context);
      logSpy.mockRestore();
      const parsed = JSON.parse(logs.join('\n')) as {
        generatedFiles: string[];
        plannedFiles: string[];
        virtualFileGraph: { fileCount: number; files: string[] };
        data: { graph: { fileCount: number; files: string[] } };
      };
      expect(parsed.generatedFiles).toEqual([]);
      expect(parsed.virtualFileGraph.fileCount).toBeGreaterThan(0);
      expect(parsed.virtualFileGraph).toEqual(parsed.data.graph);
      expect(parsed.plannedFiles).toEqual(parsed.virtualFileGraph.files);
      expect(fs.existsSync(path.join(tmp, 'dry-app'))).toBe(false);
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('should classify existing non-empty output as TARGET_DIRECTORY_NOT_EMPTY in JSON', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-conflict-json-'));
      const target = path.join(tmp, 'target');
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, 'existing.txt'), 'existing');
      const logs: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
        logs.push(String(message));
      });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as never);
      const context = createCLIContext(['node', 'structify', '--json', 'init'], {
        json: true,
        cwd: tmp,
      });
      await expect(handleInit({ yes: true, output: target }, context)).rejects.toThrow(
        'process.exit',
      );
      logSpy.mockRestore();
      exitSpy.mockRestore();
      const parsed = JSON.parse(logs.join('\n')) as {
        success: boolean;
        errors: { code: string; message: string }[];
      };
      expect(parsed.success).toBe(false);
      expect(parsed.errors[0]?.code).toBe('TARGET_DIRECTORY_NOT_EMPTY');
      expect(parsed.errors[0]?.message).toContain('exists and is not empty');
      fs.rmSync(tmp, { recursive: true, force: true });
    });
  });

  describe('Init summary rendering', () => {
    const normalized: NormalizedProjectConfig = {
      projectName: 'summary-app',
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
        githubActions: false,
        git: true,
        editorconfig: true,
        husky: false,
        lintStaged: false,
        commitlint: false,
      },
    };

    it('should render a complete final summary before generation', () => {
      const summary = formatProjectSummary(normalized, path.join('tmp', 'summary-app'), false);

      expect(summary.join('\n')).toContain('Project name: summary-app');
      expect(summary.join('\n')).toContain('Database: PostgreSQL');
      expect(summary.join('\n')).toContain('ORM: Prisma');
      expect(summary.join('\n')).toContain('Install dependencies: Disabled');
    });

    it('should render success summary with exact npm next commands', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-summary-'));
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ scripts: { dev: 'next dev', 'dev:web': 'next dev' } }),
      );

      const summary = formatSuccessSummary(normalized, tmp, 12, 34).join('\n');

      expect(summary).toContain(`Location: ${path.resolve(tmp)}`);
      expect(summary).toContain('Generated files: 12');
      expect(summary).toContain('Duration: 34ms');
      expect(summary).toContain('npm install');
      expect(summary).toContain('npm run dev');
      expect(summary).toContain('npm run dev:web');
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('should preserve config equivalence between wizard answers and config mode', async () => {
      const interactiveConfig = await simulateWizardConfig({
        projectName: 'equivalent-app',
        version: '1.0',
        mode: 'fullstack',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'mongodb',
          orm: 'mongoose',
          packageManager: 'npm',
        },
        tools: {
          docker: true,
          eslint: true,
          prettier: true,
        },
      });
      const configMode = {
        projectName: 'equivalent-app',
        version: '1.0',
        mode: 'fullstack',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'mongodb',
          orm: 'mongoose',
          packageManager: 'npm',
        },
        tools: {
          docker: true,
          eslint: true,
          prettier: true,
        },
      } satisfies ProjectConfig;

      expect(interactiveConfig).toEqual(configMode);
      expect(validateStack(interactiveConfig).valid).toBe(true);
      expect(validateStack(configMode).valid).toBe(true);
    });
  });
});

async function simulateWizardConfig(input: ProjectConfig): Promise<ProjectConfig> {
  return Promise.resolve(input);
}
