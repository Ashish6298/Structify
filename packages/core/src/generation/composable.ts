import { createHash } from 'crypto';
import { GeneratedTemplateFile, getLegacyStarterTemplates } from '../templates/templates.js';
import { NormalizedProjectConfig } from '../types/index.js';
import { DependencyGraph, DependencyGraphResult } from '../platform/dependency-graph.js';
import { ProjectGraph, ProjectGraphBuilder } from '../platform/project-graph.js';

export interface ComposableGeneratorContribution {
  id: string;
  version: string;
  capabilitiesProvided: string[];
  capabilitiesRequired: string[];
  files: string[];
  dependencies: string[];
}

export interface GenerationAnalytics {
  generationPlanDurationMs: number;
  fileCount: number;
  templateCount: number;
  generatorCount: number;
  dependencyCount: number;
  pluginCount: number;
  eventCount: number;
  memoryRssBytes: number;
}

export interface ComposableGenerationPlan {
  files: GeneratedTemplateFile[];
  generators: ComposableGeneratorContribution[];
  dependencyGraph: DependencyGraphResult;
  projectGraph: ProjectGraph;
  analytics: GenerationAnalytics;
  snapshotHash: string;
}

export function createComposableGenerationPlan(
  config: NormalizedProjectConfig,
): ComposableGenerationPlan {
  const startedAt = Date.now();
  const legacyFiles = getLegacyStarterTemplates(config).filter(
    (file) => file.path !== 'structify.project-graph.json',
  );
  const generatorCatalog = selectGenerators(config);
  const dependencyGraph = createDependencyGraph(config, legacyFiles, generatorCatalog);
  const resolvedDependencies = dependencyGraph.resolve(config.stack.packageManager);
  resolvedDependencies.preset = config.preset;
  const projectGraph = createProjectGraph(config, legacyFiles, generatorCatalog);
  const files = rewriteMetadataFiles(
    config,
    legacyFiles,
    projectGraph,
    resolvedDependencies,
    generatorCatalog,
  );
  const analytics: GenerationAnalytics = {
    generationPlanDurationMs: Date.now() - startedAt,
    fileCount: files.length,
    templateCount: files.length,
    generatorCount: generatorCatalog.length,
    dependencyCount: resolvedDependencies.resolved.length,
    pluginCount: 1,
    eventCount: 0,
    memoryRssBytes: process.memoryUsage().rss,
  };

  files.push({
    path: 'structify.project-graph.json',
    content: JSON.stringify(projectGraph, null, 2) + '\n',
  });

  return {
    files,
    generators: generatorCatalog,
    dependencyGraph: resolvedDependencies,
    projectGraph,
    analytics: { ...analytics, fileCount: files.length, templateCount: files.length },
    snapshotHash: createHash('sha256')
      .update(JSON.stringify(files.map((file) => [file.path, file.content])))
      .digest('hex'),
  };
}

