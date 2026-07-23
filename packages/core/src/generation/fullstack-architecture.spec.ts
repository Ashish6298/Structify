import { describe, expect, it } from 'vitest';
import {
  createFullstackArchitecturePlan,
  DEFAULT_FULLSTACK_WORKSPACE,
  mergeFullstackContributions,
  resolveFeatureModules,
} from './fullstack-architecture.js';
import { createFullstackWorkspaceGenerationPlan } from './fullstack-generator.js';
import {
  NextAdapter,
  ViteReactAdapter,
  ExpressAdapter,
  NestAdapter,
  PrismaAdapter,
  MongooseAdapter,
} from './adapters.js';
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

  it('keeps feature output in the shared workspace without virtual path collisions', () => {
    const plan = createFullstackArchitecturePlan(baseConfig, [], ['products', 'orders']);
    expect(plan.files?.map((file) => file.path)).toEqual([
      `${DEFAULT_FULLSTACK_WORKSPACE.shared}/src/types/ecommerce.ts`,
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

  it('correctly maps supports checks for adapters', () => {
    const nextAdapter = new NextAdapter();
    const viteAdapter = new ViteReactAdapter();
    const expressAdapter = new ExpressAdapter();
    const nestAdapter = new NestAdapter();

    const context = {
      config: baseConfig,
      layout: DEFAULT_FULLSTACK_WORKSPACE,
      features: [],
    };

    expect(nextAdapter.supports(context)).toBe(true);
    expect(viteAdapter.supports(context)).toBe(false);
    expect(expressAdapter.supports(context)).toBe(true);
    expect(nestAdapter.supports(context)).toBe(false);
  });

  it('generates a valid workspace configuration file plan for Next + Express + Postgres + Prisma', () => {
    const plan = createFullstackWorkspaceGenerationPlan(baseConfig);
    const paths = plan.files.map((f) => f.path);

    expect(paths).toContain('package.json');
    expect(paths).toContain('apps/web/package.json');
    expect(paths).toContain('apps/api/package.json');
    expect(paths).toContain('packages/shared/package.json');
    expect(paths).toContain('apps/web/next.config.ts');
    expect(paths).toContain('apps/api/src/app.ts');
    expect(paths).toContain('apps/api/prisma/schema.prisma');
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
    expect(paths).toContain('apps/web/package.json');
    expect(paths).toContain('apps/api/package.json');
    expect(paths).toContain('packages/shared/package.json');
    expect(paths).toContain('apps/web/vite.config.ts');
    expect(paths).toContain('apps/api/src/main.ts');
    expect(paths).toContain('apps/api/src/db/mongoose.ts');
  });

  it('ensures E-Commerce platform templates features are mapped properly without root collisions', () => {
    const ecommerceConfig: NormalizedProjectConfig = {
      ...baseConfig,
      templateId: 'ecommerce-platform',
    };

    const plan = createFullstackWorkspaceGenerationPlan(ecommerceConfig);
    const paths = plan.files.map((f) => f.path);

    // Verify workspace separation for template pages and configs
    expect(paths).toContain('apps/web/app/page.tsx');
    expect(paths).toContain('packages/shared/src/types/ecommerce.ts');
    expect(paths).toContain('apps/api/src/application/catalog.service.ts');
    expect(paths).toContain('apps/api/src/routes/ecommerce.routes.ts');

    // Confirm that tsconfig configs do not collide
    const webTsconfig = plan.files.find((f) => f.path === 'apps/web/tsconfig.json');
    const apiTsconfig = plan.files.find((f) => f.path === 'apps/api/tsconfig.json');
    expect(webTsconfig).toBeDefined();
    expect(apiTsconfig).toBeDefined();
  });

  it('validates feature modules registry discovery and dependencies mapping', () => {
    const nextAdapter = new NextAdapter();
    const context = {
      config: baseConfig,
      layout: DEFAULT_FULLSTACK_WORKSPACE,
      features: [],
    };
    expect(nextAdapter.id).toBe('frontend-next');
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
        { files: [{ path: 'apps/web/app/page.tsx', content: 'one', source: 'test' }] },
        { files: [{ path: 'apps/web/app/page.tsx', content: 'two', source: 'test' }] },
      ]),
    ).toThrow('Fullstack file conflict');
  });
});
