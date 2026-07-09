export type ArchitecturalCategory =
  | 'frontend'
  | 'backend'
  | 'shared'
  | 'assets'
  | 'configuration'
  | 'public'
  | 'database'
  | 'environment'
  | 'metadata'
  | 'tests'
  | 'docs'
  | 'other';

export type ArchitecturalFileType =
  | 'directory'
  | 'source'
  | 'component'
  | 'page'
  | 'layout'
  | 'route'
  | 'controller'
  | 'service'
  | 'repository'
  | 'model'
  | 'schema'
  | 'config'
  | 'manifest'
  | 'environment'
  | 'asset'
  | 'test'
  | 'document'
  | 'lockfile'
  | 'unknown';

export type ArchitecturalImportance = 'critical' | 'high' | 'medium' | 'low';

export type ProjectNodeKind = 'root' | 'directory' | 'file';

export interface ProjectNode {
  id: string;
  name: string;
  path: string;
  children: ProjectNode[];
  kind: ProjectNodeKind;
}

export interface ArchitecturalFile {
  id: string;
  name: string;
  path: string;
  category: ArchitecturalCategory;
  type: ArchitecturalFileType;
  importance: ArchitecturalImportance;
  parent: string | null;
  children: string[];
  metadata: Record<string, unknown>;
}

export interface ProjectFrameworkInfo {
  frontend: string[];
  backend: string[];
  styling: string[];
  database: string[];
  orm: string[];
  all: string[];
}

export interface ProjectPackageManagerInfo {
  name: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
  lockFile: string | null;
}

export interface ProjectModuleInfo {
  detected: string[];
  structify: string[];
  tooling: string[];
}

export interface ProjectDependencyInfo {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  all: string[];
}

export interface ProjectMetadataInfo {
  structifyProject: boolean;
  structifyConfig: string | null;
  structifyManifest: string | null;
  structifyProjectGraph: string | null;
  packageJson: string | null;
  tsconfig: string[];
  configFiles: string[];
  envFiles: string[];
  lockFiles: string[];
  workspacePackageJsons: string[];
}

export interface ArchitectureBucket {
  key:
    | 'frontend'
    | 'backend'
    | 'shared'
    | 'assets'
    | 'configuration'
    | 'public'
    | 'database';
  paths: string[];
  fileIds: string[];
  files: ArchitecturalFile[];
}

export interface ProjectArchitectureInfo {
  frontend: ArchitectureBucket;
  backend: ArchitectureBucket;
  shared: ArchitectureBucket;
  assets: ArchitectureBucket;
  configuration: ArchitectureBucket;
  public: ArchitectureBucket;
  database: ArchitectureBucket;
  importantFolders: string[];
  architecturalFiles: ArchitecturalFile[];
}

export interface ProjectSummary {
  name: string;
  path: string;
  exists: boolean;
  type: 'structify' | 'external';
  workspace: boolean;
}

export interface ProjectAnalysis {
  project: ProjectSummary;
  architecture: ProjectArchitectureInfo;
  dependencies: ProjectDependencyInfo;
  modules: ProjectModuleInfo;
  metadata: ProjectMetadataInfo;
  framework: ProjectFrameworkInfo;
  packageManager: ProjectPackageManagerInfo;
  files: ArchitecturalFile[];
  tree: ProjectNode;
  relationships: [];
  generatedAt: string;
}

export interface AnalyzeProjectOptions {
  includeTests?: boolean;
}
