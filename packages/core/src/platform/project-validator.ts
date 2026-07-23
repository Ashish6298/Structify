import * as fs from 'fs';
import * as path from 'path';
import { hashStable, StructifyManifest } from '../manifest/index.js';
import { NormalizedProjectConfig } from '../types/index.js';
import { createComposableGenerationPlan } from '../generation/composable.js';
import { ProjectGraph } from './project-graph.js';

export interface ProjectValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface DependencyCheck {
  packageName: string;
  expected: string;
  actual?: string;
  dependencyType: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
  valid: boolean;
}

export interface ProjectValidationResult {
  valid: boolean;
  checkedFiles: string[];
  checkedScripts: string[];
  checkedGraphNodes: string[];
  dependencyChecks: DependencyCheck[];
  warnings: ProjectValidationIssue[];
  errors: ProjectValidationIssue[];
  issues: ProjectValidationIssue[];
  config?: NormalizedProjectConfig;
  manifest?: StructifyManifest;
  projectGraph?: ProjectGraph;
}

export function validateGeneratedProject(projectPath: string): ProjectValidationResult {
  const checkedFiles: string[] = [];
  const checkedScripts: string[] = [];
  const checkedGraphNodes: string[] = [];
  const dependencyChecks: DependencyCheck[] = [];
  const warnings: ProjectValidationIssue[] = [];
  const errors: ProjectValidationIssue[] = [];

  const config = readJson<
    NormalizedProjectConfig & {
      structify?: {
        version?: string;
        generatedBy?: string;
        manifestPath?: string;
        projectGraphPath?: string;
        packageManager?: string;
      };
    }
  >(projectPath, 'structify.config.json', checkedFiles, errors);
  const manifest = readJson<
    StructifyManifest & {
      projectGraphPath?: string;
      projectGraphSummary?: ProjectGraph['summary'];
      dependencyDiagnostics?: unknown[];
      analytics?: Record<string, unknown>;
    }
  >(projectPath, 'structify.manifest.json', checkedFiles, errors);
  const projectGraph = readJson<ProjectGraph>(
    projectPath,
    'structify.project-graph.json',
    checkedFiles,
    errors,
  );
  const packageJson = readJson<{
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  }>(projectPath, 'package.json', checkedFiles, errors);

  requireFile(projectPath, 'README.md', checkedFiles, errors);

  if (config) {
    validateConfigShape(config, errors);
    if (config.structify?.version !== '1.0.0') {
      errors.push({
        code: 'CONFIG_STRUCTIFY_METADATA_MISSING',
        message: 'structify.config.json is missing Structify metadata version 1.0.0.',
        path: 'structify.config.json',
      });
    }
    if (
      config.structify?.generatedBy !== 'structify' ||
      config.structify?.manifestPath !== 'structify.manifest.json' ||
      config.structify?.projectGraphPath !== 'structify.project-graph.json'
    ) {
      errors.push({
        code: 'CONFIG_STRUCTIFY_METADATA_INVALID',
        message: 'structify.config.json does not reference the expected generated metadata files.',
        path: 'structify.config.json',
      });
    }
    if (config.stack.packageManager !== 'npm') {
      warnings.push({
        code: 'NON_NPM_PACKAGE_MANAGER',
        message: `Project uses ${config.stack.packageManager}; npm is the default Structify workflow.`,
        path: 'structify.config.json',
      });
    }
  }

  if (config && manifest) {
    if (manifest.structifyVersion !== '1.0.0') {
      errors.push({
        code: 'STRUCTIFY_VERSION_MISMATCH',
        message: `Unsupported Structify version ${manifest.structifyVersion}`,
        path: 'structify.manifest.json',
      });
    }
    if (manifest.stackHash !== hashStable(config.stack)) {
      errors.push({
        code: 'MANIFEST_STACK_HASH_MISMATCH',
        message: 'Manifest stack hash does not match structify.config.json.',
        path: 'structify.manifest.json',
      });
    }
    if (manifest.packageManager !== config.stack.packageManager) {
      errors.push({
        code: 'MANIFEST_PACKAGE_MANAGER_MISMATCH',
        message: 'Manifest package manager does not match config.',
        path: 'structify.manifest.json',
      });
    }
    if (manifest.projectGraphPath !== 'structify.project-graph.json') {
      errors.push({
        code: 'MANIFEST_PROJECT_GRAPH_PATH_MISSING',
        message: 'Manifest must reference structify.project-graph.json.',
        path: 'structify.manifest.json',
      });
    }
    if (!manifest.generatorVersions || Object.keys(manifest.generatorVersions).length === 0) {
      errors.push({
        code: 'MANIFEST_GENERATOR_METADATA_MISSING',
        message: 'Manifest must include generator version metadata.',
        path: 'structify.manifest.json',
      });
    }
  }

  if (config && projectGraph) {
    if (projectGraph.version !== '1.0.0') {
      errors.push({
        code: 'PROJECT_GRAPH_VERSION_MISMATCH',
        message: `Unsupported Project Graph version ${projectGraph.version}.`,
        path: 'structify.project-graph.json',
      });
    }
    if (projectGraph.projectName !== config.projectName) {
      errors.push({
        code: 'PROJECT_GRAPH_PROJECT_NAME_MISMATCH',
        message: 'Project Graph projectName does not match structify.config.json.',
        path: 'structify.project-graph.json',
      });
    }
    if (!Array.isArray(projectGraph.nodes) || projectGraph.nodes.length === 0) {
      errors.push({
        code: 'EMPTY_PROJECT_GRAPH',
        message: 'Project Graph must contain nodes.',
        path: 'structify.project-graph.json',
      });
    }
    if (projectGraph.stackHash !== hashStable(config.stack)) {
      errors.push({
        code: 'PROJECT_GRAPH_STACK_HASH_MISMATCH',
        message: 'Project Graph stack hash does not match config.',
        path: 'structify.project-graph.json',
      });
    }
    checkedGraphNodes.push(...projectGraph.nodes.map((node) => node.id));
    const nodeIds = new Set(projectGraph.nodes.map((node) => node.id));
    for (const edge of projectGraph.edges ?? []) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        errors.push({
          code: 'PROJECT_GRAPH_INVALID_EDGE',
          message: `Project Graph edge ${edge.from} -> ${edge.to} references a missing node.`,
          path: 'structify.project-graph.json',
        });
      }
    }
    const actualSummary = projectGraph.nodes.reduce<Record<string, number>>((summary, node) => {
      summary[node.type] = (summary[node.type] ?? 0) + 1;
      return summary;
    }, {});
    for (const [type, count] of Object.entries(projectGraph.summary ?? {})) {
      if ((actualSummary[type] ?? 0) !== count) {
        errors.push({
          code: 'PROJECT_GRAPH_SUMMARY_MISMATCH',
          message: `Project Graph summary for ${type} expected ${actualSummary[type] ?? 0} but found ${count}.`,
          path: 'structify.project-graph.json',
        });
      }
    }
    if (manifest?.projectGraphSummary) {
      const manifestSummary = JSON.stringify(manifest.projectGraphSummary);
      const graphSummary = JSON.stringify(projectGraph.summary);
      if (manifestSummary !== graphSummary) {
        errors.push({
          code: 'MANIFEST_PROJECT_GRAPH_SUMMARY_MISMATCH',
          message: 'Manifest Project Graph summary does not match structify.project-graph.json.',
          path: 'structify.manifest.json',
        });
      }
    }
    for (const node of projectGraph.nodes) {
      if (node.path) {
        requireFile(projectPath, node.path, checkedFiles, errors, 'MISSING_GRAPH_FILE');
      }
    }
  }

  if (config && packageJson) {
    const expected = createComposableGenerationPlan(config);
    const expectedPackage = JSON.parse(
      expected.files.find((file) => file.path === 'package.json')?.content ?? '{}',
    ) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    for (const [scriptName, command] of Object.entries(expectedPackage.scripts ?? {})) {
      checkedScripts.push(scriptName);
      if (packageJson.scripts?.[scriptName] !== command) {
        errors.push({
          code: 'SCRIPT_MISMATCH',
          message: `Script ${scriptName} expected "${command}" but found "${packageJson.scripts?.[scriptName] ?? 'missing'}".`,
          path: 'package.json',
        });
      }
    }
    checkDependencySection(
      'dependencies',
      expectedPackage.dependencies ?? {},
      packageJson.dependencies ?? {},
      dependencyChecks,
      errors,
    );
    checkDependencySection(
      'devDependencies',
      expectedPackage.devDependencies ?? {},
      packageJson.devDependencies ?? {},
      dependencyChecks,
      errors,
    );
    checkRequiredStackFiles(config, projectPath, checkedFiles, errors);
  }

  const issues = [...warnings, ...errors];
  return {
    valid: errors.length === 0,
    checkedFiles: [...new Set(checkedFiles)].sort(),
    checkedScripts: [...new Set(checkedScripts)].sort(),
    checkedGraphNodes: [...new Set(checkedGraphNodes)].sort(),
    dependencyChecks,
    warnings,
    errors,
    issues,
    config,
    manifest,
    projectGraph,
  };
}

