import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { createComposableGenerationPlan } from '../generation/composable.js';
import { hashStable, StructifyManifest } from '../manifest/index.js';
import { NormalizedProjectConfig, ToolingOptions } from '../types/index.js';
import { ProjectGraph } from './project-graph.js';

export type BuiltInModuleName =
  'docker' | 'github-actions' | 'eslint' | 'prettier' | 'tailwind' | 'prisma' | 'mongoose';

export interface OperationHistoryEntry {
  operationId: string;
  type: 'module-add' | 'repair' | 'upgrade';
  timestamp: string;
  structifyVersion: string;
  modulesAdded: string[];
  filesChanged: string[];
  dependenciesChanged: string[];
  result: 'planned' | 'applied' | 'failed';
  rollbackAvailable: boolean;
}

export interface Phase9Manifest extends StructifyManifest {
  modules?: Record<string, { version: string; addedAt: string }>;
  moduleVersions?: Record<string, string>;
  operationHistory?: OperationHistoryEntry[];
  updatedAt?: string;
  projectGraphPath?: string;
  projectGraphSummary?: ProjectGraph['summary'];
}

export interface ProjectState {
  projectPath: string;
  exists: boolean;
  config?: NormalizedProjectConfig;
  manifest?: Phase9Manifest;
  projectGraph?: ProjectGraph;
  packageJson?: {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  packageManager: 'npm' | 'unknown';
  generatorVersions: Record<string, string>;
  templateVersion?: string;
  pluginVersions: Record<string, string>;
  moduleVersions: Record<string, string>;
  stackHash?: string;
  templateHash?: string;
  expectedFiles: string[];
  files: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  missingFiles: string[];
  modifiedFiles: string[];
  unknownFiles: string[];
  diagnostics: {
    code: string;
    message: string;
    path?: string;
    severity: 'info' | 'warning' | 'error';
  }[];
  eventLogEntries: number;
}

export interface DriftReport {
  hasDrift: boolean;
  warnings: { code: string; message: string; path?: string }[];
  errors: { code: string; message: string; path?: string }[];
  missingGeneratedFiles: string[];
  modifiedGeneratedFiles: string[];
  deletedMetadataFiles: string[];
  changedPackageScripts: string[];
  missingDependencies: string[];
  extraDependencies: string[];
  changedPackageManager: boolean;
  changedGeneratorVersions: string[];
  changedTemplateVersion: boolean;
  staleStackHash: boolean;
  staleTemplateHash: boolean;
  missingProjectGraphNodes: string[];
  orphanedGraphNodes: string[];
  unsupportedManualEdits: string[];
}

export interface PatchOperation {
  id: string;
  type: 'create-file' | 'update-file' | 'merge-json' | 'append-file';
  targetPath: string;
  description: string;
  content?: string;
  jsonMerge?: Record<string, unknown>;
  appendContent?: string;
  conflictPolicy: 'error' | 'overwrite' | 'merge';
}

export interface MigrationGraphNode {
  id: string;
  type: 'module' | 'repair' | 'upgrade' | 'metadata' | 'dependency';
  dependsOn: string[];
  preconditions: string[];
  affectedFiles: string[];
  rollbackActions: string[];
  risk: 'low' | 'medium' | 'high';
  verificationSteps: string[];
}

export interface MigrationGraph {
  version: '1.0.0';
  operation: string;
  nodes: MigrationGraphNode[];
}

export interface PatchPlan {
  id: string;
  description: string;
  operations: PatchOperation[];
  migrationGraph: MigrationGraph;
  conflicts: { code: string; message: string; path?: string }[];
  dependencyChanges: {
    section: 'dependencies' | 'devDependencies';
    name: string;
    from?: string;
    to: string;
  }[];
  filesChanged: string[];
  dryRun: boolean;
}

export interface PatchExecutionResult {
  success: boolean;
  plan: PatchPlan;
  appliedOperations: string[];
  rollbackResults: { operationId: string; success: boolean; message: string }[];
  errors: { code: string; message: string; path?: string }[];
}

export interface ModulePlanResult {
  code: 'MODULE_PLAN_READY' | 'MODULE_ALREADY_PRESENT' | 'MODULE_INCOMPATIBLE' | 'PATCH_CONFLICT';
  message: string;
  moduleName: BuiltInModuleName;
  state: ProjectState;
  plan?: PatchPlan;
  suggestions: string[];
}

export interface UpgradePlanResult {
  code: 'UPGRADE_PLAN_READY' | 'UPGRADE_REQUIRES_REVIEW';
  message: string;
  state: ProjectState;
  plan: PatchPlan;
  changedGenerators: string[];
  changedTemplates: string[];
  changedPlugins: string[];
  reviewRequired: boolean;
}

export interface RepairPlanResult {
  code: 'REPAIR_PLAN_READY' | 'NO_REPAIR_NEEDED';
  message: string;
  state: ProjectState;
  drift: DriftReport;
  plan: PatchPlan;
  suggestions: string[];
}

const moduleVersions: Record<BuiltInModuleName, string> = {
  docker: '1.0.0',
  'github-actions': '1.0.0',
  eslint: '1.0.0',
  prettier: '1.0.0',
  tailwind: '1.0.0',
  prisma: '1.0.0',
  mongoose: '1.0.0',
};

export function readProjectState(projectPath: string): ProjectState {
  const root = path.resolve(projectPath);
  const diagnostics: ProjectState['diagnostics'] = [];
  const config = readJson<NormalizedProjectConfig>(root, 'structify.config.json', diagnostics);
  const manifest = readJson<Phase9Manifest>(root, 'structify.manifest.json', diagnostics);
  const projectGraph = readJson<ProjectGraph>(root, 'structify.project-graph.json', diagnostics);
  const packageJson = readJson<ProjectState['packageJson']>(root, 'package.json', diagnostics);
  const expectedPlan = config ? createComposableGenerationPlan(config) : undefined;
  const expectedFiles = expectedPlan?.files.map((file) => file.path).sort() ?? [];
  const files = fs.existsSync(root) ? listProjectFiles(root) : [];
  const expectedContent = new Map(
    expectedPlan?.files.map((file) => [normalizePath(file.path), file.content]) ?? [],
  );
  const missingFiles = expectedFiles.filter((file) => !fs.existsSync(path.join(root, file)));
  const modifiedFiles = expectedFiles.filter((file) => {
    if (isManagedMutableMetadata(file)) return false;
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) return false;
    const expected = expectedContent.get(normalizePath(file));
    return expected !== undefined && sha(fs.readFileSync(absolute, 'utf8')) !== sha(expected);
  });
  const unknownFiles = files.filter(
    (file) => !expectedFiles.includes(file) && !file.startsWith('.structify/'),
  );
  const eventLog = path.join(root, '.structify', 'events.ndjson');

