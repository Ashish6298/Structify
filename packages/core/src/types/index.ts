export type FrontendOption = 'next' | 'vite-react' | 'none';
export type BackendOption = 'express' | 'nest' | 'none';
export type StylingOption = 'tailwind' | 'mui' | 'none';
export type DatabaseOption = 'postgres' | 'mongodb' | 'none';
export type OrmOption = 'prisma' | 'mongoose' | 'none';
export type PackageManagerOption = 'npm' | 'pnpm';
export type ProjectMode = 'frontend-only' | 'backend-only' | 'fullstack';
export type LanguageOption = 'typescript';

export interface ToolingOptions {
  docker: boolean;
  eslint: boolean;
  prettier: boolean;
  githubActions: boolean;
  git: boolean;
  editorconfig: boolean;
  husky: boolean;
  lintStaged: boolean;
  commitlint: boolean;
}

export interface ProjectConfig {
  projectName: string;
  version: string;
  mode?: ProjectMode;
  language?: LanguageOption;
  stack: {
    frontend?: FrontendOption;
    backend?: BackendOption;
    styling?: StylingOption;
    database?: DatabaseOption;
    orm?: OrmOption;
    packageManager?: PackageManagerOption;
  };
  tools?: Partial<ToolingOptions>;
}

export interface NormalizedProjectConfig {
  projectName: string;
  version: string;
  mode: ProjectMode;
  language: LanguageOption;
  stack: {
    frontend: FrontendOption;
    backend: BackendOption;
    styling: StylingOption;
    database: DatabaseOption;
    orm: OrmOption;
    packageManager: PackageManagerOption;
  };
  tools: ToolingOptions;
}

export interface ValidationError {
  code: string;
  field?: string;
  message: string;
}

export interface ValidationWarning {
  code: string;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  normalizedConfig?: NormalizedProjectConfig;
}

export interface CompatibilityRule {
  id: string;
  description: string;
  severity: 'error' | 'warning';
  validate: (config: NormalizedProjectConfig) => { valid: boolean; message?: string };
}

export interface PresetDefinition {
  name: string;
  description: string;
  config: Omit<ProjectConfig, 'projectName'>;
}

export interface GeneratorMetadata {
  id: string;
  name: string;
  version: string;
  supportedModes: ProjectMode[];
}

export interface TemplateMetadata {
  id: string;
  name: string;
  targetPath: string;
  variables: string[];
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  devDependencies: string[];
  incompatibleStacks?: Partial<Record<keyof NormalizedProjectConfig['stack'], string[]>>;
}

export interface CommandStep {
  commandLine: string;
  cwd?: string;
}

export interface FileStep {
  path: string;
  content: string;
  overwrite: boolean;
}

export interface TemplateStep {
  templateId: string;
  targetPath: string;
  variables: Record<string, string>;
}

export interface ValidationStep {
  assertion: string;
}

export interface PlanStep {
  id: string;
  type:
    | 'CreateFolder'
    | 'WriteFile'
    | 'AppendFile'
    | 'RunCommand'
    | 'DeleteFile'
    | 'Template'
    | 'Validation'
    | 'ScaffoldTemplate';
  targetPath: string;
  description: string;
  fileStep?: FileStep;
  commandStep?: CommandStep;
  templateStep?: TemplateStep;
  validationStep?: ValidationStep;
}

export interface RollbackAction {
  id: string;
  type: 'DeleteFolder' | 'DeleteFile' | 'RestoreFile' | 'RunCommand';
  targetPath: string;
  description: string;
  originalContent?: string;
  commandLine?: string;
}

export interface ExecutionPlan {
  projectName: string;
  timestamp: string;
  steps: PlanStep[];
  rollbackSteps: RollbackAction[];
}

export interface DoctorCheck {
  id: string;
  name: string;
  description: string;
  check: (projectPath: string) => Promise<{ passed: boolean; issue?: string }>;
}

export interface RepairAction {
  id: string;
  checkId: string;
  description: string;
  apply: (projectPath: string) => Promise<{ success: boolean; log: string }>;
}

export interface ProjectDetectionResult {
  detected: boolean;
  projectName?: string;
  stack?: Partial<NormalizedProjectConfig['stack']>;
  tools?: Partial<ToolingOptions>;
}

// MCP contracts
export interface McpToolRequest {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface McpToolResponse {
  success: boolean;
  output: string;
  error?: string;
}

// Shared result wrappers
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}
