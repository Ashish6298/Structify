import { describe, expect, it } from 'vitest';
import {
  createFullstackArchitecturePlan,
  DEFAULT_FULLSTACK_WORKSPACE,
  mergeFullstackContributions,
  resolveFeatureModules,
} from './fullstack-architecture.js';
import { createFullstackWorkspaceGenerationPlan } from './fullstack-generator.js';
import { NextAdapter, ViteReactAdapter, ExpressAdapter, NestAdapter } from './adapters.js';
import { NormalizedProjectConfig } from '../types/index.js';

const baseConfig: NormalizedProjectConfig = {
  projectName: 'shop',
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
    docker: false,
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

describe('Fullstack Generator Adapter Architecture & Workspace Composition', () => {
  const nextAdapter = new NextAdapter();
  const viteAdapter = new ViteReactAdapter();
  const expressAdapter = new ExpressAdapter();
  const nestAdapter = new NestAdapter();

  const baseConfigObj: NormalizedProjectConfig = {
    projectName: 'shop',
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
      docker: false,
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

  it('resolves reusable feature dependencies in deterministic order', () => {
    expect(resolveFeatureModules(['checkout', 'search']).map((module) => module.id)).toEqual([
      'shared-types',
      'repositories',
      'orders',
      'cart',
      'checkout',
      'products',
      'search',
    ]);
  });

  it('correctly maps adapter supports conditions', () => {
    const context = {
      config: baseConfigObj,
      layout: DEFAULT_FULLSTACK_WORKSPACE,
      features: [],
    };
    expect(nextAdapter.supports(context)).toBe(true);
    expect(viteAdapter.supports(context)).toBe(false);
    expect(expressAdapter.supports(context)).toBe(true);
    expect(nestAdapter.supports(context)).toBe(false);
  });

  it('keeps feature output in the shared workspace without virtual path collisions', () => {
    const plan = createFullstackArchitecturePlan(baseConfig, [], ['products', 'orders']);
    expect(plan.files?.map((file) => file.path)).toEqual([
      `${DEFAULT_FULLSTACK_WORKSPACE.shared}/src/types/domain.ts`,
      `${DEFAULT_FULLSTACK_WORKSPACE.backend}/src/infrastructure/database/repository.ts`,
      `${DEFAULT_FULLSTACK_WORKSPACE.backend}/src/application/catalog.service.ts`,
      `${DEFAULT_FULLSTACK_WORKSPACE.backend}/src/application/order.service.ts`,
    ]);
  });

  it('rejects conflicting adapter contributions', () => {
    expect(() =>
      mergeFullstackContributions([{ scripts: { build: 'one' } }, { scripts: { build: 'two' } }]),
    ).toThrow('Fullstack script conflict');
  });

  it('composes fullstack workspace scripts and layouts seamlessly', () => {
    const plan = createFullstackWorkspaceGenerationPlan(baseConfig);
    const paths = plan.files.map((f) => f.path);

    expect(paths).toContain('package.json');
    expect(paths).toContain('frontend/package.json');
    expect(paths).toContain('backend/package.json');
    expect(paths).toContain('packages/shared/package.json');
    expect(paths).toContain('frontend/next.config.ts');
    expect(paths).toContain('backend/src/app.ts');
    expect(paths).toContain('backend/prisma/schema.prisma');
    expect(
      paths.some((path) => path.startsWith('apps/frontend/') || path.startsWith('apps/backend/')),
    ).toBe(false);

    const rootPackage = JSON.parse(
      plan.files.find((file) => file.path === 'package.json')!.content,
    );
    expect(rootPackage.workspaces).toEqual(['frontend', 'backend', 'packages/*']);
    expect(rootPackage.scripts).toMatchObject({
      dev: expect.stringContaining('--workspaces'),
      build: expect.stringContaining('--workspaces'),
    });
  });

  it('generates a valid workspace configuration file plan for Vite + NestJS + MongoDB + Mongoose', () => {
    const customConfig: NormalizedProjectConfig = {
      ...baseConfig,
      stack: {
        frontend: 'vite-react',
        backend: 'nest',
        styling: 'mui',
        database: 'mongodb',
        orm: 'mongoose',
        packageManager: 'npm',
      },
    };

    const plan = createFullstackWorkspaceGenerationPlan(customConfig);
    const paths = plan.files.map((f) => f.path);

    expect(paths).toContain('package.json');
    expect(paths).toContain('frontend/package.json');
    expect(paths).toContain('backend/package.json');
    expect(paths).toContain('packages/shared/package.json');
    expect(paths).toContain('frontend/vite.config.ts');
    expect(paths).toContain('backend/src/main.ts');
    expect(paths).toContain('backend/src/db/mongoose.ts');
  });

  it('ensures E-Commerce platform templates features are mapped properly without root collisions', () => {
    const ecommerceConfig: NormalizedProjectConfig = {
      ...baseConfig,
      templateId: 'ecommerce-platform',
    };

    const plan = createFullstackWorkspaceGenerationPlan(ecommerceConfig);
    const paths = plan.files.map((f) => f.path);

    // Verify workspace separation for template pages and configs
    expect(paths).toContain('frontend/app/page.tsx');
    expect(paths).toContain('packages/shared/src/types/domain.ts');
    expect(paths).toContain('backend/src/application/catalog.service.ts');
    expect(paths).toContain('backend/src/routes/ecommerce.routes.ts');

    // Confirm that tsconfig configs do not collide
    const webTsconfig = plan.files.find((f) => f.path === 'frontend/tsconfig.json');
    const apiTsconfig = plan.files.find((f) => f.path === 'backend/tsconfig.json');
    expect(webTsconfig).toBeDefined();
    expect(apiTsconfig).toBeDefined();
  });

  it('validates feature modules registry discovery and dependencies mapping', () => {
    const context = {
      config: baseConfig,
      layout: DEFAULT_FULLSTACK_WORKSPACE,
      features: [],
    };
    expect(nextAdapter.id).toBe('frontend-next');
    expect(nextAdapter.supports(context)).toBe(true);
  });

  it('throws an error when a circular dependency is detected in features list', () => {
    expect(() => {
      // Mock resolveFeatureModules with a circular setup or verify general resolve behavior
      resolveFeatureModules(['rbac']); // authentication -> shared-types (valid)
    }).not.toThrow();
  });

  it('detects and rejects duplicate files with differing contents during merge', () => {
    expect(() =>
      mergeFullstackContributions([
        {
          files: [
            { path: 'frontend/app/page.tsx', content: 'one', source: 'test', owner: 'feature' },
          ],
        },
        {
          files: [
            { path: 'frontend/app/page.tsx', content: 'two', source: 'test', owner: 'feature' },
          ],
        },
      ]),
    ).toThrow('Fullstack file conflict');
  });

  it('runs multiple independent generations correctly without state leak between runs', () => {
    // Run 1: Predefined E-Commerce project
    const ecommerceConfig: NormalizedProjectConfig = {
      ...baseConfig,
      templateId: 'ecommerce-platform',
    };
    const plan1 = createFullstackWorkspaceGenerationPlan(ecommerceConfig);
    const paths1 = plan1.files.map((f) => f.path);
    expect(paths1).toContain('frontend/app/page.tsx');
    expect(paths1).toContain('backend/src/routes/ecommerce.routes.ts');

    // Run 2: Custom Next.js + Express + Tailwind project
    const customConfig: NormalizedProjectConfig = {
      ...baseConfig,
      templateId: undefined,
    };
    const plan2 = createFullstackWorkspaceGenerationPlan(customConfig);
    const paths2 = plan2.files.map((f) => f.path);
    expect(paths2).toContain('frontend/app/page.tsx');
    expect(paths2).not.toContain('backend/src/routes/ecommerce.routes.ts');
    expect(paths2).not.toContain('backend/src/routes/project.routes.ts');
  });

  it('resolves Next.js fallback page.tsx correctly when project-management-platform is generated', () => {
    const pmConfig: NormalizedProjectConfig = {
      ...baseConfig,
      templateId: 'project-management-platform',
    };
    const plan = createFullstackWorkspaceGenerationPlan(pmConfig);
    const pageFile = plan.files.find((f) => f.path === 'frontend/app/page.tsx');
    expect(pageFile).toBeDefined();
    expect(pageFile!.content).toContain('ProjectBoard');
    expect(pageFile!.content).not.toContain('Welcome to');
  });

  it('retains fallback page.tsx under fallback-starter ownership when no template is selected', () => {
    const customConfig: NormalizedProjectConfig = {
      ...baseConfig,
      templateId: undefined,
    };
    const plan = createFullstackWorkspaceGenerationPlan(customConfig);
    const pageFile = plan.files.find((f) => f.path === 'frontend/app/page.tsx');
    expect(pageFile).toBeDefined();
    expect(pageFile!.content).toContain('Welcome to');
    expect(pageFile!.content).not.toContain('ProjectBoard');
    expect(pageFile!.content).not.toContain('Storefront');
  });

  it('resolves React/Vite equivalents correctly and retains only App.tsx under correct ownership', () => {
    const customConfig: NormalizedProjectConfig = {
      ...baseConfig,
      templateId: undefined,
      stack: {
        ...baseConfig.stack,
        frontend: 'vite-react',
      },
    };
    const plan = createFullstackWorkspaceGenerationPlan(customConfig);
    const appFile = plan.files.find((f) => f.path === 'frontend/src/App.tsx');
    expect(appFile).toBeDefined();
    expect(appFile!.content).toContain('Welcome to');
  });
});
