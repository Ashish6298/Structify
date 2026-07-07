import * as fs from 'fs';
import * as path from 'path';

export type DetectedFrontend = 'next' | 'vite-react' | 'none' | 'unknown';
export type DetectedBackend = 'express' | 'nest' | 'none' | 'unknown';
export type DetectedDatabase = 'postgres' | 'mongodb' | 'none' | 'unknown';
export type DetectedOrm = 'prisma' | 'mongoose' | 'none' | 'unknown';
export type DetectedStyling = 'tailwind' | 'mui' | 'none' | 'unknown';
export type DetectedPackageManager = 'npm' | 'unknown';

export interface DetectedStack {
  frontend: DetectedFrontend;
  backend: DetectedBackend;
  database: DetectedDatabase;
  orm: DetectedOrm;
  styling: DetectedStyling;
  packageManager: DetectedPackageManager;
  docker: boolean;
  githubActions: boolean;
  eslint: boolean;
  prettier: boolean;
  git: boolean;
  editorconfig: boolean;
  detectionSource: 'metadata' | 'filesystem' | 'mixed' | 'none';
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
}

export interface StackDetectionResult {
  success: boolean;
  projectPath: string;
  detectedStack: DetectedStack;
  hasStructifyMetadata: boolean;
  rawIndicators: Record<string, boolean>;
  error?: string;
}

function fileExists(projectPath: string, relPath: string): boolean {
  return fs.existsSync(path.join(projectPath, relPath));
}

