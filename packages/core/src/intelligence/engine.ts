import fs from 'fs';
import path from 'path';
import {
  AnalyzeProjectOptions,
  ArchitectureBucket,
  ArchitecturalCategory,
  ArchitecturalFile,
  ArchitecturalFileType,
  ArchitecturalImportance,
  ProjectAnalysis,
  ProjectFrameworkInfo,
  ProjectNode,
  ProjectPackageManagerInfo,
} from './types.js';
import { isArchitectural, isAsset, isConfiguration, isGenerated, isIgnored } from './ignore.js';

type Manifest = Record<string, unknown>;

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
  '.md',
  '.prisma',
]);

const DEFAULT_OPTIONS: Required<AnalyzeProjectOptions> = {
  includeTests: true,
};

export function analyzeProject(
  projectPath: string,
  options: AnalyzeProjectOptions = {},
): ProjectAnalysis {
  const resolvedPath = path.resolve(projectPath);
  const normalizedOptions = { ...DEFAULT_OPTIONS, ...options };

  if (!fs.existsSync(resolvedPath)) {
    return emptyAnalysis(resolvedPath);
  }

  const nodes = new Map<string, ProjectNode>();
  const files: ArchitecturalFile[] = [];
  const rootNode: ProjectNode = {
    id: createId('node', '.'),
    name: path.basename(resolvedPath),
    path: '.',
    children: [],
    kind: 'root',
  };
  nodes.set('.', rootNode);

  walkProject(resolvedPath, '.', nodes, files, normalizedOptions);

  const packageJsonPath = path.join(resolvedPath, 'package.json');
  const packageJson = readJson(packageJsonPath);
  const workspacePackageJsons = files
    .filter((file) => file.name === 'package.json' && file.path !== 'package.json')
    .map((file) => file.path);

  const packageManager = detectPackageManager(files);
  const framework = detectFrameworks(packageJson, files);
  const dependencies = collectDependencies(packageJson);
  const metadata = collectMetadata(files);
  const modules = detectModules(packageJson, files, metadata.structifyProject);
  const architecture = buildArchitecture(files);

  return {
    project: {
      name: readProjectName(packageJson) ?? path.basename(resolvedPath),
      path: resolvedPath,
      exists: true,
      type: metadata.structifyProject ? 'structify' : 'external',
      workspace: workspacePackageJsons.length > 0,
    },
    architecture,
    dependencies,
    modules,
    metadata: {
      ...metadata,
      packageJson: fs.existsSync(packageJsonPath) ? 'package.json' : null,
      workspacePackageJsons,
    },
    framework,
    packageManager,
    files: files.filter((file) => normalizedOptions.includeTests || file.category !== 'tests'),
    tree: rootNode,
    relationships: [],
    generatedAt: new Date().toISOString(),
  };
}

