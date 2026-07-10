import { describe, expect, it } from 'vitest';
import {
  buildIntegrationPatchPlan,
  getIntegrationsForCategory,
  INTEGRATIONS_CATALOG,
} from './marketplace.js';
import { ProjectState } from './phase9.js';
import { DetectedStack } from './stack-detector.js';

describe('Smart Marketplace Integrations', () => {
  const dummyStack: DetectedStack = {
    frontend: 'next',
    backend: 'none',
    database: 'none',
    orm: 'none',
    styling: 'none',
    packageManager: 'npm',
    docker: false,
    githubActions: false,
    eslint: false,
    prettier: false,
    git: false,
    editorconfig: false,
    detectionSource: 'none',
    confidence: 'low',
    indicators: [],
  };

  it('correctly filters catalog integrations by category and stack', () => {
    const integrations = getIntegrationsForCategory('auth', dummyStack);

    expect(integrations.length).toBeGreaterThan(0);
    expect(integrations.every((integration) => integration.category === 'auth')).toBe(true);

    const hasClerk = integrations.some((integration) => integration.id === 'clerk');
    expect(hasClerk).toBe(true);
  });

  it('correctly builds a patch plan for an integration', () => {
    const integration = INTEGRATIONS_CATALOG.find(
      (catalogIntegration) => catalogIntegration.id === 'better-auth',
    );

    expect(integration).toBeDefined();

    const state: ProjectState = {
      projectPath: '.',
      exists: true,
      config: {
        projectName: 'test-project',
        version: '1.0.0',
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
          git: true,
          editorconfig: false,
          husky: false,
          lintStaged: false,
          commitlint: false,
        },
      },
      packageManager: 'npm',
      generatorVersions: {},
      pluginVersions: {},
      moduleVersions: {},
      expectedFiles: [],
      files: [],
      scripts: {},
      dependencies: {},
      devDependencies: {},
      missingFiles: [],
      modifiedFiles: [],
      unknownFiles: [],
      diagnostics: [],
      eventLogEntries: 0,
    };

    const plan = buildIntegrationPatchPlan('.', integration!, state);

    expect(plan.id).toBe('add-integration-better-auth');
    expect(plan.operations.length).toBeGreaterThan(0);
    expect(plan.dependencyChanges.some((change) => change.name === 'better-auth')).toBe(true);
  });
});
