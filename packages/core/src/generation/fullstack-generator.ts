import { createHash } from 'crypto';
import * as path from 'path';
import {
  NormalizedProjectConfig,
  ComposableGenerationPlan,
  GeneratedTemplateFile,
  GenerationAnalytics,
} from './composable.js';
import { DependencyRegistry } from '../registry/dependency.js';
import { ProjectGraph, ProjectGraphBuilder } from '../platform/project-graph.js';
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
    filesMap.set(file.path, file.content);
  }
  for (const file of templateFiles) {
    // Overlay template files over the base adapter files
    filesMap.set(file.path, file.content);
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
  // Apps/Web manifest
  const webDeps = groupedDeps['apps/web'] || { prod: [], dev: [] };
  const webPkg = {
    name: `@${config.projectName.toLowerCase()}/web`,
    version: '1.0.0',
    private: true,
    scripts:
      config.stack.frontend === 'next'
        ? { dev: 'next dev', build: 'next build', start: 'next start' }
        : { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
    dependencies: Object.fromEntries(webDeps.prod.map(splitPackageSpec)),
    devDependencies: Object.fromEntries(webDeps.dev.map(splitPackageSpec)),
  };
  filesMap.set('apps/web/package.json', JSON.stringify(webPkg, null, 2) + '\n');

  // Apps/Api manifest
  const apiDeps = groupedDeps['apps/api'] || { prod: [], dev: [] };
  const apiPkg = {
    name: `@${config.projectName.toLowerCase()}/api`,
    version: '1.0.0',
    private: true,
    scripts:
      config.stack.backend === 'nest'
        ? { dev: 'nest start --watch', build: 'nest build', start: 'nest start' }
        : { dev: 'ts-node-dev src/index.ts', build: 'tsc' },
    dependencies: Object.fromEntries(apiDeps.prod.map(splitPackageSpec)),
    devDependencies: Object.fromEntries(apiDeps.dev.map(splitPackageSpec)),
  };
  if (config.stack.orm === 'prisma') {
    (apiPkg.scripts as any)['db:generate'] = 'prisma generate';
    (apiPkg.scripts as any)['db:migrate'] = 'prisma migrate dev';
  }
  filesMap.set('apps/api/package.json', JSON.stringify(apiPkg, null, 2) + '\n');

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

  // Add structify.config.json & manifest
  finalFiles.push({
    path: 'structify.config.json',
    content:
      JSON.stringify(
        {
          ...config,
          structify: {
            version: '1.0.0',
            generatedBy: 'structify',
            manifestPath: 'structify.manifest.json',
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

  finalFiles.push({
    path: 'structify.manifest.json',
    content:
      JSON.stringify(
        {
          preset: config.preset,
          generatorVersions: { 'gen-fullstack-adapter': '1.3.0' },
          projectGraphPath: 'structify.project-graph.json',
          projectGraphSummary: projectGraph.summary,
          dependencyDiagnostics: [],
          analytics: {
            fileCount: finalFiles.length,
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
      version: '1.3.0',
      capabilitiesProvided: [a.kind],
      capabilitiesRequired: [],
      files: [],
      dependencies: [],
    })),
    dependencyGraph: {
      dependencies: {},
      devDependencies: {},
      resolved: resolvedDependencies.resolved.map((d) => ({
        name: d.packageName,
        version: d.versionRange,
        type: d.dependencyType === 'prod' ? ('runtime' as const) : ('dev' as const),
        target: d.targetWorkspace || 'root',
        packageManager: 'npm',
        source: { generatorId: 'gen-fullstack-adapter', reason: d.reason },
      })),
      diagnostics: [],
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

function mapTemplatePath(filePath: string, frontend: string): string {
  if (filePath === 'app/page.tsx') return 'apps/web/app/page.tsx';
  if (filePath === 'app/globals.css') return 'apps/web/app/globals.css';
  if (filePath === 'src/App.tsx') return 'apps/web/src/App.tsx';
  if (filePath === 'src/index.css') return 'apps/web/src/index.css';
  if (filePath.startsWith('src/shared/')) {
    return filePath.replace('src/shared/', 'packages/shared/src/');
  }
  if (filePath.startsWith('src/server/')) {
    return filePath.replace('src/server/', 'apps/api/src/');
  }
  if (filePath.startsWith('src/features/')) {
    return filePath.replace('src/features/', 'apps/web/src/features/');
  }
  return filePath;
}

function rewriteImports(content: string, targetPath: string): string {
  if (targetPath.startsWith('apps/api/')) {
    return content.replace(
      /from\s+['"]\.\.\/\.\.\/shared\//g,
      "from '../../../../packages/shared/src/",
    );
  }
  return content;
}

function splitPackageSpec(spec: string): [string, string] {
  const atIndex = spec.lastIndexOf('@');
  return [spec.slice(0, atIndex), spec.slice(atIndex + 1)];
}