function walkProject(
  rootPath: string,
  relativePath: string,
  nodes: Map<string, ProjectNode>,
  files: ArchitecturalFile[],
  options: Required<AnalyzeProjectOptions>,
): void {
  const absolutePath = relativePath === '.' ? rootPath : path.join(rootPath, relativePath);
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  const visibleEntries = entries
    .filter((entry) => {
      const entryRelativePath = normalizeRelativePath(path.join(relativePath, entry.name));
      if (isIgnored(entryRelativePath)) {
        return false;
      }
      if (isGenerated(entryRelativePath) && !entry.isDirectory() && !isLockFile(entry.name)) {
        return false;
      }
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of visibleEntries) {
    const entryRelativePath = normalizeRelativePath(path.join(relativePath, entry.name));
    const parentRelativePath = relativePath;
    const parentNode = nodes.get(parentRelativePath);
    if (!parentNode) {
      continue;
    }

    const node: ProjectNode = {
      id: createId('node', entryRelativePath),
      name: entry.name,
      path: entryRelativePath,
      children: [],
      kind: entry.isDirectory() ? 'directory' : 'file',
    };
    parentNode.children.push(node);
    nodes.set(entryRelativePath, node);

    const absoluteEntryPath = path.join(rootPath, entryRelativePath);
    const stat = fs.statSync(absoluteEntryPath);
    const childNames = entry.isDirectory()
      ? fs
          .readdirSync(absoluteEntryPath, { withFileTypes: true })
          .filter(
            (child) => !isIgnored(normalizeRelativePath(path.join(entryRelativePath, child.name))),
          )
          .map((child) =>
            createId('file', normalizeRelativePath(path.join(entryRelativePath, child.name))),
          )
      : [];

    const fileRecord = createArchitecturalFile(
      entryRelativePath,
      entry.isDirectory(),
      stat,
      parentRelativePath === '.' ? null : createId('file', parentRelativePath),
      childNames,
    );
    if (options.includeTests || fileRecord.category !== 'tests') {
      files.push(fileRecord);
    }

    if (entry.isDirectory()) {
      walkProject(rootPath, entryRelativePath, nodes, files, options);
    }
  }
}

function createArchitecturalFile(
  relativePath: string,
  isDirectory: boolean,
  stat: fs.Stats,
  parent: string | null,
  children: string[],
): ArchitecturalFile {
  const category = classifyCategory(relativePath, isDirectory);
  const type = classifyType(relativePath, isDirectory);
  const importance = classifyImportance(relativePath, type, category);
  return {
    id: createId('file', relativePath),
    name: path.basename(relativePath),
    path: relativePath,
    category,
    type,
    importance,
    parent,
    children,
    metadata: {
      extension: isDirectory ? null : path.extname(relativePath).toLowerCase(),
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
      isDirectory,
      architectural: isArchitectural(relativePath),
      generated: isGenerated(relativePath),
      configuration: isConfiguration(relativePath),
      asset: isAsset(relativePath),
    },
  };
}

function classifyCategory(relativePath: string, isDirectory: boolean): ArchitecturalCategory {
  const normalized = relativePath.replaceAll('\\', '/');
  const lower = normalized.toLowerCase();
  const fileName = path.basename(lower);

  if (fileName.startsWith('.env')) {
    return 'environment';
  }
  if (fileName.startsWith('structify.')) {
    return 'metadata';
  }
  if (/(^|\/)(test|tests|__tests__)(\/|$)/.test(lower) || /\.(spec|test)\./.test(lower)) {
    return 'tests';
  }
  if (isAsset(normalized)) {
    return 'assets';
  }
  if (isConfiguration(normalized)) {
    return 'configuration';
  }
  if (/^(public)(\/|$)/.test(lower)) {
    return 'public';
  }
  if (/^(prisma|database|db)(\/|$)/.test(lower)) {
    return 'database';
  }
  if (/^(shared|lib|utils|common)(\/|$)/.test(lower)) {
    return 'shared';
  }
  if (
    /^(src\/(components|pages|app|layouts|features)|components|pages|app)(\/|$)/.test(lower) ||
    fileName === 'index.html'
  ) {
    return 'frontend';
  }
  if (
    /^(src\/(api|controllers|services|repositories|routes|modules)(\/|$)|src\/(server|app|index)\.(ts|js)|server|api)(\/|$)?/.test(
      lower,
    )
  ) {
    return 'backend';
  }
  if (fileName === 'readme.md' || lower.startsWith('docs/')) {
    return 'docs';
  }
  if (isDirectory && ['src', 'app', 'pages'].includes(fileName)) {
    return 'frontend';
  }
  return 'other';
}

function classifyType(relativePath: string, isDirectory: boolean): ArchitecturalFileType {
  if (isDirectory) {
    return 'directory';
  }
  const normalized = relativePath.replaceAll('\\', '/').toLowerCase();
  const fileName = path.basename(normalized);
  if (fileName === 'package.json' || fileName.startsWith('structify.')) {
    return 'manifest';
  }
  if (fileName.startsWith('.env')) {
    return 'environment';
  }
  if (isConfiguration(normalized)) {
    return 'config';
  }
  if (isAsset(normalized)) {
    return 'asset';
  }
  if (/\.(spec|test)\.(ts|tsx|js|jsx)$/.test(normalized)) {
    return 'test';
  }
  if (/page\.(tsx|jsx|ts|js)$/.test(normalized)) {
    return 'page';
  }
  if (/layout\.(tsx|jsx|ts|js)$/.test(normalized)) {
    return 'layout';
  }
  if (/route\.(tsx|jsx|ts|js)$/.test(normalized) || /routes?\//.test(normalized)) {
    return 'route';
  }
  if (/controller/.test(fileName)) {
    return 'controller';
  }
  if (/service/.test(fileName)) {
    return 'service';
  }
  if (/repository/.test(fileName)) {
    return 'repository';
  }
  if (/schema/.test(fileName) || fileName.endsWith('.prisma')) {
    return 'schema';
  }
  if (/model/.test(fileName)) {
    return 'model';
  }
  if (/component/.test(fileName) || /^src\/components\//.test(normalized)) {
    return 'component';
  }
  if (fileName.endsWith('.md')) {
    return 'document';
  }
  if (['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].includes(fileName)) {
    return 'lockfile';
  }
  if (SOURCE_EXTENSIONS.has(path.extname(fileName))) {
    return 'source';
  }
  return 'unknown';
}

function classifyImportance(
  relativePath: string,
  type: ArchitecturalFileType,
  category: ArchitecturalCategory,
): ArchitecturalImportance {
  const normalized = relativePath.replaceAll('\\', '/').toLowerCase();
  const fileName = path.basename(normalized);
  if (
    ['package.json', 'tsconfig.json', 'structify.config.json', 'structify.manifest.json'].includes(
      fileName,
    ) ||
    type === 'page' ||
    type === 'layout' ||
    category === 'database'
  ) {
    return 'critical';
  }
  if (
    ['config', 'manifest', 'controller', 'service', 'repository', 'route'].includes(type) ||
    ['frontend', 'backend', 'shared'].includes(category)
  ) {
    return 'high';
  }
  if (['asset', 'environment', 'document'].includes(type) || category === 'configuration') {
    return 'medium';
  }
  return 'low';
}

function buildArchitecture(files: ArchitecturalFile[]) {
  const buckets = {
    frontend: createBucket('frontend'),
    backend: createBucket('backend'),
    shared: createBucket('shared'),
    assets: createBucket('assets'),
    configuration: createBucket('configuration'),
    public: createBucket('public'),
    database: createBucket('database'),
  };

  for (const file of files) {
    switch (file.category) {
      case 'frontend':
        pushIntoBucket(buckets.frontend, file);
        break;
      case 'backend':
        pushIntoBucket(buckets.backend, file);
        break;
      case 'shared':
        pushIntoBucket(buckets.shared, file);
        break;
      case 'assets':
        pushIntoBucket(buckets.assets, file);
        break;
      case 'configuration':
      case 'environment':
      case 'metadata':
        pushIntoBucket(buckets.configuration, file);
        break;
      case 'public':
        pushIntoBucket(buckets.public, file);
        break;
      case 'database':
        pushIntoBucket(buckets.database, file);
        break;
      default:
        break;
    }
  }

  const architecturalFiles = files.filter(
    (file) => file.metadata['architectural'] === true && file.metadata['generated'] !== true,
  );

  return {
    ...buckets,
    importantFolders: unique(
      files
        .filter((file) => file.type === 'directory' && file.importance !== 'low')
        .map((file) => file.path),
    ),
    architecturalFiles,
  };
}

function createBucket(key: ArchitectureBucket['key']): ArchitectureBucket {
  return {
    key,
    paths: [],
    fileIds: [],
    files: [],
  };
}

function pushIntoBucket(bucket: ArchitectureBucket, file: ArchitecturalFile): void {
  bucket.paths.push(file.path);
  bucket.fileIds.push(file.id);
  bucket.files.push(file);
}

function detectPackageManager(files: ArchitecturalFile[]): ProjectPackageManagerInfo {
  const lockFiles = files.filter((file) => file.type === 'lockfile').map((file) => file.path);
  const firstLockFile = lockFiles[0] ?? null;
  if (!firstLockFile) {
    return { name: 'unknown', lockFile: null };
  }
  if (firstLockFile.endsWith('package-lock.json')) {
    return { name: 'npm', lockFile: firstLockFile };
  }
  if (firstLockFile.endsWith('pnpm-lock.yaml')) {
    return { name: 'pnpm', lockFile: firstLockFile };
  }
  if (firstLockFile.endsWith('yarn.lock')) {
    return { name: 'yarn', lockFile: firstLockFile };
  }
  if (firstLockFile.endsWith('bun.lockb')) {
    return { name: 'bun', lockFile: firstLockFile };
  }
  return { name: 'unknown', lockFile: firstLockFile };
}

function detectFrameworks(
  packageJson: Manifest | undefined,
  files: ArchitecturalFile[],
): ProjectFrameworkInfo {
  const deps = new Set([
    ...Object.keys(readRecord(packageJson, 'dependencies')),
    ...Object.keys(readRecord(packageJson, 'devDependencies')),
  ]);
  const filePaths = new Set(files.map((file) => file.path));
  const frontend: string[] = [];
  const backend: string[] = [];
  const styling: string[] = [];
  const database: string[] = [];
  const orm: string[] = [];

  if (deps.has('next') || hasAny(filePaths, ['next.config.js', 'next.config.ts', 'app/page.tsx'])) {
    frontend.push('next');
  }
  if (deps.has('vite') || hasAny(filePaths, ['vite.config.ts', 'vite.config.js'])) {
    frontend.push('vite');
  }
  if (deps.has('react')) {
    frontend.push('react');
  }
  if (deps.has('@nestjs/core') || filePaths.has('nest-cli.json')) {
    backend.push('nest');
  }
  if (deps.has('express')) {
    backend.push('express');
  }
  if (deps.has('tailwindcss') || hasAny(filePaths, ['tailwind.config.js', 'tailwind.config.ts'])) {
    styling.push('tailwind');
  }
  if (deps.has('@mui/material') || deps.has('@material-ui/core')) {
    styling.push('mui');
  }
  if (deps.has('prisma') || deps.has('@prisma/client') || filePaths.has('prisma/schema.prisma')) {
    orm.push('prisma');
  }
  if (deps.has('mongoose')) {
    orm.push('mongoose');
  }
  if (deps.has('pg') || deps.has('postgres')) {
    database.push('postgres');
  }
  if (deps.has('mongodb') || deps.has('mongoose')) {
    database.push('mongodb');
  }

  const all = unique([...frontend, ...backend, ...styling, ...database, ...orm]);
  return {
    frontend: unique(frontend),
    backend: unique(backend),
    styling: unique(styling),
    database: unique(database),
    orm: unique(orm),
    all,
  };
}

function collectDependencies(packageJson: Manifest | undefined) {
  const dependencies = readRecord(packageJson, 'dependencies');
  const devDependencies = readRecord(packageJson, 'devDependencies');
  const peerDependencies = readRecord(packageJson, 'peerDependencies');
  const optionalDependencies = readRecord(packageJson, 'optionalDependencies');
  return {
    dependencies,
    devDependencies,
    peerDependencies,
    optionalDependencies,
    all: unique([
      ...Object.keys(dependencies),
      ...Object.keys(devDependencies),
      ...Object.keys(peerDependencies),
      ...Object.keys(optionalDependencies),
    ]),
  };
}

function collectMetadata(files: ArchitecturalFile[]) {
  const configFiles = files
    .filter((file) => file.category === 'configuration' || file.category === 'metadata')
    .map((file) => file.path);
  return {
    structifyProject: files.some((file) => file.name === 'structify.config.json'),
    structifyConfig: pickPath(files, 'structify.config.json'),
    structifyManifest: pickPath(files, 'structify.manifest.json'),
    structifyProjectGraph: pickPath(files, 'structify.project-graph.json'),
    tsconfig: files
      .filter((file) => /^tsconfig(\..+)?\.json$/i.test(file.name))
      .map((file) => file.path),
    configFiles,
    envFiles: files.filter((file) => file.type === 'environment').map((file) => file.path),
    lockFiles: files.filter((file) => file.type === 'lockfile').map((file) => file.path),
  };
}

function detectModules(
  packageJson: Manifest | undefined,
  files: ArchitecturalFile[],
  structifyProject: boolean,
) {
  const deps = new Set([
    ...Object.keys(readRecord(packageJson, 'dependencies')),
    ...Object.keys(readRecord(packageJson, 'devDependencies')),
  ]);
  const detected = unique(
    [
      deps.has('tailwindcss') ? 'tailwind' : null,
      deps.has('prisma') || deps.has('@prisma/client') ? 'prisma' : null,
      deps.has('mongoose') ? 'mongoose' : null,
      deps.has('eslint') ? 'eslint' : null,
      deps.has('prettier') ? 'prettier' : null,
      files.some((file) => file.name === 'Dockerfile') ? 'docker' : null,
      files.some((file) => file.path.startsWith('.github/workflows/')) ? 'github-actions' : null,
    ].filter((value): value is string => Boolean(value)),
  );
  return {
    detected,
    structify: structifyProject ? detected : [],
    tooling: detected.filter((moduleName) =>
      ['docker', 'eslint', 'prettier', 'github-actions'].includes(moduleName),
    ),
  };
}

function readProjectName(packageJson: Manifest | undefined): string | undefined {
  const value = packageJson?.['name'];
  return typeof value === 'string' ? value : undefined;
}

function readJson(targetPath: string): Manifest | undefined {
  if (!fs.existsSync(targetPath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8')) as Manifest;
  } catch {
    return undefined;
  }
}

function readRecord(manifest: Manifest | undefined, field: string): Record<string, string> {
  const value = manifest?.[field];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === 'string' && typeof entry[1] === 'string',
    ),
  );
}

function hasAny(values: Set<string>, targets: string[]): boolean {
  return targets.some((target) => values.has(target));
}

function pickPath(files: ArchitecturalFile[], fileName: string): string | null {
  return files.find((file) => file.name === fileName)?.path ?? null;
}

function normalizeRelativePath(targetPath: string): string {
  const normalized = targetPath.replaceAll('\\', '/');
  return normalized === '.' ? '.' : normalized.replace(/^\.\//, '');
}

function createId(prefix: 'node' | 'file', relativePath: string): string {
  return `${prefix}:${relativePath}`;
}

function isLockFile(fileName: string): boolean {
  return ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].includes(fileName);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function emptyAnalysis(projectPath: string): ProjectAnalysis {
  const emptyBucket = (key: ArchitectureBucket['key']): ArchitectureBucket => ({
    key,
    paths: [],
    fileIds: [],
    files: [],
  });
  return {
    project: {
      name: path.basename(projectPath),
      path: projectPath,
      exists: false,
      type: 'external',
      workspace: false,
    },
    architecture: {
      frontend: emptyBucket('frontend'),
      backend: emptyBucket('backend'),
      shared: emptyBucket('shared'),
      assets: emptyBucket('assets'),
      configuration: emptyBucket('configuration'),
      public: emptyBucket('public'),
      database: emptyBucket('database'),
      importantFolders: [],
      architecturalFiles: [],
    },
    dependencies: {
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {},
      all: [],
    },
    modules: {
      detected: [],
      structify: [],
      tooling: [],
    },
    metadata: {
      structifyProject: false,
      structifyConfig: null,
      structifyManifest: null,
      structifyProjectGraph: null,
      packageJson: null,
      tsconfig: [],
      configFiles: [],
      envFiles: [],
      lockFiles: [],
      workspacePackageJsons: [],
    },
    framework: {
      frontend: [],
      backend: [],
      styling: [],
      database: [],
      orm: [],
      all: [],
    },
    packageManager: {
      name: 'unknown',
      lockFile: null,
    },
    files: [],
    tree: {
      id: createId('node', '.'),
      name: path.basename(projectPath),
      path: '.',
      children: [],
      kind: 'root',
    },
    relationships: [],
    generatedAt: new Date().toISOString(),
  };
}
