import path from 'path';
import fs from 'fs';
import { isGenerated, isIgnored } from '../intelligence/ignore.js';
import { ArchitecturalImportance, ProjectAnalysis, ProjectNode } from '../intelligence/types.js';
import { ArchitectureViewModel } from './types.js';

export type ArchitectureTreeRenderMode = 'overview' | 'full' | 'important';

export interface ArchitectureTreeRenderOptions {
  mode?: ArchitectureTreeRenderMode;
  depth?: number;
}

export interface ArchitectureTreeRenderSummary {
  sectionsDisplayed: number;
  foldersDisplayed: number;
  filesDisplayed: number;
  importantFiles: number;
  ignoredFiles: number;
}

export interface ArchitectureTreeRenderResult {
  text: string;
  summary: ArchitectureTreeRenderSummary;
}

interface RenderNode {
  name: string;
  path: string;
  kind: 'directory' | 'file';
  importance: ArchitecturalImportance;
  children: RenderNode[];
}

const RENDERER_IGNORED_DIRS = new Set([
  '.git',
  '.github',
  '.vscode',
  '.idea',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.angular',
  '.astro',
  '.turbo',
  '.cache',
  '.parcel-cache',
  '.vite',
  '.yarn',
  '.pnpm-store',
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'tmp',
  'temp',
  'logs',
  'target',
  'bin',
  'obj',
  '.gradle',
  '__pycache__',
  '.terraform',
  '.serverless',
  '.vercel',
  'docs',
  'documentation',
]);

const GENERATED_FILE_PATTERNS = [
  /\.min\.js$/i,
  /\.min\.css$/i,
  /\.bundle\.js$/i,
  /\.map$/i,
  /\.log$/i,
  /\.pid$/i,
  /\.cache$/i,
  /\.snap$/i,
  /\.tsbuildinfo$/i,
  // Lockfiles:
  /^pnpm-lock\.yaml$/i,
  /^package-lock\.json$/i,
  /^yarn\.lock$/i,
  /^bun\.lockb$/i,
  /^Cargo\.lock$/i,
  /^composer\.lock$/i,
  /^Gemfile\.lock$/i,
  /^poetry\.lock$/i,
];

const ARCHITECTURAL_FOLDERS = new Set([
  'src',
  'app',
  'pages',
  'components',
  'layouts',
  'routes',
  'controllers',
  'services',
  'repositories',
  'entities',
  'models',
  'schemas',
  'validators',
  'middleware',
  'hooks',
  'contexts',
  'stores',
  'providers',
  'lib',
  'utils',
  'config',
  'database',
  'db',
  'migrations',
  'seeders',
  'prisma',
  'graphql',
  'api',
  'public',
  'assets',
  'styles',
  'tests',
  'docs',
  'scripts',
  'packages',
  'apps',
  'libs',
  'tools',
  'examples',
  'images',
  'fonts',
  'icons',
  'videos',
  'cmd',
  'internal',
  'pkg',
  'venv',
]);

const CRITICAL_FILES = new Set([
  'package.json',
  'turbo.json',
  'schema.prisma',
  'nx.json',
  'lerna.json',
  'Cargo.toml',
  'pyproject.toml',
]);

const HIGH_FILES = new Set([
  'README.md',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.override.yml',
  'kubernetes.yml',
  'requirements.txt',
]);

const MEDIUM_FILES = new Set([
  'tsconfig.json',
  'jsconfig.json',
  'nest-cli.json',
  'angular.json',
  'LICENSE',
  '.gitignore',
  '.editorconfig',
  '.prettierrc',
]);

const MEDIUM_FILE_PATTERNS = [
  /^vite\.config\..+$/i,
  /^next\.config\..+$/i,
  /^nuxt\.config\..+$/i,
  /^astro.config\..+$/i,
  /^webpack\.config\..+$/i,
  /^rollup\.config\..+$/i,
  /^vitest\.config\..+$/i,
  /^jest\.config\..+$/i,
  /^playwright\.config\..+$/i,
  /^cypress\.config\..+$/i,
  /^eslint\.config\..+$/i,
];