function selectGenerators(config: NormalizedProjectConfig): ComposableGeneratorContribution[] {
  const generators: ComposableGeneratorContribution[] = [
    createGenerator(
      'gen-base-typescript',
      ['typescript-project'],
      [],
      [
        'README.md',
        '.gitignore',
        '.editorconfig',
        'structify.config.json',
        'package.json',
        'structify.manifest.json',
      ],
    ),
  ];
  const isFrontend = config.mode === 'frontend-only' || config.mode === 'fullstack';
  const isBackend = config.mode === 'backend-only' || config.mode === 'fullstack';
  if (isFrontend) {
    generators.push(createGenerator('gen-frontend', ['frontend'], ['typescript-project'], []));
    if (config.stack.frontend === 'next') {
      generators.push(
        createGenerator(
          'gen-next',
          ['next', 'react'],
          ['frontend'],
          ['next.config.ts', 'app/layout.tsx', 'app/page.tsx', 'app/globals.css'],
        ),
      );
    }
    if (config.stack.frontend === 'vite-react') {
      generators.push(
        createGenerator(
          'gen-vite-react',
          ['vite', 'react'],
          ['frontend'],
          ['vite.config.ts', 'index.html', 'src/main.tsx', 'src/App.tsx', 'src/index.css'],
        ),
      );
    }
  }
  if (isBackend) {
    generators.push(createGenerator('gen-backend', ['backend'], ['typescript-project'], []));
    if (config.stack.backend === 'express') {
      generators.push(
        createGenerator('gen-express', ['express', 'api'], ['backend'], ['src/app.ts']),
      );
    }
    if (config.stack.backend === 'nest') {
      generators.push(createGenerator('gen-nest', ['nest', 'api'], ['backend'], ['src/main.ts']));
    }
    if (config.stack.backend === 'fastify') {
      generators.push(
        createGenerator('gen-fastify', ['fastify', 'api'], ['backend'], ['src/server.ts']),
      );
    }
    if (config.stack.backend === 'hono') {
      generators.push(createGenerator('gen-hono', ['hono', 'api'], ['backend'], ['src/app.ts']));
    }
    if (config.stack.backend === 'node-auth') {
      generators.push(
        createGenerator(
          'gen-node-auth',
          ['express', 'authentication', 'api'],
          ['backend'],
          ['src/auth', 'src/routes/auth.routes.ts'],
        ),
      );
    }
  }
  if (config.stack.styling === 'tailwind') {
    generators.push(
      createGenerator('gen-tailwind', ['tailwind'], ['frontend'], ['tailwind.config.js']),
    );
  }
  if (config.stack.styling === 'mui') {
    generators.push(createGenerator('gen-mui', ['mui'], ['frontend', 'react'], ['src/theme.ts']));
  }
  if (config.stack.database === 'postgres' && config.stack.orm === 'prisma') {
    generators.push(
      createGenerator(
        'gen-prisma',
        ['database', 'prisma'],
        ['typescript-project'],
        ['prisma/schema.prisma'],
      ),
    );
  }
  if (config.stack.database === 'mongodb' && config.stack.orm === 'mongoose') {
    generators.push(
      createGenerator(
        'gen-mongoose',
        ['database', 'mongoose'],
        ['typescript-project'],
        ['src/db/mongoose.ts'],
      ),
    );
  }
  if (config.tools.docker)
    generators.push(
      createGenerator('gen-docker', ['docker'], ['typescript-project'], ['Dockerfile']),
    );
  if (config.tools.githubActions) {
    generators.push(
      createGenerator(
        'gen-github-actions',
        ['ci'],
        ['typescript-project'],
        ['.github/workflows/ci.yml'],
      ),
    );
  }
  if (config.tools.eslint)
    generators.push(
      createGenerator('gen-eslint', ['lint'], ['typescript-project'], ['.eslintrc.json']),
    );
  if (config.tools.prettier)
    generators.push(
      createGenerator('gen-prettier', ['format'], ['typescript-project'], ['.prettierrc']),
    );
  return generators;
}

function createGenerator(
  id: string,
  capabilitiesProvided: string[],
  capabilitiesRequired: string[],
  files: string[],
): ComposableGeneratorContribution {
  return {
    id,
    version: '1.0.0',
    capabilitiesProvided,
    capabilitiesRequired,
    files,
    dependencies: [],
  };
}

function createDependencyGraph(
  config: NormalizedProjectConfig,
  files: GeneratedTemplateFile[],
  generators: ComposableGeneratorContribution[],
): DependencyGraph {
  const graph = new DependencyGraph();
  const packageFile = files.find((file) => file.path === 'package.json');
  if (!packageFile) return graph;
  const parsed = JSON.parse(packageFile.content) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  for (const [name, version] of Object.entries(parsed.dependencies ?? {})) {
    graph.add({
      name,
      version,
      type: 'runtime',
      target: 'root',
      packageManager: config.stack.packageManager,
      source: sourceForPackage(name, generators),
    });
  }
  for (const [name, version] of Object.entries(parsed.devDependencies ?? {})) {
    graph.add({
      name,
      version,
      type: 'dev',
      target: 'root',
      packageManager: config.stack.packageManager,
      source: sourceForPackage(name, generators),
    });
  }
  return graph;
}