  return {
    projectPath: root,
    exists: fs.existsSync(root),
    config,
    manifest,
    projectGraph,
    packageJson,
    packageManager:
      config?.stack.packageManager === 'npm' || manifest?.packageManager === 'npm'
        ? 'npm'
        : 'unknown',
    generatorVersions: manifest?.generatorVersions ?? {},
    templateVersion: manifest?.templateVersion,
    pluginVersions: manifest?.pluginVersions ?? {},
    moduleVersions:
      manifest?.moduleVersions ??
      Object.fromEntries(
        Object.entries(manifest?.modules ?? {}).map(([name, value]) => [name, value.version]),
      ),
    stackHash: manifest?.stackHash,
    templateHash: manifest?.templateHash,
    expectedFiles,
    files,
    scripts: packageJson?.scripts ?? {},
    dependencies: packageJson?.dependencies ?? {},
    devDependencies: packageJson?.devDependencies ?? {},
    missingFiles,
    modifiedFiles,
    unknownFiles,
    diagnostics,
    eventLogEntries: fs.existsSync(eventLog)
      ? fs.readFileSync(eventLog, 'utf8').split('\n').filter(Boolean).length
      : 0,
  };
}

function isManagedMutableMetadata(filePath: string): boolean {
  return filePath === 'structify.manifest.json' || filePath === 'package.json';
}

function manifestTemplatePaths(files: string[]): string[] {
  return files
    .filter((file) => file !== 'structify.manifest.json' && file !== 'structify.project-graph.json')
    .sort();
}

