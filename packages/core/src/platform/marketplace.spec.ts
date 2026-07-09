import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  getIntegrationsForCategory,
  buildIntegrationPatchPlan,
  INTEGRATIONS_CATALOG
} from './marketplace.js';
import { DetectedStack } from './stack-detector.js';
import { ProjectState } from './phase9.js';

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
    indicators: []
  };

  it('correctly filters catalog integrations by category and stack', () => {
    const integrations = getIntegrationsForCategory('auth', dummyStack);
    expect(integrations.length).toBeGreaterThan(0);
    expect(integrations.every((i) => i.category === 'auth')).toBe(true);
    
    // Clerk is next compatible, should be in list
    const hasClerk = integrations.some((i) => i.id === 'clerk');
    expect(hasClerk).toBe(true);
  });

  it('correctly builds a patch plan for an integration', () => {
    const integration = INTEGRATIONS_CATALOG.find((i) => i.id === 'better-auth')!;
    const state: ProjectState = {
      projectPath: '.',
      files: [],
      modifiedFiles: [],
      config: {
        name: 'test-project',
        version: '1.0.0',
        template: 'next',
        modules: []
      },
      packageManager: 'npm'
    };

    const plan = buildIntegrationPatchPlan('.', integration, state);
    expect(plan.id).toBe('add-integration-better-auth');
    expect(plan.operations.length).toBeGreaterThan(0);
    expect(plan.dependencyChanges.some((c) => c.name === 'better-auth')).toBe(true);
  });
});
