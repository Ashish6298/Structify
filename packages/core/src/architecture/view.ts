import {
  ArchitecturalFile,
  ArchitecturalImportance,
  ProjectAnalysis,
  ProjectNode,
} from '../intelligence/types.js';
import { ArchitectureRenderMode, ArchitectureSection, ArchitectureViewModel, ArchitectureViewNode } from './types.js';

const SECTION_ORDER = [
  ['frontend', 'Frontend'],
  ['backend', 'Backend'],
  ['shared', 'Shared'],
  ['database', 'Database'],
  ['assets', 'Assets'],
  ['public', 'Public'],
  ['configuration', 'Configuration'],
] as const;

export function createArchitectureView(
  analysis: ProjectAnalysis,
  mode: ArchitectureRenderMode = 'architectural',
): ArchitectureViewModel {
  const sections = groupSections(analysis, mode);
  return {
    title: analysis.project.name,
    generatedAt: new Date(analysis.generatedAt),
    projectType: analysis.project.type,
    mode,
    sections,
    statistics: {
      totalFiles: countFiles(analysis.files),
      architecturalFiles: analysis.files.filter(isArchitecturalFile).length,
      frontendFiles: analysis.files.filter((file) => file.category === 'frontend').length,
      backendFiles: analysis.files.filter((file) => file.category === 'backend').length,
      assets: analysis.files.filter((file) => file.category === 'assets').length,
      configuration: analysis.files.filter(
        (file) => file.category === 'configuration' || file.category === 'environment' || file.category === 'metadata',
      ).length,
      databaseFiles: analysis.files.filter((file) => file.category === 'database').length,
    },
    source: analysis,
  };
}

export function filterArchitecturalView(analysis: ProjectAnalysis): ArchitectureViewModel {
  return createArchitectureView(analysis, 'architectural');
}

export function filterCompleteView(analysis: ProjectAnalysis): ArchitectureViewModel {
  return createArchitectureView(analysis, 'complete');
}

export function groupSections(
  analysis: ProjectAnalysis,
  mode: ArchitectureRenderMode = 'architectural',
): ArchitectureSection[] {
  const fileMap = new Map(analysis.files.map((file) => [file.path, file]));

  return SECTION_ORDER.map(([key, title]) => {
    const bucket = analysis.architecture[key];
    const sectionNodes = bucket.files
      .filter((file) => shouldIncludeFile(file, mode))
      .map((file) => findTopLevelNode(analysis.tree, file.path))
      .filter((node): node is ProjectNode => Boolean(node))
      .map((node) => toViewNode(node, fileMap, mode))
      .filter((node): node is ArchitectureViewNode => Boolean(node));

    const deduped = dedupeNodes(sectionNodes);
    const sorted = sortNodes(deduped);
    const flatFiles = flattenNodes(sorted).filter((node) => node.kind === 'file');
    const folders = sorted.filter((node) => node.kind !== 'file');
    const architecturalFiles = flatFiles.filter((node) => node.kind === 'file' && node.type !== 'asset');

    return {
      id: `section:${key}`,
      key,
      title,
      folders,
      architecturalFiles,
      childNodes: sorted,
      counts: {
        total: flatFiles.length + folders.length,
        folders: folders.length,
        files: flatFiles.length,
        architecturalFiles: flatFiles.filter((node) => node.importance !== 'low').length,
      },
      importance: deriveSectionImportance(flatFiles),
    };
  }).filter((section) => section.childNodes.length > 0);
}

export function sortNodes(nodes: ArchitectureViewNode[]): ArchitectureViewNode[] {
  return [...nodes]
    .map((node) => ({
      ...node,
      children: sortNodes(node.children),
    }))
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'directory' ? -1 : 1;
      }
      if (importanceRank(left.importance) !== importanceRank(right.importance)) {
        return importanceRank(left.importance) - importanceRank(right.importance);
      }
      return left.name.localeCompare(right.name);
    });
}

function toViewNode(
  node: ProjectNode,
  fileMap: Map<string, ArchitecturalFile>,
  mode: ArchitectureRenderMode,
): ArchitectureViewNode | null {
  const file = fileMap.get(node.path);
  if (node.kind === 'file') {
    if (!file || !shouldIncludeFile(file, mode)) {
      return null;
    }
    return {
      id: node.id,
      name: node.name,
      path: node.path,
      kind: node.kind,
      type: file.type,
      importance: file.importance,
      children: [],
      collapsed: true,
      category: file.category,
    };
  }

  const childNodes = node.children
    .map((child) => toViewNode(child, fileMap, mode))
    .filter((child): child is ArchitectureViewNode => Boolean(child));

  if (childNodes.length === 0 && node.kind !== 'root') {
    return null;
  }

  const selfFile = fileMap.get(node.path);
  return {
    id: node.id,
    name: node.name,
    path: node.path,
    kind: node.kind,
    type: selfFile?.type ?? 'directory',
    importance: selfFile?.importance ?? deriveNodeImportance(childNodes),
    children: sortNodes(childNodes),
    collapsed: true,
    category: selfFile?.category ?? deriveNodeCategory(childNodes),
  };
}

function shouldIncludeFile(file: ArchitecturalFile, mode: ArchitectureRenderMode): boolean {
  if (file.metadata['generated'] === true) {
    return false;
  }
  if (mode === 'complete') {
    return true;
  }
  if (file.importance !== 'low') {
    return true;
  }
  return isArchitecturalFile(file);
}

function isArchitecturalFile(file: ArchitecturalFile): boolean {
  return file.metadata['architectural'] === true && file.category !== 'tests';
}

function findTopLevelNode(root: ProjectNode, filePath: string): ProjectNode | null {
  const topLevelPath = filePath.split('/')[0] ?? filePath;
  return root.children.find((child) => child.path === topLevelPath) ?? null;
}

function dedupeNodes(nodes: ArchitectureViewNode[]): ArchitectureViewNode[] {
  const seen = new Set<string>();
  const result: ArchitectureViewNode[] = [];
  for (const node of nodes) {
    if (!seen.has(node.path)) {
      seen.add(node.path);
      result.push(node);
    }
  }
  return result;
}

function flattenNodes(nodes: ArchitectureViewNode[]): ArchitectureViewNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function deriveSectionImportance(nodes: ArchitectureViewNode[]): ArchitecturalImportance {
  if (nodes.some((node) => node.importance === 'critical')) {
    return 'critical';
  }
  if (nodes.some((node) => node.importance === 'high')) {
    return 'high';
  }
  if (nodes.some((node) => node.importance === 'medium')) {
    return 'medium';
  }
  return 'low';
}

function deriveNodeImportance(nodes: ArchitectureViewNode[]): ArchitecturalImportance {
  return deriveSectionImportance(nodes);
}

function deriveNodeCategory(nodes: ArchitectureViewNode[]): ArchitectureViewNode['category'] {
  if (nodes[0]) {
    return nodes[0].category;
  }
  return 'section';
}

function importanceRank(importance: ArchitecturalImportance): number {
  switch (importance) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    default:
      return 3;
  }
}

function countFiles(files: ArchitecturalFile[]): number {
  return files.filter((file) => file.type !== 'directory').length;
}