export function detectProjectDrift(state: ProjectState): DriftReport {
  const warnings: DriftReport['warnings'] = [];
  const errors: DriftReport['errors'] = [];
  const deletedMetadataFiles = [
    'structify.config.json',
    'structify.manifest.json',
    'structify.project-graph.json',
  ].filter((file) => !fs.existsSync(path.join(state.projectPath, file)));
  for (const file of deletedMetadataFiles) {
    errors.push({ code: 'METADATA_FILE_MISSING', message: `Missing ${file}`, path: file });
  }
  const expected = state.config ? createComposableGenerationPlan(state.config) : undefined;
  const expectedPackage = expected
    ? (JSON.parse(expected.files.find((file) => file.path === 'package.json')?.content ?? '{}') as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      })
    : undefined;
  const changedPackageScripts = Object.entries(expectedPackage?.scripts ?? {})
    .filter(([name, command]) => state.scripts[name] !== command)
    .map(([name]) => name);
  const missingDependencies = [
    ...missingDeps(expectedPackage?.dependencies ?? {}, state.dependencies, 'dependencies'),
    ...missingDeps(
      expectedPackage?.devDependencies ?? {},
      state.devDependencies,
      'devDependencies',
    ),
  ];
  const expectedAllDeps = new Set([
    ...Object.keys(expectedPackage?.dependencies ?? {}),
    ...Object.keys(expectedPackage?.devDependencies ?? {}),
  ]);
  const extraDependencies = [
    ...Object.keys(state.dependencies),
    ...Object.keys(state.devDependencies),
  ].filter((name) => !expectedAllDeps.has(name));
  const staleStackHash = Boolean(
    state.config && state.manifest && state.manifest.stackHash !== hashStable(state.config.stack),
  );
  const staleTemplateHash = Boolean(
    expected &&
    state.manifest &&
    state.manifest.templateHash !==
      hashStable(manifestTemplatePaths(expected.files.map((file) => file.path))),
  );
  const graphPaths = new Set(
    (state.projectGraph?.nodes ?? []).map((node) => normalizePath(node.path ?? '')).filter(Boolean),
  );
  const missingProjectGraphNodes = state.expectedFiles.filter(
    (file) => !graphPaths.has(normalizePath(file)) && file !== 'structify.project-graph.json',
  );
  const orphanedGraphNodes = [...graphPaths].filter(
    (file) => !fs.existsSync(path.join(state.projectPath, file)),
  );

  for (const file of state.missingFiles)
    errors.push({
      code: 'GENERATED_FILE_MISSING',
      message: `Missing generated file ${file}`,
      path: file,
    });
  for (const file of state.modifiedFiles)
    warnings.push({
      code: 'GENERATED_FILE_MODIFIED',
      message: `Generated file differs from template ${file}`,
      path: file,
    });
  for (const script of changedPackageScripts)
    errors.push({
      code: 'PACKAGE_SCRIPT_DRIFT',
      message: `Package script drift: ${script}`,
      path: 'package.json',
    });
  for (const dep of missingDependencies)
    errors.push({ code: 'DEPENDENCY_MISSING', message: `Missing ${dep}`, path: 'package.json' });
  if (state.packageManager !== 'npm')
    errors.push({ code: 'PACKAGE_MANAGER_DRIFT', message: 'Project metadata is not npm-first.' });
  if (staleStackHash)
    errors.push({
      code: 'STACK_HASH_STALE',
      message: 'Manifest stack hash is stale.',
      path: 'structify.manifest.json',
    });
  if (staleTemplateHash)
    warnings.push({
      code: 'TEMPLATE_HASH_STALE',
      message: 'Manifest template hash is stale.',
      path: 'structify.manifest.json',
    });

  return {
    hasDrift: errors.length > 0 || warnings.length > 0,
    warnings,
    errors,
    missingGeneratedFiles: state.missingFiles,
    modifiedGeneratedFiles: state.modifiedFiles,
    deletedMetadataFiles,
    changedPackageScripts,
    missingDependencies,
    extraDependencies,
    changedPackageManager: state.packageManager !== 'npm',
    changedGeneratorVersions: [],
    changedTemplateVersion:
      state.templateVersion !== undefined && state.templateVersion !== '1.0.0',
    staleStackHash,
    staleTemplateHash,
    missingProjectGraphNodes,
    orphanedGraphNodes,
    unsupportedManualEdits: state.modifiedFiles,
  };
}