export function renderArchitectureTree(
  view: ArchitectureViewModel,
  options: ArchitectureTreeRenderOptions = {},
): ArchitectureTreeRenderResult {
  const mode = options.mode ?? 'overview';
  const maxDepth = options.depth ?? Number.POSITIVE_INFINITY;
  const root = buildRenderableTree(view.source.tree, view.source, 0, mode, maxDepth);
  const lines = [`📦 ${view.title}`];

  if (root?.children.length) {
    lines.push(...renderNodeLines(root.children, '', mode, maxDepth));
  } else {
    lines.push('└── 📄 No architectural structure available');
  }

  const summary = collectSummary(root?.children ?? [], view, mode, maxDepth);
  lines.push('');
  lines.push(
    `Summary: ${summary.sectionsDisplayed} sections, ${summary.foldersDisplayed} folders, ${summary.filesDisplayed} files, ${summary.importantFiles} important files, ${summary.ignoredFiles} ignored files`,
  );

  return {
    text: lines.join('\n'),
    summary,
  };
}

export function renderArchitectureTreeMarkdown(
  view: ArchitectureViewModel,
  options: ArchitectureTreeRenderOptions = {},
): string {
  const rendered = renderArchitectureTree(view, options);
  return ['```text', rendered.text.replace(/\nSummary:.*$/, ''), '```'].join('\n');
}

function isEnvFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower === '.env' || lower.startsWith('.env.');
}

type RendererImportance = 'critical' | 'high' | 'medium' | 'low';

function getFileImportance(
  fileName: string,
  _targetPath: string,
  viewImportance?: ArchitecturalImportance,
): RendererImportance {
  if (CRITICAL_FILES.has(fileName)) {
    return 'critical';
  }
  if (HIGH_FILES.has(fileName)) {
    return 'high';
  }
  if (MEDIUM_FILES.has(fileName) || isEnvFile(fileName)) {
    return 'medium';
  }
  if (MEDIUM_FILE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return 'medium';
  }
  if (viewImportance) {
    if (viewImportance === 'critical') return 'critical';
    if (viewImportance === 'high') return 'high';
    if (viewImportance === 'medium') return 'medium';
  }
  return 'low';
}

function shouldRenderFile(
  targetPath: string,
  analysis: ProjectAnalysis,
  mode: ArchitectureTreeRenderMode,
): boolean {
  const normalizedPath = targetPath.replaceAll('\\', '/');
  if (
    normalizedPath === 'PROJECT_STRUCTURE.md' ||
    normalizedPath === 'graph.html' ||
    path.basename(normalizedPath) === 'PROJECT_STRUCTURE.md'
  ) {
    return false;
  }

  if (isIgnored(normalizedPath) || isGenerated(normalizedPath)) {
    return false;
  }

  const parts = normalizedPath.split('/').filter(Boolean);
  if (parts.some((part) => RENDERER_IGNORED_DIRS.has(part))) {
    return false;
  }

  const fileName = path.basename(targetPath);
  if (GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return false;
  }

  if (mode === 'full' || mode === 'overview') {
    return true;
  }

  // mode === 'important'
  const file = analysis.files.find((candidate) => candidate.path === targetPath);
  const importance = getFileImportance(fileName, targetPath, file?.importance);
  return importance === 'critical' || importance === 'high';
}

