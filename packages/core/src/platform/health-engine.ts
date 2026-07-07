import * as fs from 'fs';
import * as path from 'path';
import { readProjectState, detectProjectDrift, ProjectState, DriftReport } from './phase9.js';
import { detectStack, DetectedStack, StackDetectionResult } from './stack-detector.js';
import { NormalizedProjectConfig } from '../types/index.js';
import { hashStable } from '../manifest/index.js';

// ─── Diagnostic Categories ────────────────────────────────────────────────────

export type HealthStatus = 'PASS' | 'INFO' | 'WARNING' | 'ERROR' | 'FIXABLE' | 'NOT_FIXABLE';

export interface HealthDiagnostic {
  category: HealthCategory;
  status: HealthStatus;
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export type HealthCategory =
  | 'environment'
  | 'project_metadata'
  | 'stack_detection'
  | 'manifest'
  | 'config'
  | 'project_graph'
  | 'dependency_graph'
  | 'package_manager'
  | 'dependencies'
  | 'generated_files'
  | 'module_health';

// ─── Health Report ────────────────────────────────────────────────────────────

export interface ProjectHealthReport {
  projectPath: string;
  isStructifyProject: boolean;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  diagnostics: HealthDiagnostic[];
  state: ProjectState;
  drift: DriftReport;
  detectionResult: StackDetectionResult;
  detectedStack: DetectedStack;
  healthSummary: HealthSummary;
  repairability: RepairabilityReport;
}

export interface HealthSummary {
  total: number;
  pass: number;
  info: number;
  warnings: number;
  errors: number;
  fixable: number;
  notFixable: number;
}

export interface RepairabilityReport {
  canAutoRepair: boolean;
  fixableIssues: HealthDiagnostic[];
  notFixableIssues: HealthDiagnostic[];
  requiresForce: HealthDiagnostic[];
  repairSuggestions: string[];
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

/**
 * Run the full project health check for a given path.
 * This is the single authoritative function used by doctor, inspect, repair,
 * verify-project, and add commands.
 */
export function runProjectHealthCheck(projectPath: string): ProjectHealthReport {
  const root = path.resolve(projectPath);
  const diagnostics: HealthDiagnostic[] = [];

  // ── Project existence ──────────────────────────────────────────────────────
  if (!fs.existsSync(root)) {
    const errDiag: HealthDiagnostic = {
      category: 'project_metadata',
      status: 'ERROR',
      code: 'PROJECT_NOT_FOUND',
      message: `Project path does not exist: ${root}`,
    };
    const emptyState = emptyProjectState(root);
    const emptyDrift = emptyDriftReport();
    const detResult = detectStack(root);
    return buildReport(root, false, [errDiag], emptyState, emptyDrift, detResult);
  }

  // ── Read project state and drift ──────────────────────────────────────────
  const state = readProjectState(root);
  const drift = detectProjectDrift(state);

  // ── Stack detection ────────────────────────────────────────────────────────
  const manifestStack = state.config?.stack;
  const detResult = detectStack(
    root,
    manifestStack
      ? {
          frontend: manifestStack.frontend,
          backend: manifestStack.backend,
          database: manifestStack.database,
          orm: manifestStack.orm,
          styling: manifestStack.styling,
          packageManager: manifestStack.packageManager,
          docker: state.config?.tools?.docker,
          githubActions: state.config?.tools?.githubActions,
          eslint: state.config?.tools?.eslint,
          prettier: state.config?.tools?.prettier,
        }
      : undefined,
  );

  const isStructifyProject = Boolean(state.config || state.manifest || state.projectGraph);

  // ── Stack detection diagnostic ─────────────────────────────────────────────
  if (detResult.success) {
    diagnostics.push({
      category: 'stack_detection',
      status: detResult.detectedStack.confidence === 'high' ? 'PASS' : 'INFO',
      code: 'STACK_DETECTED',
      message: `Stack detected (confidence: ${detResult.detectedStack.confidence}, source: ${detResult.detectedStack.detectionSource})`,
    });
  } else {
    diagnostics.push({
      category: 'stack_detection',
      status: 'WARNING',
      code: 'STACK_DETECTION_FAILED',
      message: detResult.error ?? 'Stack detection failed',
    });
  }

  // ── Metadata health ────────────────────────────────────────────────────────
  checkMetadataHealth(root, state, diagnostics);

  // ── Config health ──────────────────────────────────────────────────────────
  checkConfigHealth(state, diagnostics);

  // ── Manifest health ────────────────────────────────────────────────────────
  checkManifestHealth(root, state, diagnostics);

  // ── Project graph health ───────────────────────────────────────────────────
  checkProjectGraphHealth(root, state, drift, diagnostics);

  // ── Dependency graph health ────────────────────────────────────────────────
  checkDependencyGraphHealth(root, diagnostics);

  // ── Package manager health ─────────────────────────────────────────────────
  checkPackageManagerHealth(state, drift, diagnostics);

  // ── Dependencies health ────────────────────────────────────────────────────
  checkDependencyHealth(drift, diagnostics);

  // ── Generated files health ─────────────────────────────────────────────────
  checkGeneratedFilesHealth(state, drift, diagnostics);

  // ── Module health ──────────────────────────────────────────────────────────
  checkModuleHealth(state, diagnostics);

  // ── Package.json existence ─────────────────────────────────────────────────
  const hasPackageJson = fs.existsSync(path.join(root, 'package.json'));
  diagnostics.push({
    category: 'project_metadata',
    status: hasPackageJson ? 'PASS' : isStructifyProject ? 'ERROR' : 'INFO',
    code: hasPackageJson ? 'PACKAGE_JSON_PRESENT' : 'PACKAGE_JSON_MISSING',
    message: hasPackageJson
      ? 'package.json present'
      : 'package.json not found in project directory',
    suggestion: hasPackageJson
      ? undefined
      : 'Run structify repair --apply --yes to restore missing npm scripts',
  });

  return buildReport(root, isStructifyProject, diagnostics, state, drift, detResult);
}

// ─── Health Check Sub-Functions ───────────────────────────────────────────────

function checkMetadataHealth(
  root: string,
  state: ProjectState,
  diagnostics: HealthDiagnostic[],
): void {
  const metadataFiles = [
    { file: 'structify.config.json', label: 'Config', field: state.config },
    { file: 'structify.manifest.json', label: 'Manifest', field: state.manifest },
    { file: 'structify.project-graph.json', label: 'Project Graph', field: state.projectGraph },
  ];

  for (const { file, label, field } of metadataFiles) {
    const exists = fs.existsSync(path.join(root, file));
    if (!exists) {
      diagnostics.push({
        category: 'project_metadata',
        status: 'FIXABLE',
        code: 'METADATA_MISSING',
        message: `Missing Structify metadata file: ${file}`,
        path: file,
        suggestion: `Run structify repair --apply --yes to restore ${label}`,
      });
    } else if (!field) {
      diagnostics.push({
        category: 'project_metadata',
        status: 'ERROR',
        code: 'METADATA_INVALID_JSON',
        message: `${file} exists but could not be parsed as valid JSON`,
        path: file,
        suggestion: `Restore ${file} from source control or regenerate the project`,
      });
    } else {
      diagnostics.push({
        category: 'project_metadata',
        status: 'PASS',
        code: 'METADATA_VALID',
        message: `${file} is present and valid`,
        path: file,
      });
    }
  }
}

function checkConfigHealth(state: ProjectState, diagnostics: HealthDiagnostic[]): void {
  if (!state.config) return;
  const config = state.config as NormalizedProjectConfig;
  if (!config.projectName || !config.version || !config.stack) {
    diagnostics.push({
      category: 'config',
      status: 'ERROR',
      code: 'CONFIG_SHAPE_INVALID',
      message: 'structify.config.json is missing required fields (projectName, version, stack)',
      path: 'structify.config.json',
      suggestion: 'Regenerate from source control or run structify init again',
    });
  } else {
    diagnostics.push({
      category: 'config',
      status: 'PASS',
      code: 'CONFIG_VALID',
      message: `Config is valid (project: ${config.projectName}, mode: ${config.mode})`,
      path: 'structify.config.json',
    });
  }
}

function checkManifestHealth(
  root: string,
  state: ProjectState,
  diagnostics: HealthDiagnostic[],
): void {
  if (!state.manifest) return;
  const manifest = state.manifest;

  // Stack hash check
  if (drift_staleStackHash(state)) {
    diagnostics.push({
      category: 'manifest',
      status: 'FIXABLE',
      code: 'MANIFEST_STACK_HASH_STALE',
      message: 'Manifest stack hash is stale (config was modified outside Structify)',
      path: 'structify.manifest.json',
      suggestion: 'Run structify repair --apply --yes to refresh manifest metadata',
    });
  } else {
    diagnostics.push({
      category: 'manifest',
      status: 'PASS',
      code: 'MANIFEST_HASH_VALID',
      message: 'Manifest stack hash matches current config',
      path: 'structify.manifest.json',
    });
  }

  // Structify version check
  if (!manifest.structifyVersion) {
    diagnostics.push({
      category: 'manifest',
      status: 'WARNING',
      code: 'MANIFEST_VERSION_MISSING',
      message: 'Manifest does not contain structifyVersion field',
      path: 'structify.manifest.json',
      suggestion: 'Run structify upgrade to refresh manifest metadata',
    });
  }

  void root; // used for path construction above
}

function drift_staleStackHash(state: ProjectState): boolean {
  if (!state.config || !state.manifest) return false;
  return state.manifest.stackHash !== hashStable(state.config.stack);
}

function checkProjectGraphHealth(
  root: string,
  state: ProjectState,
  drift: DriftReport,
  diagnostics: HealthDiagnostic[],
): void {
  const graphPath = path.join(root, 'structify.project-graph.json');
  if (!fs.existsSync(graphPath)) {
    // Already handled in metadata check
    return;
  }

  if (!state.projectGraph) {
    diagnostics.push({
      category: 'project_graph',
      status: 'ERROR',
      code: 'PROJECT_GRAPH_INVALID',
      message: 'structify.project-graph.json exists but could not be parsed',
      path: 'structify.project-graph.json',
      suggestion: 'Restore from source control or run structify repair --apply --yes',
    });
    return;
  }

  if (drift.missingProjectGraphNodes.length > 0) {
    diagnostics.push({
      category: 'project_graph',
      status: 'WARNING',
      code: 'PROJECT_GRAPH_MISSING_NODES',
      message: `Project graph is missing ${drift.missingProjectGraphNodes.length} expected node(s)`,
      path: 'structify.project-graph.json',
      suggestion: 'Run structify repair --apply --yes to refresh project graph',
    });
  } else if (drift.orphanedGraphNodes.length > 0) {
    diagnostics.push({
      category: 'project_graph',
      status: 'WARNING',
      code: 'PROJECT_GRAPH_ORPHANED_NODES',
      message: `Project graph has ${drift.orphanedGraphNodes.length} orphaned node(s) pointing to missing files`,
      path: 'structify.project-graph.json',
      suggestion: 'Run structify repair --apply --yes',
    });
  } else {
    diagnostics.push({
      category: 'project_graph',
      status: 'PASS',
      code: 'PROJECT_GRAPH_VALID',
      message: `Project graph valid (${state.projectGraph.nodes.length} nodes)`,
      path: 'structify.project-graph.json',
    });
  }
}

function checkDependencyGraphHealth(root: string, diagnostics: HealthDiagnostic[]): void {
  const depGraphPath = path.join(root, 'structify.dependency-graph.json');
  if (!fs.existsSync(depGraphPath)) {
    // Optional file - just info
    diagnostics.push({
      category: 'dependency_graph',
      status: 'INFO',
      code: 'DEPENDENCY_GRAPH_ABSENT',
      message: 'structify.dependency-graph.json not present (optional)',
      path: 'structify.dependency-graph.json',
    });
    return;
  }
  try {
    const content = JSON.parse(fs.readFileSync(depGraphPath, 'utf8'));
    if (!content || typeof content !== 'object') {
      diagnostics.push({
        category: 'dependency_graph',
        status: 'ERROR',
        code: 'DEPENDENCY_GRAPH_INVALID',
        message: 'structify.dependency-graph.json is invalid JSON or wrong shape',
        path: 'structify.dependency-graph.json',
      });
    } else {
      diagnostics.push({
        category: 'dependency_graph',
        status: 'PASS',
        code: 'DEPENDENCY_GRAPH_VALID',
        message: 'structify.dependency-graph.json is present and valid',
        path: 'structify.dependency-graph.json',
      });
    }
  } catch {
    diagnostics.push({
      category: 'dependency_graph',
      status: 'ERROR',
      code: 'DEPENDENCY_GRAPH_INVALID',
      message: 'structify.dependency-graph.json could not be parsed',
      path: 'structify.dependency-graph.json',
    });
  }
}

function checkPackageManagerHealth(
  state: ProjectState,
  drift: DriftReport,
  diagnostics: HealthDiagnostic[],
): void {
  if (!state.config) return;
  if (drift.changedPackageManager) {
    diagnostics.push({
      category: 'package_manager',
      status: 'FIXABLE',
      code: 'PACKAGE_MANAGER_DRIFT',
      message: 'Project package manager does not match metadata (expected: npm)',
      suggestion: 'Ensure package-lock.json is present and npm is used',
    });
  } else if (state.packageManager === 'npm') {
    diagnostics.push({
      category: 'package_manager',
      status: 'PASS',
      code: 'PACKAGE_MANAGER_OK',
      message: 'Package manager is npm (correct)',
    });
  } else {
    diagnostics.push({
      category: 'package_manager',
      status: 'INFO',
      code: 'PACKAGE_MANAGER_UNKNOWN',
      message: 'Package manager could not be determined from metadata or filesystem',
    });
  }

  if (drift.changedPackageScripts.length > 0) {
    diagnostics.push({
      category: 'package_manager',
      status: 'FIXABLE',
      code: 'PACKAGE_SCRIPTS_DRIFT',
      message: `${drift.changedPackageScripts.length} npm script(s) have drifted from expected: ${drift.changedPackageScripts.join(', ')}`,
      path: 'package.json',
      suggestion: 'Run structify repair --apply --yes to restore missing scripts',
    });
  } else if (state.config) {
    diagnostics.push({
      category: 'package_manager',
      status: 'PASS',
      code: 'PACKAGE_SCRIPTS_OK',
      message: 'npm scripts match expected configuration',
      path: 'package.json',
    });
  }
}

function checkDependencyHealth(drift: DriftReport, diagnostics: HealthDiagnostic[]): void {
  if (drift.missingDependencies.length > 0) {
    diagnostics.push({
      category: 'dependencies',
      status: 'FIXABLE',
      code: 'DEPENDENCIES_MISSING',
      message: `${drift.missingDependencies.length} expected dependency/dependencies missing or version-mismatched`,
      suggestion:
        'Run structify repair --apply --yes to restore dependency metadata, then npm install',
    });
  } else if (drift.extraDependencies.length > 0) {
    diagnostics.push({
      category: 'dependencies',
      status: 'INFO',
      code: 'DEPENDENCIES_EXTRA',
      message: `${drift.extraDependencies.length} extra dependencies not in Structify template (this is normal if you added your own)`,
    });
  }

  if (drift.missingDependencies.length === 0) {
    diagnostics.push({
      category: 'dependencies',
      status: 'PASS',
      code: 'DEPENDENCIES_OK',
      message: 'All expected dependencies are present',
    });
  }
}

function checkGeneratedFilesHealth(
  state: ProjectState,
  drift: DriftReport,
  diagnostics: HealthDiagnostic[],
): void {
  if (!state.config) return; // Can't check without config

  if (drift.missingGeneratedFiles.length > 0) {
    for (const file of drift.missingGeneratedFiles) {
      const isSafe = isSafeToAutoRepair(file);
      diagnostics.push({
        category: 'generated_files',
        status: isSafe ? 'FIXABLE' : 'NOT_FIXABLE',
        code: 'GENERATED_FILE_MISSING',
        message: `Missing generated file: ${file}`,
        path: file,
        suggestion: isSafe
          ? 'Run structify repair --apply --yes to restore this file'
          : 'This source file must be restored manually or from source control',
      });
    }
  }

  if (drift.modifiedGeneratedFiles.length > 0) {
    for (const file of drift.modifiedGeneratedFiles) {
      diagnostics.push({
        category: 'generated_files',
        status: 'NOT_FIXABLE',
        code: 'GENERATED_FILE_MODIFIED',
        message: `Generated file has been modified by user: ${file}`,
        path: file,
        suggestion: 'Use --force to overwrite with original template content (creates backup)',
      });
    }
  }

  if (
    drift.missingGeneratedFiles.length === 0 &&
    drift.modifiedGeneratedFiles.length === 0 &&
    state.config
  ) {
    diagnostics.push({
      category: 'generated_files',
      status: 'PASS',
      code: 'GENERATED_FILES_OK',
      message: `All ${state.expectedFiles.length} expected files are present and unmodified`,
    });
  }
}

function checkModuleHealth(state: ProjectState, diagnostics: HealthDiagnostic[]): void {
  const installedModules = Object.keys(state.moduleVersions);
  if (installedModules.length > 0) {
    diagnostics.push({
      category: 'module_health',
      status: 'PASS',
      code: 'MODULES_PRESENT',
      message: `${installedModules.length} module(s) installed: ${installedModules.join(', ')}`,
    });
  } else {
    diagnostics.push({
      category: 'module_health',
      status: 'INFO',
      code: 'MODULES_NONE',
      message: 'No additional modules installed (use structify add <module> to add)',
    });
  }
}

// ─── Report Assembly ──────────────────────────────────────────────────────────

function buildReport(
  root: string,
  isStructifyProject: boolean,
  diagnostics: HealthDiagnostic[],
  state: ProjectState,
  drift: DriftReport,
  detResult: StackDetectionResult,
): ProjectHealthReport {
  const errors = diagnostics.filter((d) => d.status === 'ERROR').length;
  const warnings = diagnostics.filter((d) => d.status === 'WARNING').length;
  const fixable = diagnostics.filter((d) => d.status === 'FIXABLE');
  const notFixable = diagnostics.filter((d) => d.status === 'NOT_FIXABLE');
  const pass = diagnostics.filter((d) => d.status === 'PASS').length;
  const info = diagnostics.filter((d) => d.status === 'INFO').length;

  const overallStatus: ProjectHealthReport['overallStatus'] =
    errors > 0
      ? 'CRITICAL'
      : warnings > 0 || fixable.length > 0
        ? 'DEGRADED'
        : isStructifyProject
          ? 'HEALTHY'
          : 'UNKNOWN';

  const healthSummary: HealthSummary = {
    total: diagnostics.length,
    pass,
    info,
    warnings,
    errors,
    fixable: fixable.length,
    notFixable: notFixable.length,
  };

  const repairSuggestions = diagnostics
    .filter((d) => d.suggestion)
    .map((d) => d.suggestion as string)
    .filter((v, i, arr) => arr.indexOf(v) === i); // unique

  const requiresForce = notFixable.filter((d) => d.suggestion?.toLowerCase().includes('--force'));

  const repairability: RepairabilityReport = {
    canAutoRepair: fixable.length > 0,
    fixableIssues: fixable,
    notFixableIssues: notFixable,
    requiresForce,
    repairSuggestions,
  };

  return {
    projectPath: root,
    isStructifyProject,
    overallStatus,
    diagnostics,
    state,
    drift,
    detectionResult: detResult,
    detectedStack: detResult.detectedStack,
    healthSummary,
    repairability,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSafeToAutoRepair(filePath: string): boolean {
  return (
    filePath.startsWith('structify.') ||
    filePath === 'package.json' ||
    filePath.startsWith('.') ||
    filePath.endsWith('config.js') ||
    filePath.endsWith('config.ts')
  );
}

function emptyProjectState(root: string): ProjectState {
  return {
    projectPath: root,
    exists: false,
    packageManager: 'unknown',
    generatorVersions: {},
    pluginVersions: {},
    moduleVersions: {},
    expectedFiles: [],
    files: [],
    scripts: {},
    dependencies: {},
    devDependencies: {},
    missingFiles: [],
    modifiedFiles: [],
    unknownFiles: [],
    diagnostics: [],
    eventLogEntries: 0,
  };
}

function emptyDriftReport(): DriftReport {
  return {
    hasDrift: false,
    warnings: [],
    errors: [],
    missingGeneratedFiles: [],
    modifiedGeneratedFiles: [],
    deletedMetadataFiles: [],
    changedPackageScripts: [],
    missingDependencies: [],
    extraDependencies: [],
    changedPackageManager: false,
    changedGeneratorVersions: [],
    changedTemplateVersion: false,
    staleStackHash: false,
    staleTemplateHash: false,
    missingProjectGraphNodes: [],
    orphanedGraphNodes: [],
    unsupportedManualEdits: [],
  };
}

/**
 * Build a human-readable summary of a health report for console output.
 */
export function buildHealthSummary(report: ProjectHealthReport): string {
  const lines: string[] = [];
  lines.push(`Project: ${report.projectPath}`);
  lines.push(`Structify Project: ${report.isStructifyProject ? 'yes' : 'no'}`);
  lines.push(`Overall Status: ${report.overallStatus}`);
  lines.push(
    `Health: ${report.healthSummary.pass} PASS, ${report.healthSummary.warnings} WARN, ${report.healthSummary.errors} ERROR, ${report.healthSummary.fixable} FIXABLE, ${report.healthSummary.notFixable} NOT_FIXABLE`,
  );
  if (report.isStructifyProject) {
    lines.push(
      `Stack: ${report.detectedStack.frontend ?? 'none'} frontend / ${report.detectedStack.backend ?? 'none'} backend / ${report.detectedStack.database ?? 'none'} database`,
    );
  }
  return lines.join('\n');
}

/**
 * Classify repairability for a given drift report and project state.
 * Returns a RepairabilityReport without running a full health check.
 */
export function classifyRepairability(
  _drift: DriftReport,
  state: ProjectState,
): RepairabilityReport {
  const report = runProjectHealthCheck(state.projectPath);
  return report.repairability;
}