function readPackageJson(projectPath: string): Record<string, unknown> | undefined {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function hasDependency(pkg: Record<string, unknown> | undefined, depName: string): boolean {
  if (!pkg) return false;
  const deps = (pkg['dependencies'] ?? {}) as Record<string, unknown>;
  const devDeps = (pkg['devDependencies'] ?? {}) as Record<string, unknown>;
  return depName in deps || depName in devDeps;
}

function detectFrontend(
  projectPath: string,
  pkg: Record<string, unknown> | undefined,
  indicators: string[],
): DetectedFrontend {
  // Next.js indicators
  const hasNextConfig =
    fileExists(projectPath, 'next.config.js') ||
    fileExists(projectPath, 'next.config.ts') ||
    fileExists(projectPath, 'next.config.mjs');
  const hasNextDep = hasDependency(pkg, 'next');
  const hasAppDir =
    fileExists(projectPath, 'app/page.tsx') || fileExists(projectPath, 'app/page.jsx');
  const hasPagesDir =
    fileExists(projectPath, 'pages/index.tsx') || fileExists(projectPath, 'pages/index.jsx');

  if (hasNextConfig || hasNextDep || hasAppDir || hasPagesDir) {
    if (hasNextConfig) indicators.push('next.config.js present');
    if (hasNextDep) indicators.push('next dependency present');
    if (hasAppDir) indicators.push('app/page.tsx present');
    return 'next';
  }

  // Vite/React indicators
  const hasViteConfig =
    fileExists(projectPath, 'vite.config.ts') || fileExists(projectPath, 'vite.config.js');
  const hasViteDep = hasDependency(pkg, 'vite');
  const hasReactDep = hasDependency(pkg, 'react');
  const hasSrcMain =
    fileExists(projectPath, 'src/main.tsx') ||
    fileExists(projectPath, 'src/main.jsx') ||
    fileExists(projectPath, 'src/App.tsx');

  if (hasViteConfig || (hasViteDep && hasReactDep) || hasSrcMain) {
    if (hasViteConfig) indicators.push('vite.config.ts present');
    if (hasViteDep) indicators.push('vite dependency present');
    return 'vite-react';
  }

  return 'none';
}

function detectBackend(
  projectPath: string,
  pkg: Record<string, unknown> | undefined,
  indicators: string[],
): DetectedBackend {
  // NestJS indicators
  const hasNestCli = fileExists(projectPath, 'nest-cli.json');
  const hasNestDep = hasDependency(pkg, '@nestjs/core');
  if (hasNestCli || hasNestDep) {
    if (hasNestCli) indicators.push('nest-cli.json present');
    if (hasNestDep) indicators.push('@nestjs/core dependency present');
    return 'nest';
  }

  // Express indicators
  const hasExpressDep = hasDependency(pkg, 'express');
  const hasSrcServer =
    fileExists(projectPath, 'src/server.ts') ||
    fileExists(projectPath, 'src/index.ts') ||
    fileExists(projectPath, 'src/app.ts');
  if (hasExpressDep) {
    indicators.push('express dependency present');
    if (hasSrcServer) indicators.push('src/server.ts or src/index.ts present');
    return 'express';
  }

  return 'none';
}

function detectDatabase(
  projectPath: string,
  pkg: Record<string, unknown> | undefined,
  indicators: string[],
): DetectedDatabase {
  // Prisma (postgres indicator)
  if (fileExists(projectPath, 'prisma/schema.prisma')) {
    indicators.push('prisma/schema.prisma present');
    const schema = fs.readFileSync(path.join(projectPath, 'prisma/schema.prisma'), 'utf8');
    if (schema.includes('postgresql') || schema.includes('postgres')) {
      indicators.push('Prisma schema targets postgresql');
      return 'postgres';
    }
    if (schema.includes('mongodb')) {
      indicators.push('Prisma schema targets mongodb');
      return 'mongodb';
    }
    return 'postgres'; // default prisma assumption
  }

  // Mongoose (mongodb indicator)
  if (
    hasDependency(pkg, 'mongoose') ||
    fileExists(projectPath, 'src/db/mongoose.ts') ||
    fileExists(projectPath, 'src/db/mongoose.js')
  ) {
    indicators.push('mongoose dependency or file present');
    return 'mongodb';
  }

  // pg / postgres
  if (hasDependency(pkg, 'pg') || hasDependency(pkg, 'postgres')) {
    indicators.push('pg dependency present');
    return 'postgres';
  }

  return 'none';
}

function detectOrm(
  projectPath: string,
  pkg: Record<string, unknown> | undefined,
  indicators: string[],
): DetectedOrm {
  if (
    fileExists(projectPath, 'prisma/schema.prisma') ||
    hasDependency(pkg, '@prisma/client') ||
    hasDependency(pkg, 'prisma')
  ) {
    indicators.push('Prisma ORM detected');
    return 'prisma';
  }
  if (
    hasDependency(pkg, 'mongoose') ||
    fileExists(projectPath, 'src/db/mongoose.ts') ||
    fileExists(projectPath, 'src/models/example.model.ts')
  ) {
    indicators.push('Mongoose ORM detected');
    return 'mongoose';
  }
  return 'none';
}

function detectStyling(
  projectPath: string,
  pkg: Record<string, unknown> | undefined,
  indicators: string[],
): DetectedStyling {
  if (
    fileExists(projectPath, 'tailwind.config.js') ||
    fileExists(projectPath, 'tailwind.config.ts') ||
    hasDependency(pkg, 'tailwindcss')
  ) {
    indicators.push('tailwindcss detected');
    return 'tailwind';
  }
  if (hasDependency(pkg, '@mui/material') || hasDependency(pkg, '@material-ui/core')) {
    indicators.push('MUI dependency detected');
    return 'mui';
  }
  return 'none';
}

function detectPackageManager(projectPath: string, indicators: string[]): DetectedPackageManager {
  if (fileExists(projectPath, 'package-lock.json')) {
    indicators.push('package-lock.json present (npm)');
    return 'npm';
  }
  // We only support npm as per project scope
  return 'unknown';
}

/**
 * Detect the technology stack used in a project directory.
 *
 * If `manifestStack` is provided (from structify.config.json), it is used as
 * the authoritative source and filesystem detection is used only for verification.
 */
export function detectStack(
  projectPath: string,
  manifestStack?: {
    frontend?: string;
    backend?: string;
    database?: string;
    orm?: string;
    styling?: string;
    packageManager?: string;
    docker?: boolean;
    githubActions?: boolean;
    eslint?: boolean;
    prettier?: boolean;
  },
): StackDetectionResult {
  const root = path.resolve(projectPath);
  if (!fs.existsSync(root)) {
    return {
      success: false,
      projectPath: root,
      detectedStack: {
        frontend: 'unknown',
        backend: 'unknown',
        database: 'unknown',
        orm: 'unknown',
        styling: 'unknown',
        packageManager: 'unknown',
        docker: false,
        githubActions: false,
        eslint: false,
        prettier: false,
        git: false,
        editorconfig: false,
        detectionSource: 'none',
        confidence: 'low',
        indicators: [],
      },
      hasStructifyMetadata: false,
      rawIndicators: {},
      error: `Project path does not exist: ${root}`,
    };
  }

  const indicators: string[] = [];
  const pkg = readPackageJson(root);
  const hasStructifyMetadata = fs.existsSync(path.join(root, 'structify.config.json'));

  // Raw filesystem indicator scan
  const rawIndicators: Record<string, boolean> = {
    'package.json': fileExists(root, 'package.json'),
    'package-lock.json': fileExists(root, 'package-lock.json'),
    'next.config.js': fileExists(root, 'next.config.js'),
    'next.config.ts': fileExists(root, 'next.config.ts'),
    'next.config.mjs': fileExists(root, 'next.config.mjs'),
    'vite.config.ts': fileExists(root, 'vite.config.ts'),
    'vite.config.js': fileExists(root, 'vite.config.js'),
    'nest-cli.json': fileExists(root, 'nest-cli.json'),
    'prisma/schema.prisma': fileExists(root, 'prisma/schema.prisma'),
    'src/db/mongoose.ts': fileExists(root, 'src/db/mongoose.ts'),
    'tailwind.config.js': fileExists(root, 'tailwind.config.js'),
    'tailwind.config.ts': fileExists(root, 'tailwind.config.ts'),
    Dockerfile: fileExists(root, 'Dockerfile'),
    'docker-compose.yml': fileExists(root, 'docker-compose.yml'),
    '.github/workflows/ci.yml': fileExists(root, '.github/workflows/ci.yml'),
    '.eslintrc.json': fileExists(root, '.eslintrc.json'),
    'eslint.config.js': fileExists(root, 'eslint.config.js'),
    '.prettierrc': fileExists(root, '.prettierrc'),
    '.prettierrc.json': fileExists(root, '.prettierrc.json'),
    '.git': fileExists(root, '.git'),
    '.editorconfig': fileExists(root, '.editorconfig'),
    'structify.config.json': hasStructifyMetadata,
    'structify.manifest.json': fileExists(root, 'structify.manifest.json'),
    'structify.project-graph.json': fileExists(root, 'structify.project-graph.json'),
  };

  // Filesystem detection
  const fsFrontend = detectFrontend(root, pkg, indicators);
  const fsBackend = detectBackend(root, pkg, indicators);
  const fsDatabase = detectDatabase(root, pkg, indicators);
  const fsOrm = detectOrm(root, pkg, indicators);
  const fsStyling = detectStyling(root, pkg, indicators);
  const fsPackageManager = detectPackageManager(root, indicators);
  const fsDocker = rawIndicators['Dockerfile'] || rawIndicators['docker-compose.yml'];
  const fsGithubActions = rawIndicators['.github/workflows/ci.yml'];
  const fsEslint =
    rawIndicators['.eslintrc.json'] ||
    rawIndicators['eslint.config.js'] ||
    hasDependency(pkg, 'eslint');
  const fsPrettier =
    rawIndicators['.prettierrc'] ||
    rawIndicators['.prettierrc.json'] ||
    hasDependency(pkg, 'prettier');
  const fsGit = rawIndicators['.git'];
  const fsEditorconfig = rawIndicators['.editorconfig'];

  if (fsDocker) indicators.push('Dockerfile or docker-compose.yml present');
  if (fsGithubActions) indicators.push('.github/workflows/ci.yml present');
  if (fsEslint) indicators.push('ESLint config or dependency present');
  if (fsPrettier) indicators.push('Prettier config or dependency present');
  if (fsGit) indicators.push('.git directory present');
  if (fsEditorconfig) indicators.push('.editorconfig present');

  // Apply manifest override (manifest = primary source when available)
  const detectionSource: DetectedStack['detectionSource'] = hasStructifyMetadata
    ? manifestStack
      ? 'metadata'
      : 'mixed'
    : 'filesystem';

  const detectedStack: DetectedStack = {
    frontend: (manifestStack?.frontend as DetectedFrontend) ?? fsFrontend,
    backend: (manifestStack?.backend as DetectedBackend) ?? fsBackend,
    database: (manifestStack?.database as DetectedDatabase) ?? fsDatabase,
    orm: (manifestStack?.orm as DetectedOrm) ?? fsOrm,
    styling: (manifestStack?.styling as DetectedStyling) ?? fsStyling,
    packageManager: (manifestStack?.packageManager as DetectedPackageManager) ?? fsPackageManager,
    docker: manifestStack?.docker ?? fsDocker,
    githubActions: manifestStack?.githubActions ?? fsGithubActions,
    eslint: manifestStack?.eslint ?? fsEslint,
    prettier: manifestStack?.prettier ?? fsPrettier,
    git: fsGit,
    editorconfig: fsEditorconfig,
    detectionSource,
    confidence: hasStructifyMetadata ? 'high' : indicators.length >= 3 ? 'medium' : 'low',
    indicators,
  };

  return {
    success: true,
    projectPath: root,
    detectedStack,
    hasStructifyMetadata,
    rawIndicators,
  };
}
