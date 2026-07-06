import { describe, it, expect } from 'vitest';
import { createCLIContext } from './context.js';
import {
  validateStack,
  ProjectConfig,
  createProjectPlan,
  NormalizedProjectConfig,
} from '@structify/core';
import { InteractivePromptEngine, QuestionMetadata } from './utils/prompts.js';
import { ConfigurationLoaderManager } from './utils/loader.js';
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

      expect(context.packageName).toBe('structify-cli');
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
          packageManager: 'pnpm',
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
});