function sourceForPackage(name: string, generators: ComposableGeneratorContribution[]) {
  const mapping: [string, string][] = [
    ['next', 'gen-next'],
    ['react', 'gen-vite-react'],
    ['express', 'gen-express'],
    ['@nestjs', 'gen-nest'],
    ['fastify', 'gen-fastify'],
    ['hono', 'gen-hono'],
    ['@hono', 'gen-hono'],
    ['jsonwebtoken', 'gen-node-auth'],
    ['bcryptjs', 'gen-node-auth'],
    ['tailwind', 'gen-tailwind'],
    ['@mui', 'gen-mui'],
    ['@emotion', 'gen-mui'],
    ['prisma', 'gen-prisma'],
    ['@prisma', 'gen-prisma'],
    ['mongoose', 'gen-mongoose'],
    ['eslint', 'gen-eslint'],
    ['prettier', 'gen-prettier'],
  ];
  const generatorId =
    mapping.find(([prefix]) => name.startsWith(prefix))?.[1] ?? 'gen-base-typescript';
  const exists = generators.some((generator) => generator.id === generatorId);
  return {
    generatorId: exists ? generatorId : 'gen-base-typescript',
    reason: `${name} is required by ${exists ? generatorId : 'the base TypeScript project'}`,
  };
}

function createProjectGraph(
  config: NormalizedProjectConfig,
  files: GeneratedTemplateFile[],
  generators: ComposableGeneratorContribution[],
): ProjectGraph {
  const builder = new ProjectGraphBuilder();
  builder.addNode({
    id: 'app:root',
    type: 'app',
    name: config.projectName,
    sourceGenerator: 'gen-base-typescript',
  });
  for (const file of files) {
    builder.addNode({
      id: `file:${file.path}`,
      type: classifyFile(file.path),
      name: file.path,
      path: file.path,
      sourceGenerator: generatorForFile(file.path, generators),
    });
    builder.addEdge({ from: 'app:root', to: `file:${file.path}`, relation: 'contains' });
  }
  return builder.build(config);
}

function classifyFile(filePath: string) {
  if (filePath.includes('route') || filePath.includes('controller')) return 'api-endpoint';
  if (filePath.includes('page.tsx')) return 'page';
  if (filePath.includes('layout.tsx')) return 'layout';
  if (filePath.includes('service')) return 'service';
  if (filePath.includes('/db/') || filePath.includes('\\db\\')) return 'database-client';
  if (filePath.includes('model')) return 'model';
  if (filePath.endsWith('package.json')) return 'package';
  if (filePath.includes('Docker') || filePath.includes('.github')) return 'tooling';
  if (
    filePath.endsWith('.json') ||
    filePath.endsWith('.js') ||
    filePath.endsWith('.ts') ||
    filePath.startsWith('.')
  ) {
    return 'config-file';
  }
  return 'component';
}

function generatorForFile(filePath: string, generators: ComposableGeneratorContribution[]): string {
  return (
    generators.find((generator) => generator.files.some((file) => filePath.startsWith(file)))?.id ??
    'gen-base-typescript'
  );
}

function rewriteMetadataFiles(
  config: NormalizedProjectConfig,
  files: GeneratedTemplateFile[],
  projectGraph: ProjectGraph,
  dependencyGraph: DependencyGraphResult,
  generators: ComposableGeneratorContribution[],
): GeneratedTemplateFile[] {
  return files.map((file) => {
    if (file.path === 'structify.manifest.json') {
      const manifest = JSON.parse(file.content) as Record<string, unknown>;
      return {
        ...file,
        content:
          JSON.stringify(
            {
              ...manifest,
              preset: config.preset,
              generatorVersions: Object.fromEntries(
                generators.map((generator) => [generator.id, generator.version]),
              ),
              projectGraphPath: 'structify.project-graph.json',
              projectGraphSummary: projectGraph.summary,
              dependencyDiagnostics: dependencyGraph.diagnostics,
              analytics: {
                fileCount: files.length + 1,
                generatorCount: generators.length,
                dependencyCount: dependencyGraph.resolved.length,
              },
            },
            null,
            2,
          ) + '\n',
      };
    }
    if (file.path === 'structify.config.json') {
      const parsed = JSON.parse(file.content) as Record<string, unknown>;
      return {
        ...file,
        content:
          JSON.stringify(
            {
              ...parsed,
              structify: {
                version: '1.0.0',
                generatedBy: 'structify',
                manifestPath: 'structify.manifest.json',
                projectGraphPath: 'structify.project-graph.json',
                packageManager: config.stack.packageManager,
              },
            },
            null,
            2,
          ) + '\n',
      };
    }
    return file;
  });
}
