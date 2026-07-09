import { ArchitecturalCategory, ArchitecturalFileType, ArchitecturalImportance, ProjectAnalysis, ProjectNodeKind } from '../intelligence/types.js';

export type ArchitectureRenderMode = 'architectural' | 'complete';

export interface ArchitectureViewNode {
  id: string;
  name: string;
  path: string;
  kind: ProjectNodeKind;
  type: ArchitecturalFileType | 'section';
  importance: ArchitecturalImportance;
  children: ArchitectureViewNode[];
  collapsed: boolean;
  category: ArchitecturalCategory | 'section';
}

export interface ArchitectureSectionCounts {
  total: number;
  folders: number;
  files: number;
  architecturalFiles: number;
}

export interface ArchitectureSection {
  id: string;
  key: 'frontend' | 'backend' | 'shared' | 'database' | 'assets' | 'public' | 'configuration';
  title: string;
  folders: ArchitectureViewNode[];
  architecturalFiles: ArchitectureViewNode[];
  childNodes: ArchitectureViewNode[];
  counts: ArchitectureSectionCounts;
  importance: ArchitecturalImportance;
}

export interface ArchitectureViewStatistics {
  totalFiles: number;
  architecturalFiles: number;
  frontendFiles: number;
  backendFiles: number;
  assets: number;
  configuration: number;
  databaseFiles: number;
}

export interface ArchitectureViewModel {
  title: string;
  generatedAt: Date;
  projectType: string;
  mode: ArchitectureRenderMode;
  sections: ArchitectureSection[];
  statistics: ArchitectureViewStatistics;
  source: ProjectAnalysis;
}