function buildRenderableTree(
  node: ProjectNode,
  analysis: ProjectAnalysis,
  depth: number,
  mode: ArchitectureTreeRenderMode,
  maxDepth: number,
): RenderNode | null {
  const normalizedPath = node.path.replaceAll('\\', '/');
  if (isIgnored(normalizedPath) || isGenerated(normalizedPath)) {
    return null;
  }

  const parts = normalizedPath.split('/').filter(Boolean);
  if (parts.some((part) => RENDERER_IGNORED_DIRS.has(part))) {
    return null;
  }

  if (node.kind === 'file') {
    if (!shouldRenderFile(node.path, analysis, mode)) {
      return null;
    }

    const file = analysis.files.find((candidate) => candidate.path === node.path);
    return {
      name: node.name,
      path: node.path,
      kind: 'file',
      importance: file?.importance ?? 'low',
      children: [],
    };
  }

  // Handle directory
  if (depth >= maxDepth) {
    const file = analysis.files.find((candidate) => candidate.path === node.path);
    const shouldInclude =
      depth === 0 ||
      mode === 'full' ||
      isPriorityDirectory(node) ||
      hasImportantDescendant(node, analysis);

    if (!shouldInclude) {
      return null;
    }

    return {
      name: node.name,
      path: node.path,
      kind: 'directory',
      importance: file?.importance ?? 'low',
      children: [],
    };
  }

  const visibleChildren = node.children
    .map((child) => buildRenderableTree(child, analysis, depth + 1, mode, maxDepth))
    .filter((child): child is RenderNode => Boolean(child));

  // Sort children deterministically:
  // Directories first, then files. Within that, alphabetically by name.
  visibleChildren.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });

  const file = analysis.files.find((candidate) => candidate.path === node.path);
  const shouldInclude =
    depth === 0 ||
    mode === 'full' ||
    isPriorityDirectory(node) ||
    visibleChildren.length > 0 ||
    hasImportantDescendant(node, analysis);

  if (!shouldInclude) {
    return null;
  }

  return {
    name: node.name,
    path: node.path,
    kind: 'directory',
    importance: file?.importance ?? deriveDirectoryImportance(visibleChildren),
    children: visibleChildren,
  };
}

function renderNodeLines(
  nodes: RenderNode[],
  prefix: string,
  mode: ArchitectureTreeRenderMode,
  maxDepth: number,
): string[] {
  const lines: string[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const connector = index === nodes.length - 1 ? '└── ' : '├── ';
    const nextPrefix = prefix + (index === nodes.length - 1 ? '    ' : '│   ');
    lines.push(`${prefix}${connector}${getNodeIcon(node)} ${node.name}`);

    if (node.kind === 'directory' && node.children.length > 0) {
      lines.push(...renderNodeLines(node.children, nextPrefix, mode, maxDepth));
    }
  }
  return lines;
}

function hasImportantDescendant(node: ProjectNode, analysis: ProjectAnalysis): boolean {
  if (node.kind === 'file') {
    const file = analysis.files.find((candidate) => candidate.path === node.path);
    if (!file) return false;
    const importance = getFileImportance(file.name, file.path, file.importance);
    return importance === 'critical' || importance === 'high';
  }
  return node.children.some((child) => hasImportantDescendant(child, analysis));
}

function isPriorityDirectory(node: ProjectNode): boolean {
  const name = normalizeName(node.name);
  if (ARCHITECTURAL_FOLDERS.has(name)) {
    return true;
  }
  return node.path.split('/').some((segment) => ARCHITECTURAL_FOLDERS.has(normalizeName(segment)));
}

function deriveDirectoryImportance(children: RenderNode[]): ArchitecturalImportance {
  if (children.some((child) => child.importance === 'critical')) return 'critical';
  if (children.some((child) => child.importance === 'high')) return 'high';
  if (children.some((child) => child.importance === 'medium')) return 'medium';
  return 'low';
}

function getNodeIcon(node: RenderNode): string {
  if (node.kind === 'file') {
    const fileName = path.basename(node.path).toLowerCase();
    if (fileName.startsWith('.env') || isEnvFile(fileName)) {
      return '🌱';
    }
    if (fileName.endsWith('.prisma') || fileName === 'schema.prisma') {
      return '🗄️';
    }
    if (
      fileName.endsWith('.png') ||
      fileName.endsWith('.svg') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.webp') ||
      fileName.endsWith('.ico') ||
      fileName.endsWith('.woff') ||
      fileName.endsWith('.woff2') ||
      fileName.endsWith('.ttf') ||
      fileName.endsWith('.eot') ||
      fileName.endsWith('.mp4') ||
      fileName.endsWith('.webm') ||
      fileName.endsWith('.mp3') ||
      fileName.endsWith('.wav')
    ) {
      return '🖼️';
    }
    if (
      fileName === 'package.json' ||
      fileName === 'tsconfig.json' ||
      fileName === 'turbo.json' ||
      fileName === 'docker-compose.yml' ||
      fileName === 'docker-compose.yaml' ||
      fileName.includes('config') ||
      CRITICAL_FILES.has(path.basename(node.path)) ||
      HIGH_FILES.has(path.basename(node.path)) ||
      MEDIUM_FILES.has(path.basename(node.path)) ||
      MEDIUM_FILE_PATTERNS.some((pattern) => pattern.test(path.basename(node.path)))
    ) {
      return '⚙️';
    }
    if (fileName === 'README.md' || fileName.endsWith('.md')) {
      return '📚';
    }
    return '📄';
  }
  return '📁';
}

