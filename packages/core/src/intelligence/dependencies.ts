import fs from 'fs';
import path from 'path';
import { ProjectAnalysis } from './types.js';

export interface DependencyRecommendation {
  packageName: string;
  type: 'outdated' | 'deprecated' | 'unused' | 'duplicate' | 'conflict' | 'missing' | 'peer-issue';
  severity: 'SAFE' | 'MINOR REVIEW' | 'BREAKING' | 'MIGRATION REQUIRED';
  currentVersion: string;
  targetVersion?: string;
  message: string;
  rationale: string;
}

export interface DependencyReport {
  installedCount: number;
  outdatedCount: number;
  deprecatedCount: number;
  unusedCount: number;
  breakingCount: number;
  migrationCount: number;
  recommendations: DependencyRecommendation[];
}

interface PackageMetadata {
  latestVersion: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  peerDependencies?: Record<string, string>;
}

// Deterministic offline registry of common packages
const PACKAGE_CATALOG: Record<string, PackageMetadata> = {
  request: {
    latestVersion: '2.88.2',
    deprecated: true,
    deprecationMessage: 'Request has been deprecated since 2020. Use axios or node-fetch instead.',
  },
  'express-graphql': {
    latestVersion: '0.12.0',
    deprecated: true,
    deprecationMessage: 'express-graphql is deprecated. Use graphql-http instead.',
  },
  'node-sass': {
    latestVersion: '9.0.0',
    deprecated: true,
    deprecationMessage: 'node-sass is deprecated. Use sass instead.',
  },
  'babel-eslint': {
    latestVersion: '10.1.0',
    deprecated: true,
    deprecationMessage: 'babel-eslint is deprecated. Use @babel/eslint-parser instead.',
  },
  react: {
    latestVersion: '19.0.0',
  },
  'react-dom': {
    latestVersion: '19.0.0',
    peerDependencies: {
      react: '^19.0.0',
    },
  },
  next: {
    latestVersion: '15.0.0',
  },
  lodash: {
    latestVersion: '4.17.21',
  },
  'eslint-plugin-react': {
    latestVersion: '7.34.0',
    peerDependencies: {
      eslint: '^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0',
    },
  },
};

const TOOLING_PACKAGES = new Set([
  'typescript',
  'eslint',
  'prettier',
  'vitest',
  'tsup',
  'turbo',
  'nx',
  'lerna',
  'jest',
  'cypress',
  'playwright',
  'rimraf',
  'cross-env',
  'nodemon',
  'concurrently',
]);

const NODE_BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

