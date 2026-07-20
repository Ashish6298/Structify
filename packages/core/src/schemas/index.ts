import { z } from 'zod';

export const FrontendOptionSchema = z.enum(['next', 'vite-react', 'none']);
export const BackendOptionSchema = z.enum([
  'express',
  'nest',
  'fastify',
  'hono',
  'node-auth',
  'none',
]);
export const StylingOptionSchema = z.enum(['tailwind', 'mui', 'none']);
export const DatabaseOptionSchema = z.enum(['postgres', 'mongodb', 'none']);
export const OrmOptionSchema = z.enum(['prisma', 'mongoose', 'none']);
export const PackageManagerOptionSchema = z.enum(['npm']);
export const ProjectModeSchema = z.enum(['frontend-only', 'backend-only', 'fullstack']);
export const LanguageOptionSchema = z.enum(['typescript']);

export const ToolingOptionsSchema = z.object({
  docker: z.boolean(),
  eslint: z.boolean(),
  prettier: z.boolean(),
  githubActions: z.boolean(),
  git: z.boolean(),
  editorconfig: z.boolean(),
  husky: z.boolean(),
  lintStaged: z.boolean(),
  commitlint: z.boolean(),
});

export const PresetManifestMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  source: z.string(),
  schemaVersion: z.string(),
  creationTimestamp: z.string().optional(),
  configHash: z.string().optional(),
  presetHash: z.string().optional(),
});

export const ProjectConfigSchema = z.object({
  projectName: z.string().min(1),
  version: z.string(),
  mode: ProjectModeSchema.optional(),
  language: LanguageOptionSchema.optional(),
  stack: z.object({
    frontend: FrontendOptionSchema.optional(),
    backend: BackendOptionSchema.optional(),
    styling: StylingOptionSchema.optional(),
    database: DatabaseOptionSchema.optional(),
    orm: OrmOptionSchema.optional(),
    packageManager: PackageManagerOptionSchema.optional(),
  }),
  tools: ToolingOptionsSchema.partial().optional(),
  preset: PresetManifestMetadataSchema.optional(),
});

export const NormalizedProjectConfigSchema = z.object({
  projectName: z.string().min(1),
  version: z.string(),
  mode: ProjectModeSchema,
  language: LanguageOptionSchema,
  stack: z.object({
    frontend: FrontendOptionSchema,
    backend: BackendOptionSchema,
    styling: StylingOptionSchema,
    database: DatabaseOptionSchema,
    orm: OrmOptionSchema,
    packageManager: PackageManagerOptionSchema,
  }),
  tools: ToolingOptionsSchema,
  preset: PresetManifestMetadataSchema.optional(),
});

export const ValidationErrorSchema = z.object({
  code: z.string(),
  field: z.string().optional(),
  message: z.string(),
});

export const ValidationWarningSchema = z.object({
  code: z.string(),
  field: z.string().optional(),
  message: z.string(),
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema),
  normalizedConfig: NormalizedProjectConfigSchema.optional(),
});

export const PresetDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  config: ProjectConfigSchema.omit({ projectName: true }),
});

export const GeneratorMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  supportedModes: z.array(ProjectModeSchema),
});

export const TemplateMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetPath: z.string(),
  variables: z.array(z.string()),
});

export const ModuleDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()),
  devDependencies: z.array(z.string()),
  incompatibleStacks: z.record(z.string(), z.array(z.string())).optional(),
});

export const CommandStepSchema = z.object({
  commandLine: z.string(),
  cwd: z.string().optional(),
});

export const FileStepSchema = z.object({
  path: z.string(),
  content: z.string(),
  overwrite: z.boolean(),
});

export const TemplateStepSchema = z.object({
  templateId: z.string(),
  targetPath: z.string(),
  variables: z.record(z.string(), z.string()),
});

export const ValidationStepSchema = z.object({
  assertion: z.string(),
});

export const PlanStepSchema = z.object({
  id: z.string(),
  type: z.enum([
    'CreateFolder',
    'WriteFile',
    'AppendFile',
    'RunCommand',
    'DeleteFile',
    'Template',
    'Validation',
  ]),
  targetPath: z.string(),
  description: z.string(),
  fileStep: FileStepSchema.optional(),
  commandStep: CommandStepSchema.optional(),
  templateStep: TemplateStepSchema.optional(),
  validationStep: ValidationStepSchema.optional(),
});

export const RollbackActionSchema = z.object({
  id: z.string(),
  type: z.enum(['DeleteFolder', 'DeleteFile', 'RestoreFile', 'RunCommand']),
  targetPath: z.string(),
  description: z.string(),
  originalContent: z.string().optional(),
  commandLine: z.string().optional(),
});

export const ExecutionPlanSchema = z.object({
  projectName: z.string(),
  timestamp: z.string(),
  steps: z.array(PlanStepSchema),
  rollbackSteps: z.array(RollbackActionSchema),
});

export const ProjectDetectionResultSchema = z.object({
  detected: z.boolean(),
  projectName: z.string().optional(),
  stack: z
    .object({
      frontend: FrontendOptionSchema.optional(),
      backend: BackendOptionSchema.optional(),
      styling: StylingOptionSchema.optional(),
      database: DatabaseOptionSchema.optional(),
      orm: OrmOptionSchema.optional(),
      packageManager: PackageManagerOptionSchema.optional(),
    })
    .optional(),
  tools: ToolingOptionsSchema.partial().optional(),
});

export const McpToolRequestSchema = z.object({
  tool: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export const McpToolResponseSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  error: z.string().optional(),
});
