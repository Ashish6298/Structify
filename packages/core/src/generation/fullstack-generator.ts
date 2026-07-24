import { createHash } from 'crypto';
import { ComposableGenerationPlan } from './composable.js';
import { NormalizedProjectConfig } from '../types/index.js';
import { GeneratedTemplateFile } from '../templates/templates.js';
import { DependencyRegistry } from '../registry/dependency.js';
import { ProjectGraphBuilder } from '../platform/project-graph.js';
import { createStructifyManifest, STRUCTIFY_VERSION } from '../manifest/index.js';
import { getPredefinedTemplateFiles } from '../templates/predefined/index.js';
import {
  createFullstackArchitecturePlan,
  DEFAULT_FULLSTACK_WORKSPACE,
  FullstackFeatureId,
  FullstackAdapter,
} from './fullstack-architecture.js';
import {
  NpmWorkspaceAdapter,
  NextAdapter,
  ViteReactAdapter,
  ExpressAdapter,
  NestAdapter,
  PostgresAdapter,
  MongoDbAdapter,
  PrismaAdapter,
  MongooseAdapter,
  DockerAdapter,
  EslintAdapter,
  PrettierAdapter,
  GithubActionsAdapter,
  GitAdapter,
  EditorconfigAdapter,
  TailwindAdapter,
  MuiAdapter,
  FallbackStarterAdapter,
} from './adapters.js';