export function createModulePlan(
  projectPath: string,
  moduleName: string,
  options: { force?: boolean; dryRun?: boolean; database?: 'postgres' | 'mongodb' } = {},
): ModulePlanResult {
  const normalizedName = normalizeModuleName(moduleName);
  const state = readProjectState(projectPath);
  if (!normalizedName) {
    return {
      code: 'MODULE_INCOMPATIBLE',
      message: `Unknown built-in module "${moduleName}".`,
      moduleName: 'docker',
      state,
      suggestions: ['Use docker, github-actions, eslint, prettier, tailwind, prisma, or mongoose.'],
    };
  }
  if (!state.config) {
    return {
      code: 'MODULE_INCOMPATIBLE',
      message: 'Project is missing structify.config.json.',
      moduleName: normalizedName,
      state,
      suggestions: ['Run structify repair --dry-run to inspect metadata repair options.'],
    };
  }
  const nextConfig = configWithModule(state.config, normalizedName, options.database);
  const compatibility = checkModuleCompatibility(state.config, normalizedName, options.database);
  if (!compatibility.valid) {
    return {
      code: 'MODULE_INCOMPATIBLE',
      message: compatibility.message,
      moduleName: normalizedName,
      state,
      suggestions: compatibility.suggestions,
    };
  }
  if (moduleAlreadyPresent(state, normalizedName)) {
    return {
      code: 'MODULE_ALREADY_PRESENT',
      message: `Module ${normalizedName} is already present.`,
      moduleName: normalizedName,
      state,
      suggestions: [],
      plan: emptyPlan(
        `module-${normalizedName}`,
        `No changes needed for ${normalizedName}.`,
        options.dryRun === true,
      ),
    };
  }
  const plan = buildModulePatchPlan(state, nextConfig, normalizedName, options);
  return {
    code: plan.conflicts.length > 0 ? 'PATCH_CONFLICT' : 'MODULE_PLAN_READY',
    message:
      plan.conflicts.length > 0
        ? `Module ${normalizedName} has patch conflicts.`
        : `Module ${normalizedName} can be added safely.`,
    moduleName: normalizedName,
    state,
    plan,
    suggestions:
      plan.conflicts.length > 0
        ? ['Review conflicts or rerun with --force when overwrites are intentional.']
        : [],
  };
}