function readJson<T>(
  projectPath: string,
  relativePath: string,
  checkedFiles: string[],
  errors: ProjectValidationIssue[],
): T | undefined {
  requireFile(projectPath, relativePath, checkedFiles, errors);
  const absolutePath = path.join(projectPath, relativePath);
  if (!fs.existsSync(absolutePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T;
  } catch (error) {
    errors.push({ code: 'INVALID_JSON', message: String(error), path: relativePath });
    return undefined;
  }
}

function requireFile(
  projectPath: string,
  relativePath: string,
  checkedFiles: string[],
  errors: ProjectValidationIssue[],
  code = 'MISSING_REQUIRED_FILE',
): void {
  checkedFiles.push(relativePath);
  if (!fs.existsSync(path.join(projectPath, relativePath))) {
    errors.push({ code, message: `Missing ${relativePath}`, path: relativePath });
  }
}

function validateConfigShape(
  config: NormalizedProjectConfig,
  errors: ProjectValidationIssue[],
): void {
  if (!config.projectName || !config.stack || !config.tools) {
    errors.push({
      code: 'INVALID_STRUCTIFY_CONFIG',
      message: 'structify.config.json is missing normalized project fields.',
      path: 'structify.config.json',
    });
  }
}

function checkDependencySection(
  dependencyType: DependencyCheck['dependencyType'],
  expected: Record<string, string>,
  actual: Record<string, string>,
  checks: DependencyCheck[],
  errors: ProjectValidationIssue[],
): void {
  for (const [packageName, version] of Object.entries(expected)) {
    const valid = actual[packageName] === version;
    checks.push({
      packageName,
      expected: version,
      actual: actual[packageName],
      dependencyType,
      valid,
    });
    if (!valid) {
      errors.push({
        code: 'DEPENDENCY_MISMATCH',
        message: `${dependencyType}.${packageName} expected ${version} but found ${actual[packageName] ?? 'missing'}.`,
        path: 'package.json',
      });
    }
  }
}

function checkRequiredStackFiles(
  config: NormalizedProjectConfig,
  projectPath: string,
  checkedFiles: string[],
  errors: ProjectValidationIssue[],
): void {
  const required: string[] = [];
  const isFullstack = config.mode === 'fullstack';
  const fePrefix = isFullstack ? 'apps/web/' : '';
  const bePrefix = isFullstack ? 'apps/api/' : '';

  if (config.stack.frontend === 'next') {
    required.push(
      `${fePrefix}app/page.tsx`,
      `${fePrefix}app/layout.tsx`,
      `${fePrefix}app/globals.css`,
      `${fePrefix}next.config.ts`,
    );
  }
  if (config.stack.frontend === 'vite-react') {
    required.push(
      `${fePrefix}src/main.tsx`,
      `${fePrefix}src/App.tsx`,
      `${fePrefix}src/index.css`,
      `${fePrefix}vite.config.ts`,
      `${fePrefix}index.html`,
    );
  }
  if (config.stack.backend === 'express') {
    required.push(
      `${bePrefix}src/index.ts`,
      `${bePrefix}src/app.ts`,
      `${bePrefix}src/routes/health.route.ts`,
    );
  }
  if (config.stack.backend === 'nest') {
    required.push(
      `${bePrefix}src/main.ts`,
      `${bePrefix}src/app.module.ts`,
      `${bePrefix}src/app.controller.ts`,
      `${bePrefix}src/app.service.ts`,
    );
  }
  if (config.stack.styling === 'tailwind') {
    required.push(`${fePrefix}tailwind.config.js`, `${fePrefix}postcss.config.js`);
  }
  if (config.stack.styling === 'mui') {
    required.push(`${fePrefix}src/theme.ts`);
  }
  if (config.stack.database === 'postgres' && config.stack.orm === 'prisma') {
    required.push(`${bePrefix}prisma/schema.prisma`, `${bePrefix}src/db/prisma.ts`, '.env.example');
  }
  if (config.stack.database === 'mongodb' && config.stack.orm === 'mongoose') {
    required.push(
      `${bePrefix}src/db/mongoose.ts`,
      `${bePrefix}src/models/example.model.ts`,
      '.env.example',
    );
  }
  if (config.tools.docker) {
    required.push('Dockerfile', 'docker-compose.yml');
  }
  if (config.tools.githubActions) {
    required.push('.github/workflows/ci.yml');
  }
  if (config.tools.eslint) {
    required.push('.eslintrc.json');
  }
  if (config.tools.prettier) {
    required.push('.prettierrc');
  }
  for (const file of required) {
    requireFile(projectPath, file, checkedFiles, errors);
  }
}