export function createFullstackWorkspaceGenerationPlan(
  config: NormalizedProjectConfig,
): ComposableGenerationPlan {
  const startedAt = Date.now();

  const adapters: FullstackAdapter[] = [
    new NpmWorkspaceAdapter(),
    new NextAdapter(),
    new ViteReactAdapter(),
    new ExpressAdapter(),
    new NestAdapter(),
    new PostgresAdapter(),
    new MongoDbAdapter(),
    new PrismaAdapter(),
    new MongooseAdapter(),
    new DockerAdapter(),
    new EslintAdapter(),
    new PrettierAdapter(),
    new GithubActionsAdapter(),
    new GitAdapter(),
    new EditorconfigAdapter(),
    new TailwindAdapter(),
    new MuiAdapter(),
    new FallbackStarterAdapter(),
  ];

  // Wire features requested by template
  const features: FullstackFeatureId[] = [];
  if (config.templateId === 'ecommerce-platform') {
    features.push(
      'products',
      'categories',
      'cart',
      'wishlist',
      'authentication',
      'profile',
      'orders',
      'checkout',
      'administration',
      'api-client',
      'middleware',
      'validation',
      'configuration',
      'shared-types',
      'repositories',
      'documentation',
    );
  } else if (config.templateId === 'project-management-platform') {
    features.push(
      'projects',
      'milestones',
      'epics',
      'sprints',
      'tasks',
      'subtasks',
      'board',
      'authentication',
      'profile',
      'api-client',
      'middleware',
      'validation',
      'configuration',
      'shared-types',
      'repositories',
      'documentation',
    );
  }

  // 1. Generate core adapter files/contributions
  const plan = createFullstackArchitecturePlan(
    config,
    adapters,
    features,
    DEFAULT_FULLSTACK_WORKSPACE,
  );

  // 2. Load and map predefined templates overlay
  const templateFiles: GeneratedTemplateFile[] = [];
  if (config.templateId) {
    const rawTemplateFiles = getPredefinedTemplateFiles(
      config.templateId,
      config.stack.frontend,
      config.stack.styling,
      config.projectName,
      {
        backend: config.stack.backend,
        database: config.stack.database,
        orm: config.stack.orm,
      },
    );

    for (const rawFile of rawTemplateFiles) {
      const targetPath = mapTemplatePath(rawFile.path, config.stack.frontend);
      const content = rewriteImports(rawFile.content, targetPath);
      templateFiles.push({ path: targetPath, content });
    }
  }

  // Combine files from adapter plan & template overlay
  const filesMap = new Map<string, string>();
  for (const file of plan.files ?? []) {
    // PM composition intentionally shares infrastructure but never commerce domain samples.
    if (
      config.templateId === 'project-management-platform' &&
      (file.path.includes('catalog.service') || file.path.includes('ecommerce.routes'))
    ) {
      continue;
    }
    filesMap.set(file.path, file.content);
  }
  for (const file of templateFiles) {
    // Overlay template files over the base adapter files
    if (
      config.templateId === 'project-management-platform' &&
      (file.path.includes('catalog.service') || file.path.includes('ecommerce.routes'))
    ) {
      continue;
    }
    filesMap.set(file.path, file.content);
  }

  if (config.templateId === 'project-management-platform') {
    for (const [filePath, content] of filesMap) {
      const domainSafeContent = content
        .replaceAll('types/ecommerce.js', 'types/domain.js')
        .replace(/import type \{ Project \} from '[^']+';\n\n/, '')
        .replaceAll('validateProductSchema', 'validateEntity')
        .replaceAll(
          'Product name is required and must be a string',
          'A valid entity name is required',
        )
        .replaceAll('Product price must be a positive number', 'Entity values must be valid');
      filesMap.set(filePath, domainSafeContent);
    }
  }

  // 3. Resolve and group dependencies by target workspace using DependencyRegistry
  const depRegistry = new DependencyRegistry();

  // Add adapter dependencies
  for (const dep of plan.dependencies ?? []) {
    depRegistry.register({
      packageName: dep.name,
      versionRange: dep.version,
      dependencyType: dep.kind === 'runtime' ? 'prod' : 'dev',
      supportedPackageManagers: ['npm'],
      installScope: 'workspace',
      targetWorkspace: dep.target || 'root',
      reason: dep.source,
    });
  }

  // Deduplicate and group
  const groupedDeps = depRegistry.groupByPackageManagerAndWorkspace('npm');

  // Build the specific package.json manifests
  // Apps/Frontend manifest
  const webDeps = groupedDeps['frontend'] || { prod: [], dev: [] };
  const webPkg = {
    name: `@${config.projectName.toLowerCase()}/frontend`,
    version: '1.0.0',
    private: true,
    scripts:
      config.stack.frontend === 'next'
        ? {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            ...(config.tools.eslint ? { lint: 'eslint "app/**/*.{ts,tsx}"' } : {}),
            typecheck: 'tsc --noEmit',
          }
        : {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview',
            ...(config.tools.eslint ? { lint: 'eslint "src/**/*.{ts,tsx}"' } : {}),
            typecheck: 'tsc --noEmit',
          },
    dependencies: Object.fromEntries(webDeps.prod.map(splitPackageSpec)),
    devDependencies: Object.fromEntries(webDeps.dev.map(splitPackageSpec)),
  };
  filesMap.set('frontend/package.json', JSON.stringify(webPkg, null, 2) + '\n');

  // Apps/Backend manifest
  const apiDeps = groupedDeps['backend'] || { prod: [], dev: [] };
  const apiPkg = {
    name: `@${config.projectName.toLowerCase()}/backend`,
    version: '1.0.0',
    private: true,
    scripts:
      config.stack.backend === 'nest'
        ? {
            dev: 'nest start --watch',
            build: 'nest build',
            start: 'nest start',
            ...(config.tools.eslint ? { lint: 'eslint "src/**/*.ts"' } : {}),
            typecheck: 'tsc --noEmit',
          }
        : {
            dev: 'ts-node-dev src/index.ts',
            build: 'tsc',
            ...(config.tools.eslint ? { lint: 'eslint "src/**/*.ts"' } : {}),
            typecheck: 'tsc --noEmit',
          },
    dependencies: Object.fromEntries(apiDeps.prod.map(splitPackageSpec)),
    devDependencies: Object.fromEntries(apiDeps.dev.map(splitPackageSpec)),
  };
  if (config.stack.orm === 'prisma') {
    (apiPkg.scripts as Record<string, string>)['db:generate'] = 'prisma generate';
    (apiPkg.scripts as Record<string, string>)['db:migrate'] = 'prisma migrate dev';
    (apiPkg.scripts as Record<string, string>).build = 'prisma generate && tsc';
  }
  filesMap.set('backend/package.json', JSON.stringify(apiPkg, null, 2) + '\n');

  // Root manifest update with merged workspaces dependencies
  const rootDeps = groupedDeps['root'] || { prod: [], dev: [] };
  const rootPkgContent = filesMap.get('package.json');
  if (rootPkgContent) {
    const rootPkg = JSON.parse(rootPkgContent);
    rootPkg.dependencies = Object.fromEntries(rootDeps.prod.map(splitPackageSpec));
    rootPkg.devDependencies = Object.fromEntries(rootDeps.dev.map(splitPackageSpec));
    filesMap.set('package.json', JSON.stringify(rootPkg, null, 2) + '\n');
  }

  // 4. Generate final file list
  const finalFiles: GeneratedTemplateFile[] = [];
  for (const [filePath, content] of filesMap.entries()) {
    finalFiles.push({ path: filePath, content });
  }

  // Metadata is produced from this single normalized context. Keep these paths in the
  // graph so ownership and validator expectations describe the files we actually emit.
  finalFiles.push({
    path: 'structify.config.json',
    content:
      JSON.stringify(
        {
          ...config,
          structify: {
            version: STRUCTIFY_VERSION,
            generatedBy: 'structify',
            manifestPath: 'structify.manifest.json',
            projectGraphPath: 'structify.project-graph.json',
            packageManager: config.stack.packageManager,
          },
        },
        null,
        2,
      ) + '\n',
  });

  // Build ProjectGraph
  const projectGraphBuilder = new ProjectGraphBuilder();
  projectGraphBuilder.addNode({
    id: 'app:root',
    type: 'app',
    name: config.projectName,
    sourceGenerator: 'gen-base-typescript',
  });
  for (const file of finalFiles) {
    projectGraphBuilder.addNode({
      id: `file:${file.path}`,
      type: file.path.endsWith('package.json') ? 'package' : 'config-file',
      name: file.path,
      path: file.path,
      sourceGenerator: 'gen-fullstack-adapter',
    });
    projectGraphBuilder.addEdge({
      from: 'app:root',
      to: `file:${file.path}`,
      relation: 'contains',
    });
  }
  const projectGraph = projectGraphBuilder.build(config);

  finalFiles.push({
    path: 'structify.project-graph.json',
    content: JSON.stringify(projectGraph, null, 2) + '\n',
  });

  const manifest = createStructifyManifest({
    config,
    templatePaths: [...finalFiles.map((file) => file.path), 'structify.project-graph.json'],
    generatorVersions: Object.fromEntries(
      adapters.map((adapter) => [adapter.id, STRUCTIFY_VERSION]),
    ),
  });
  finalFiles.push({
    path: 'structify.manifest.json',
    content:
      JSON.stringify(
        {
          ...manifest,
          projectGraphPath: 'structify.project-graph.json',
          projectGraphSummary: projectGraph.summary,
          dependencyDiagnostics: [],
          analytics: {
            fileCount: finalFiles.length + 1,
            generatorCount: adapters.length,
            dependencyCount: plan.dependencies?.length ?? 0,
          },
        },
        null,
        2,
      ) + '\n',
  });

  const resolvedDependencies = depRegistry.deduplicateAndResolveConflicts();

  return {
    files: finalFiles,
    generators: adapters.map((a) => ({
      id: a.id,
      version: STRUCTIFY_VERSION,
      capabilitiesProvided: [a.kind],
      capabilitiesRequired: [],
      files: [],
      dependencies: [],
    })),
    dependencyGraph: {
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {},
      resolved: resolvedDependencies.resolved.map((d) => ({
        name: d.packageName,
        version: d.versionRange,
        type: d.dependencyType === 'prod' ? ('runtime' as const) : ('dev' as const),
        target: d.targetWorkspace || 'root',
        sources: [{ generatorId: 'gen-fullstack-adapter', reason: d.reason }],
      })),
      diagnostics: [],
      conflicts: [],
      installPlan: [],
      explanations: {},
    },
    projectGraph,
    analytics: {
      generationPlanDurationMs: Date.now() - startedAt,
      fileCount: finalFiles.length,
      templateCount: finalFiles.length,
      generatorCount: adapters.length,
      dependencyCount: plan.dependencies?.length ?? 0,
      pluginCount: 1,
      eventCount: 0,
      memoryRssBytes: process.memoryUsage().rss,
    },
    snapshotHash: createHash('sha256')
      .update(JSON.stringify(finalFiles.map((file) => [file.path, file.content])))
      .digest('hex'),
  };
}

function mapTemplatePath(filePath: string, _frontend: string): string {
  if (filePath === 'app/page.tsx') return 'frontend/app/page.tsx';
  if (filePath === 'app/globals.css') return 'frontend/app/globals.css';
  if (filePath === 'src/App.tsx') return 'frontend/src/App.tsx';
  if (filePath === 'src/index.css') return 'frontend/src/index.css';
  if (filePath.startsWith('src/shared/')) {
    return filePath.replace('src/shared/', 'packages/shared/src/');
  }
  if (filePath.startsWith('src/server/')) {
    return filePath.replace('src/server/', 'backend/src/');
  }
  if (filePath.startsWith('src/features/')) {
    return filePath.replace('src/features/', 'frontend/src/features/');
  }
  return filePath;
}

function rewriteImports(content: string, targetPath: string): string {
  if (targetPath.startsWith('backend/')) {
    return content.replace(
      /from\s+['"]\.\.\/\.\.\/shared\//g,
      "from '../../../packages/shared/src/",
    );
  }
  return content;
}

function splitPackageSpec(spec: string): [string, string] {
  const atIndex = spec.lastIndexOf('@');
  return [spec.slice(0, atIndex), spec.slice(atIndex + 1)];
}