export function executePatchPlan(projectPath: string, plan: PatchPlan): PatchExecutionResult {
  const appliedOperations: string[] = [];
  const backups: { target: string; existed: boolean; content?: string }[] = [];
  const errors: PatchExecutionResult['errors'] = [];
  const rollbackResults: PatchExecutionResult['rollbackResults'] = [];
  try {
    if (plan.conflicts.length > 0) {
      return { success: false, plan, appliedOperations, rollbackResults, errors: plan.conflicts };
    }
    for (const operation of plan.operations) {
      const target = path.join(projectPath, operation.targetPath);
      backups.push({
        target,
        existed: fs.existsSync(target),
        content: fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : undefined,
      });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (operation.type === 'merge-json') {
        const current = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : {};
        fs.writeFileSync(
          target,
          JSON.stringify(deepMerge(current, operation.jsonMerge ?? {}), null, 2) + '\n',
          'utf8',
        );
      } else if (operation.type === 'append-file') {
        const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
        const append = operation.appendContent ?? '';
        fs.writeFileSync(
          target,
          current.includes(append.trim())
            ? current
            : `${current}${current.endsWith('\n') || current.length === 0 ? '' : '\n'}${append}`,
          'utf8',
        );
      } else {
        fs.writeFileSync(target, operation.content ?? '', 'utf8');
      }
      appliedOperations.push(operation.id);
    }
    return { success: true, plan, appliedOperations, rollbackResults, errors };
  } catch (error) {
    errors.push({
      code: 'PATCH_APPLY_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
    for (const backup of backups.reverse()) {
      try {
        if (backup.existed) fs.writeFileSync(backup.target, backup.content ?? '', 'utf8');
        else if (fs.existsSync(backup.target)) fs.rmSync(backup.target, { force: true });
        rollbackResults.push({
          operationId: path.basename(backup.target),
          success: true,
          message: 'Rolled back.',
        });
      } catch (rollbackError) {
        rollbackResults.push({
          operationId: path.basename(backup.target),
          success: false,
          message: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        });
      }
    }
    return { success: false, plan, appliedOperations, rollbackResults, errors };
  }
}

export function createUpgradePlan(projectPath: string): UpgradePlanResult {
  const state = readProjectState(projectPath);
  const operations: PatchOperation[] = [];
  if (state.manifest) {
    operations.push({
      id: 'upgrade-manifest-metadata',
      type: 'merge-json',
      targetPath: 'structify.manifest.json',
      description: 'Refresh safe Structify manifest metadata.',
      jsonMerge: { structifyVersion: '1.0.0', updatedAt: new Date().toISOString() },
      conflictPolicy: 'merge',
    });
  }
  const reviewRequired = state.modifiedFiles.length > 0;
  const plan = {
    id: 'upgrade-preview',
    description: 'Preview safe metadata/package upgrade operations.',
    operations: reviewRequired ? [] : operations,
    migrationGraph: migrationGraph('upgrade', operations, reviewRequired ? 'medium' : 'low'),
    conflicts: reviewRequired
      ? state.modifiedFiles.map((file) => ({
          code: 'UPGRADE_REQUIRES_REVIEW',
          message: `Modified generated file blocks automatic source upgrade: ${file}`,
          path: file,
        }))
      : [],
    dependencyChanges: [],
    filesChanged: operations.map((operation) => operation.targetPath),
    dryRun: true,
  };
  return {
    code: reviewRequired ? 'UPGRADE_REQUIRES_REVIEW' : 'UPGRADE_PLAN_READY',
    message: reviewRequired
      ? 'Upgrade preview found user-modified generated files.'
      : 'Safe metadata upgrade is available.',
    state,
    plan,
    changedGenerators: [],
    changedTemplates: [],
    changedPlugins: [],
    reviewRequired,
  };
}

export function createRepairPlan(
  projectPath: string,
  options: { force?: boolean; dryRun?: boolean } = {},
): RepairPlanResult {
  const state = readProjectState(projectPath);
  const drift = detectProjectDrift(state);
  if (!state.config) {
    return {
      code: 'NO_REPAIR_NEEDED',
      message: 'Cannot build repair plan without structify.config.json.',
      state,
      drift,
      plan: emptyPlan('repair-unavailable', 'No repair plan available.', options.dryRun === true),
      suggestions: ['Restore structify.config.json from source control or regenerate the project.'],
    };
  }
  const expected = createComposableGenerationPlan(state.config);
  const operations: PatchOperation[] = [];
  for (const file of expected.files) {
    if (state.missingFiles.includes(file.path) && isSafeRepairFile(file.path)) {
      operations.push({
        id: `repair-create-${file.path}`,
        type: 'create-file',
        targetPath: file.path,
        description: `Restore missing generated metadata/config file ${file.path}`,
        content: file.content,
        conflictPolicy: 'error',
      });
    }
  }
  const packageFile = expected.files.find((file) => file.path === 'package.json');
  if (packageFile) {
    const expectedPackage = JSON.parse(packageFile.content) as Record<string, unknown>;
    operations.push({
      id: 'repair-package-json',
      type: 'merge-json',
      targetPath: 'package.json',
      description: 'Restore missing npm scripts and dependencies.',
      jsonMerge: {
        scripts: expectedPackage.scripts,
        dependencies: expectedPackage.dependencies,
        devDependencies: expectedPackage.devDependencies,
      },
      conflictPolicy: 'merge',
    });
  }
  const plan: PatchPlan = {
    id: 'repair-plan',
    description: 'Repair safe generated metadata, scripts, and dependencies.',
    operations,
    migrationGraph: migrationGraph('repair', operations, 'low'),
    conflicts: [],
    dependencyChanges: [],
    filesChanged: operations.map((operation) => operation.targetPath),
    dryRun: options.dryRun === true,
  };
  return {
    code: operations.length === 0 ? 'NO_REPAIR_NEEDED' : 'REPAIR_PLAN_READY',
    message:
      operations.length === 0
        ? 'No safe repairs are needed.'
        : 'Safe repair operations are available.',
    state,
    drift,
    plan,
    suggestions: drift.warnings.concat(drift.errors).map((issue) => issue.message),
  };
}

function buildModulePatchPlan(
  state: ProjectState,
  nextConfig: NormalizedProjectConfig,
  moduleName: BuiltInModuleName,
  options: { force?: boolean; dryRun?: boolean },
): PatchPlan {
  const nextPlan = createComposableGenerationPlan(nextConfig);
  const currentFiles = new Set(state.files);
  const moduleFiles = filesForModule(
    moduleName,
    nextPlan.files.map((file) => file.path),
  );
  const operations: PatchOperation[] = [];
  const conflicts: PatchPlan['conflicts'] = [];
  for (const filePath of moduleFiles) {
    const file = nextPlan.files.find((candidate) => candidate.path === filePath);
    if (!file) continue;
    const exists = currentFiles.has(file.path);
    const currentContent = exists
      ? fs.readFileSync(path.join(state.projectPath, file.path), 'utf8')
      : '';
    if (exists && currentContent !== file.content && !options.force) {
      if (isAppendSafeModuleFile(file.path)) {
        operations.push({
          id: `append-${file.path}`,
          type: 'append-file',
          targetPath: file.path,
          description: `Safely append module content to ${file.path}`,
          appendContent: appendDelta(currentContent, file.content),
          conflictPolicy: 'merge',
        });
        continue;
      }
      conflicts.push({
        code: 'PATCH_CONFLICT',
        message: `File already exists with different content: ${file.path}`,
        path: file.path,
      });
      continue;
    }
    operations.push({
      id: `${exists ? 'update' : 'create'}-${file.path}`,
      type: exists ? 'update-file' : 'create-file',
      targetPath: file.path,
      description: `${exists ? 'Update' : 'Create'} ${file.path}`,
      content: file.content,
      conflictPolicy: options.force ? 'overwrite' : 'error',
    });
  }
  operations.push(...metadataOperations(state, nextConfig, moduleName));
  const dependencyChanges = dependencyChangesFor(state, nextPlan);
  return {
    id: `add-${moduleName}`,
    description: `Add Structify module ${moduleName}.`,
    operations,
    migrationGraph: migrationGraph(
      `add-${moduleName}`,
      operations,
      conflicts.length > 0 ? 'medium' : 'low',
    ),
    conflicts,
    dependencyChanges,
    filesChanged: operations.map((operation) => operation.targetPath),
    dryRun: options.dryRun === true,
  };
}

function isAppendSafeModuleFile(filePath: string): boolean {
  return filePath === '.env.example' || filePath.endsWith('.css');
}

function appendDelta(currentContent: string, nextContent: string): string {
  const currentLines = new Set(currentContent.split(/\r?\n/).map((line) => line.trim()));
  const missing = nextContent
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && !currentLines.has(line.trim()));
  return missing.length > 0 ? `${missing.join('\n')}\n` : '';
}

function metadataOperations(
  state: ProjectState,
  nextConfig: NormalizedProjectConfig,
  moduleName: BuiltInModuleName,
): PatchOperation[] {
  const nextPlan = createComposableGenerationPlan(nextConfig);
  const metadata = Object.fromEntries(
    [
      'structify.config.json',
      'structify.manifest.json',
      'structify.project-graph.json',
      'package.json',
    ]
      .map((filePath) => [filePath, nextPlan.files.find((file) => file.path === filePath)?.content])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  const now = new Date().toISOString();
  const operations = Object.entries(metadata).map(([targetPath, content]) => ({
    id: `metadata-${targetPath}`,
    type: 'update-file' as const,
    targetPath,
    description: `Update ${targetPath} for module ${moduleName}.`,
    content:
      targetPath === 'structify.manifest.json'
        ? enrichManifest(content, moduleName, state, now)
        : content,
    conflictPolicy: 'overwrite' as const,
  }));
  return operations;
}

function enrichManifest(
  content: string,
  moduleName: BuiltInModuleName,
  state: ProjectState,
  now: string,
): string {
  const manifest = JSON.parse(content) as Phase9Manifest;
  manifest.updatedAt = now;
  manifest.modules = {
    ...(state.manifest?.modules ?? {}),
    [moduleName]: { version: moduleVersions[moduleName], addedAt: now },
  };
  manifest.moduleVersions = Object.fromEntries(
    Object.entries(manifest.modules).map(([name, value]) => [name, value.version]),
  );
  manifest.operationHistory = [
    ...(state.manifest?.operationHistory ?? []),
    {
      operationId: `op-${hashStable(`${moduleName}:${now}`).slice(0, 10)}`,
      type: 'module-add',
      timestamp: now,
      structifyVersion: '1.0.0',
      modulesAdded: [moduleName],
      filesChanged: [],
      dependenciesChanged: [],
      result: 'applied',
      rollbackAvailable: true,
    },
  ];
  return JSON.stringify(manifest, null, 2) + '\n';
}

function configWithModule(
  config: NormalizedProjectConfig,
  moduleName: BuiltInModuleName,
  databaseOverride?: 'postgres' | 'mongodb',
): NormalizedProjectConfig {
  const tools: ToolingOptions = { ...config.tools };
  const stack = { ...config.stack };
  if (moduleName === 'docker') tools.docker = true;
  if (moduleName === 'github-actions') tools.githubActions = true;
  if (moduleName === 'eslint') tools.eslint = true;
  if (moduleName === 'prettier') tools.prettier = true;
  if (moduleName === 'tailwind') stack.styling = 'tailwind';
  if (moduleName === 'prisma') {
    stack.database = databaseOverride ?? 'postgres';
    stack.orm = 'prisma';
  }
  if (moduleName === 'mongoose') {
    stack.database = databaseOverride ?? 'mongodb';
    stack.orm = 'mongoose';
  }
  return { ...config, stack, tools };
}

function checkModuleCompatibility(
  config: NormalizedProjectConfig,
  moduleName: BuiltInModuleName,
  databaseOverride?: 'postgres' | 'mongodb',
): { valid: boolean; message: string; suggestions: string[] } {
  const isFrontend = config.mode === 'frontend-only' || config.mode === 'fullstack';
  if (moduleName === 'tailwind' && (!isFrontend || config.stack.frontend === 'none')) {
    return {
      valid: false,
      message: 'Tailwind requires a frontend or fullstack project.',
      suggestions: ['Use a frontend stack before adding Tailwind.'],
    };
  }
  if (
    moduleName === 'prisma' &&
    config.stack.database !== 'postgres' &&
    databaseOverride !== 'postgres' &&
    config.stack.database !== 'none'
  ) {
    return {
      valid: false,
      message: 'Prisma requires PostgreSQL for this built-in module.',
      suggestions: ['Use --database postgres when safe.'],
    };
  }
  if (
    moduleName === 'mongoose' &&
    config.stack.database !== 'mongodb' &&
    databaseOverride !== 'mongodb' &&
    config.stack.database !== 'none'
  ) {
    return {
      valid: false,
      message: 'Mongoose requires MongoDB for this built-in module.',
      suggestions: ['Use --database mongodb when safe.'],
    };
  }
  return { valid: true, message: 'Compatible.', suggestions: [] };
}

function moduleAlreadyPresent(state: ProjectState, moduleName: BuiltInModuleName): boolean {
  if (state.moduleVersions[moduleName]) return true;
  if (moduleName === 'docker')
    return state.files.includes('Dockerfile') && state.files.includes('docker-compose.yml');
  if (moduleName === 'github-actions') return state.files.includes('.github/workflows/ci.yml');
  if (moduleName === 'eslint') return state.files.includes('.eslintrc.json');
  if (moduleName === 'prettier') return state.files.includes('.prettierrc');
  if (moduleName === 'tailwind') return state.files.includes('tailwind.config.js');
  if (moduleName === 'prisma') return state.files.includes('prisma/schema.prisma');
  if (moduleName === 'mongoose') return state.files.includes('src/db/mongoose.ts');
  return false;
}

function filesForModule(moduleName: BuiltInModuleName, files: string[]): string[] {
  const mapping: Record<BuiltInModuleName, string[]> = {
    docker: ['Dockerfile', 'docker-compose.yml'],
    'github-actions': ['.github/workflows/ci.yml'],
    eslint: ['.eslintrc.json'],
    prettier: ['.prettierrc'],
    tailwind: ['tailwind.config.js', 'postcss.config.js', 'app/globals.css', 'src/index.css'],
    prisma: ['prisma/schema.prisma', 'src/db/prisma.ts', '.env.example'],
    mongoose: ['src/db/mongoose.ts', 'src/models/example.model.ts', '.env.example'],
  };
  return mapping[moduleName].filter((file) => files.includes(file));
}

function dependencyChangesFor(
  state: ProjectState,
  plan: ReturnType<typeof createComposableGenerationPlan>,
): PatchPlan['dependencyChanges'] {
  const packageFile = JSON.parse(
    plan.files.find((file) => file.path === 'package.json')?.content ?? '{}',
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return [
    ...Object.entries(packageFile.dependencies ?? {})
      .filter(([name, version]) => state.dependencies[name] !== version)
      .map(([name, version]) => ({
        section: 'dependencies' as const,
        name,
        from: state.dependencies[name],
        to: version,
      })),
    ...Object.entries(packageFile.devDependencies ?? {})
      .filter(([name, version]) => state.devDependencies[name] !== version)
      .map(([name, version]) => ({
        section: 'devDependencies' as const,
        name,
        from: state.devDependencies[name],
        to: version,
      })),
  ];
}

function migrationGraph(
  operation: string,
  operations: PatchOperation[],
  risk: MigrationGraphNode['risk'],
): MigrationGraph {
  return {
    version: '1.0.0',
    operation,
    nodes: operations.map((patch, index) => ({
      id: `migration-${patch.id}`,
      type:
        patch.targetPath === 'package.json'
          ? 'dependency'
          : patch.targetPath.startsWith('structify.')
            ? 'metadata'
            : operation.startsWith('add-')
              ? 'module'
              : operation.startsWith('repair')
                ? 'repair'
                : 'upgrade',
      dependsOn: index === 0 ? [] : [`migration-${operations[index - 1].id}`],
      preconditions: ['Project metadata is readable', 'Patch conflict check passed'],
      affectedFiles: [patch.targetPath],
      rollbackActions: [
        `Restore previous ${patch.targetPath} content or remove newly created file`,
      ],
      risk,
      verificationSteps: ['Read project state', 'Run drift detection', 'Run verify-project'],
    })),
  };
}

function emptyPlan(id: string, description: string, dryRun: boolean): PatchPlan {
  return {
    id,
    description,
    operations: [],
    migrationGraph: { version: '1.0.0', operation: id, nodes: [] },
    conflicts: [],
    dependencyChanges: [],
    filesChanged: [],
    dryRun,
  };
}

function normalizeModuleName(moduleName: string): BuiltInModuleName | undefined {
  const normalized = moduleName.trim().toLowerCase();
  if (normalized === 'github-actions' || normalized === 'github' || normalized === 'ci')
    return 'github-actions';
  if (['docker', 'eslint', 'prettier', 'tailwind', 'prisma', 'mongoose'].includes(normalized)) {
    return normalized as BuiltInModuleName;
  }
  return undefined;
}

function listProjectFiles(projectPath: string): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist', '.next'].includes(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(normalizePath(path.relative(projectPath, absolute)));
    }
  };
  visit(projectPath);
  return files.sort();
}

function readJson<T>(
  projectPath: string,
  relativePath: string,
  diagnostics: ProjectState['diagnostics'],
): T | undefined {
  const absolute = path.join(projectPath, relativePath);
  if (!fs.existsSync(absolute)) {
    diagnostics.push({
      code: 'FILE_MISSING',
      message: `Missing ${relativePath}`,
      path: relativePath,
      severity: 'warning',
    });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8')) as T;
  } catch (error) {
    diagnostics.push({
      code: 'INVALID_JSON',
      message: String(error),
      path: relativePath,
      severity: 'error',
    });
    return undefined;
  }
}

function missingDeps(
  expected: Record<string, string>,
  actual: Record<string, string>,
  section: string,
): string[] {
  return Object.entries(expected)
    .filter(([name, version]) => actual[name] !== version)
    .map(([name]) => `${section}.${name}`);
}

function isSafeRepairFile(filePath: string): boolean {
  return (
    filePath.startsWith('structify.') ||
    filePath === 'package.json' ||
    filePath.startsWith('.') ||
    filePath.endsWith('config.js') ||
    filePath.endsWith('config.ts')
  );
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const output = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const current = output[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      output[key] = deepMerge(current, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