function collectSummary(
  nodes: RenderNode[],
  view: ArchitectureViewModel,
  mode: ArchitectureTreeRenderMode,
  maxDepth: number,
): ArchitectureTreeRenderSummary {
  const displayedFiles = collectDisplayedFiles(nodes);
  const displayedCategories = new Set<string>();
  for (const fileNode of displayedFiles) {
    const file = view.source.files.find((f) => f.path === fileNode.path);
    if (file?.category) {
      displayedCategories.add(file.category);
    }
  }

  const SECTION_KEYS = new Set([
    'frontend',
    'backend',
    'shared',
    'database',
    'assets',
    'public',
    'configuration',
  ]);
  const sectionsDisplayed = Array.from(displayedCategories).filter((cat) =>
    SECTION_KEYS.has(cat),
  ).length;

  return {
    sectionsDisplayed,
    foldersDisplayed: countVisibleNodes(nodes, 'directory', mode, maxDepth),
    filesDisplayed: displayedFiles.length,
    importantFiles: countVisibleNodes(nodes, 'file', mode, maxDepth, true),
    ignoredFiles: countPhysicalIgnoredFiles(view.source.project.path, view.source.project.path),
  };
}

function collectDisplayedFiles(nodes: RenderNode[]): RenderNode[] {
  const result: RenderNode[] = [];
  function recurse(list: RenderNode[]) {
    for (const node of list) {
      if (node.kind === 'file') {
        result.push(node);
      }
      recurse(node.children);
    }
  }
  recurse(nodes);
  return result;
}

function countVisibleNodes(
  nodes: RenderNode[],
  kind: 'directory' | 'file',
  mode: ArchitectureTreeRenderMode,
  maxDepth: number,
  importantOnly = false,
  depth = 0,
): number {
  let count = 0;
  for (const node of nodes) {
    if (kind === 'directory' && node.kind === 'directory') {
      count += 1;
    }
    if (kind === 'file' && node.kind === 'file') {
      if (!importantOnly) {
        count += 1;
      } else {
        const fileImportance = getFileImportance(
          path.basename(node.path),
          node.path,
          node.importance,
        );
        if (fileImportance === 'critical' || fileImportance === 'high') {
          count += 1;
        }
      }
    }
    if (node.kind === 'directory' && node.children.length > 0 && depth < maxDepth) {
      count += countVisibleNodes(node.children, kind, mode, maxDepth, importantOnly, depth + 1);
    }
  }
  return count;
}

function countPhysicalIgnoredFiles(dir: string, baseDir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replaceAll('\\', '/');
      const isCustomIgnored =
        GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(entry.name)) ||
        RENDERER_IGNORED_DIRS.has(entry.name);
      if (isIgnored(relativePath) || isGenerated(relativePath) || isCustomIgnored) {
        if (entry.isDirectory()) {
          count += countAllPhysicalFiles(fullPath);
        } else {
          count += 1;
        }
      } else if (entry.isDirectory()) {
        count += countPhysicalIgnoredFiles(fullPath, baseDir);
      }
    }
  } catch {
    // Ignore read errors
  }
  return count;
}

function countAllPhysicalFiles(dir: string): number {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countAllPhysicalFiles(fullPath);
      } else {
        count += 1;
      }
    }
  } catch {
    // Ignore read errors
  }
  return count;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