export function analyzeDependencies(
  projectPath: string,
  analysis: ProjectAnalysis,
): DependencyReport {
  const recommendations: DependencyRecommendation[] = [];

  // 1. Gather all declared dependencies in the workspace
  const rootPackageJsonPath = path.join(projectPath, 'package.json');
  const workspaceJsonPaths = analysis.metadata.workspacePackageJsons.map((p) =>
    path.join(projectPath, p),
  );
  const allJsonPaths = fs.existsSync(rootPackageJsonPath)
    ? [rootPackageJsonPath, ...workspaceJsonPaths]
    : workspaceJsonPaths;

  const declaredVersions: Record<string, Set<string>> = {};
  const packageDependencies: Record<string, Record<string, string>> = {};

  for (const jsonPath of allJsonPaths) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const pkg = JSON.parse(content);
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
        ...pkg.optionalDependencies,
      };

      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string') {
          if (!declaredVersions[name]) {
            declaredVersions[name] = new Set();
          }
          declaredVersions[name].add(version);

          if (!packageDependencies[name]) {
            packageDependencies[name] = {};
          }
          packageDependencies[name][jsonPath] = version;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // 2. Read lock files for exact resolved versions
  const lockfileVersions: Record<string, string> = {};
  const lockFiles = analysis.metadata.lockFiles.map((p) => path.join(projectPath, p));
  for (const lockPath of lockFiles) {
    if (fs.existsSync(lockPath)) {
      try {
        const lockContent = fs.readFileSync(lockPath, 'utf8');
        const baseName = path.basename(lockPath);
        for (const name of Object.keys(declaredVersions)) {
          let resolved: string | null = null;
          if (baseName === 'package-lock.json') {
            resolved = getPackageLockVersion(lockContent, name);
          } else if (baseName === 'yarn.lock') {
            resolved = getYarnLockVersion(lockContent, name);
          } else if (baseName === 'pnpm-lock.yaml') {
            resolved = getPnpmLockVersion(lockContent, name);
          }
          if (resolved) {
            lockfileVersions[name] = resolved;
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // 3. Scan project files for imports/requires
  const importedPackages = new Set<string>();
  scanImportsRecursively(projectPath, projectPath, importedPackages);

  // 4. Perform rules analysis
  const installedCount = Object.keys(declaredVersions).length;

  for (const [name, versions] of Object.entries(declaredVersions)) {
    const declaredArr = Array.from(versions);
    const firstDeclared = declaredArr[0] ?? '*';
    const resolvedVersion = lockfileVersions[name] ?? cleanVersion(firstDeclared);

    // Rule A: Deprecated packages
    const catalogMeta = PACKAGE_CATALOG[name];
    if (catalogMeta?.deprecated) {
      recommendations.push({
        packageName: name,
        type: 'deprecated',
        severity: 'MIGRATION REQUIRED',
        currentVersion: resolvedVersion,
        message: `Package "${name}" is deprecated.`,
        rationale:
          catalogMeta.deprecationMessage ??
          `Migration is required as "${name}" is no longer maintained.`,
      });
    }

    // Rule B: Outdated packages
    if (catalogMeta && !catalogMeta.deprecated) {
      if (isOlder(resolvedVersion, catalogMeta.latestVersion)) {
        const isBreaking = isMajorUpgrade(resolvedVersion, catalogMeta.latestVersion);
        recommendations.push({
          packageName: name,
          type: 'outdated',
          severity: isBreaking ? 'BREAKING' : 'SAFE',
          currentVersion: resolvedVersion,
          targetVersion: catalogMeta.latestVersion,
          message: `Package "${name}" is outdated (current: ${resolvedVersion}, latest: ${catalogMeta.latestVersion}).`,
          rationale: isBreaking
            ? `Upgrading "${name}" to major version ${catalogMeta.latestVersion} contains breaking API changes and needs testing.`
            : `Upgrading "${name}" to version ${catalogMeta.latestVersion} is safe and fits semver patch/minor compatibility rules.`,
        });
      }
    }

    // Rule C: Unused packages
    if (!importedPackages.has(name) && !TOOLING_PACKAGES.has(name) && !name.startsWith('@types/')) {
      recommendations.push({
        packageName: name,
        type: 'unused',
        severity: 'MINOR REVIEW',
        currentVersion: resolvedVersion,
        message: `Package "${name}" appears to be unused.`,
        rationale: `No imports or require statements for "${name}" were detected in your source code. You can safely remove it to reduce project size.`,
      });
    }

    // Rule D: Conflicting/Duplicate declared versions
    if (declaredArr.length > 1) {
      recommendations.push({
        packageName: name,
        type: 'conflict',
        severity: 'MINOR REVIEW',
        currentVersion: declaredArr.join(', '),
        message: `Multiple conflicting versions declared for "${name}": ${declaredArr.join(', ')}.`,
        rationale: `Monorepo workspace packages specify different semver ranges for "${name}". Consolidating them ensures consistent runtime behavior.`,
      });
    }

    // Rule E: Peer Dependency Issues
    if (catalogMeta?.peerDependencies) {
      for (const [peerName, peerRange] of Object.entries(catalogMeta.peerDependencies)) {
        const peerVersions = declaredVersions[peerName];
        if (!peerVersions) {
          recommendations.push({
            packageName: name,
            type: 'peer-issue',
            severity: 'MINOR REVIEW',
            currentVersion: resolvedVersion,
            message: `Unsatisfied peer dependency: "${name}" requires "${peerName}@${peerRange}" but it is not declared.`,
            rationale: `Install "${peerName}" to satisfy peer requirements of "${name}" and prevent package resolution warnings.`,
          });
        } else {
          const peerResolved =
            lockfileVersions[peerName] ?? cleanVersion(Array.from(peerVersions)[0] ?? '*');
          if (isOlder(peerResolved, cleanVersion(peerRange))) {
            recommendations.push({
              packageName: name,
              type: 'peer-issue',
              severity: 'BREAKING',
              currentVersion: resolvedVersion,
              message: `Peer dependency mismatch: "${name}" requires "${peerName}@${peerRange}" but version "${peerResolved}" is installed.`,
              rationale: `Upgrading "${peerName}" to satisfy the "${peerRange}" range is required to prevent runtime incompatibility.`,
            });
          }
        }
      }
    }
  }

  // Rule F: Missing dependencies
  for (const name of importedPackages) {
    if (
      !declaredVersions[name] &&
      !NODE_BUILTINS.has(name) &&
      !name.startsWith('.') &&
      !name.startsWith('..')
    ) {
      recommendations.push({
        packageName: name,
        type: 'missing',
        severity: 'BREAKING',
        currentVersion: 'none',
        message: `Missing dependency: Package "${name}" is imported in source code but not declared in package.json.`,
        rationale: `Add "${name}" to dependencies to prevent build/runtime errors when executing the project.`,
      });
    }
  }

  const outdatedCount = recommendations.filter((r) => r.type === 'outdated').length;
  const deprecatedCount = recommendations.filter((r) => r.type === 'deprecated').length;
  const unusedCount = recommendations.filter((r) => r.type === 'unused').length;
  const breakingCount = recommendations.filter((r) => r.severity === 'BREAKING').length;
  const migrationCount = recommendations.filter((r) => r.severity === 'MIGRATION REQUIRED').length;

  return {
    installedCount,
    outdatedCount,
    deprecatedCount,
    unusedCount,
    breakingCount,
    migrationCount,
    recommendations,
  };
}

function cleanVersion(v: string): string {
  return v
    .replace(/[\^~>=<]/g, '')
    .split('-')[0]
    .trim();
}

function isOlder(v1: string, v2: string): boolean {
  const parts1 = cleanVersion(v1)
    .split('.')
    .map((x) => parseInt(x, 10) || 0);
  const parts2 = cleanVersion(v2)
    .split('.')
    .map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 < p2) return true;
    if (p1 > p2) return false;
  }
  return false;
}

function isMajorUpgrade(v1: string, v2: string): boolean {
  const major1 = parseInt(cleanVersion(v1).split('.')[0], 10) || 0;
  const major2 = parseInt(cleanVersion(v2).split('.')[0], 10) || 0;
  return major1 < major2;
}

function escapeRegex(str: string): string {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function getPackageLockVersion(lockContent: string, packageName: string): string | null {
  try {
    const lockObj = JSON.parse(lockContent);
    if (lockObj.packages) {
      const pkgKey = `node_modules/${packageName}`;
      if (lockObj.packages[pkgKey]?.version) {
        return lockObj.packages[pkgKey].version;
      }
    }
    if (lockObj.dependencies?.[packageName]?.version) {
      return lockObj.dependencies[packageName].version;
    }
  } catch {
    // Ignore JSON errors
  }
  return null;
}

function getYarnLockVersion(lockContent: string, packageName: string): string | null {
  const regex = new RegExp(
    `["']?${escapeRegex(packageName)}@(?:[\\s\\S]*?)\\s+version\\s+["']([^"']+)["']`,
    'i',
  );
  const match = regex.exec(lockContent);
  return match ? match[1] : null;
}

function getPnpmLockVersion(lockContent: string, packageName: string): string | null {
  const regex = new RegExp(`/${escapeRegex(packageName)}@([^:\\s]+)`, 'i');
  const match = regex.exec(lockContent);
  return match ? match[1] : null;
}

function scanImportsRecursively(dir: string, baseDir: string, importedPackages: Set<string>): void {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip ignored directories
      if (
        entry.isDirectory() &&
        (entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === 'coverage' ||
          entry.name === 'tmp' ||
          entry.name === 'temp' ||
          entry.name === 'logs')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        scanImportsRecursively(fullPath, baseDir, importedPackages);
      } else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        extractImports(content, importedPackages);
      }
    }
  } catch {
    // Ignore read errors
  }
}

function extractImports(content: string, importedPackages: Set<string>): void {
  const importRegex = /(?:import|export)\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const requireRegex = /(?:require|import)\(['"]([^'"]+)['"]\)/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rawPkg = match[1];
    if (rawPkg) {
      importedPackages.add(cleanPackageName(rawPkg));
    }
  }

  while ((match = requireRegex.exec(content)) !== null) {
    const rawPkg = match[1];
    if (rawPkg) {
      importedPackages.add(cleanPackageName(rawPkg));
    }
  }
}

function cleanPackageName(rawPkg: string): string {
  const segments = rawPkg.split('/');
  if (rawPkg.startsWith('@')) {
    return segments.slice(0, 2).join('/');
  }
  return segments[0] ?? rawPkg;
}
