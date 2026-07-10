import { analyzeProject } from '../intelligence/engine.js';

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
  const analysis = analyzeProject(projectPath);
  if (!analysis.project.exists) {
    return {
      success: false,
      projectPath: analysis.project.path,
      detectedStack: emptyDetectedStack(),
      hasStructifyMetadata: false,
      rawIndicators: {},
      error: `Project path does not exist: ${analysis.project.path}`,
    };
  }

  const indicators = buildIndicators(analysis);
  const detectedStack: DetectedStack = {
    frontend: mapFrontend(manifestStack?.frontend, analysis.framework.frontend),
    backend: mapBackend(manifestStack?.backend, analysis.framework.backend),
    database: mapDatabase(manifestStack?.database, analysis.framework.database),
    orm: mapOrm(manifestStack?.orm, analysis.framework.orm),
    styling: mapStyling(manifestStack?.styling, analysis.framework.styling),
    packageManager: mapPackageManager(manifestStack?.packageManager, analysis.packageManager.name),
    docker: manifestStack?.docker ?? analysis.modules.detected.includes('docker') ?? false,
    githubActions:
      manifestStack?.githubActions ?? analysis.modules.detected.includes('github-actions') ?? false,
    eslint: manifestStack?.eslint ?? analysis.modules.detected.includes('eslint'),
    prettier: manifestStack?.prettier ?? analysis.modules.detected.includes('prettier'),
    git: analysis.files.some((file) => file.path === '.git'),
    editorconfig: analysis.files.some((file) => file.name === '.editorconfig'),
    detectionSource: analysis.metadata.structifyProject
      ? manifestStack
        ? 'metadata'
        : 'mixed'
      : 'filesystem',
    confidence:
      analysis.metadata.structifyProject || analysis.framework.all.length >= 2
        ? 'high'
        : indicators.length >= 2
          ? 'medium'
          : 'low',
    indicators,
  };

  return {
    success: true,
    projectPath: analysis.project.path,
    detectedStack,
    hasStructifyMetadata: analysis.metadata.structifyProject,
    rawIndicators: buildRawIndicators(analysis),
  };
}

function buildIndicators(analysis: ReturnType<typeof analyzeProject>): string[] {
  const indicators = [
    ...analysis.framework.frontend.map((value) => `${value} frontend detected`),
    ...analysis.framework.backend.map((value) => `${value} backend detected`),
    ...analysis.framework.database.map((value) => `${value} database detected`),
    ...analysis.framework.orm.map((value) => `${value} orm detected`),
    ...analysis.framework.styling.map((value) => `${value} styling detected`),
  ];
  if (analysis.metadata.structifyProject) {
    indicators.push('Structify metadata present');
  }
  if (analysis.packageManager.lockFile) {
    indicators.push(`${analysis.packageManager.lockFile} present`);
  }
  return indicators;
}

function buildRawIndicators(analysis: ReturnType<typeof analyzeProject>): Record<string, boolean> {
  const paths = new Set(analysis.files.map((file) => file.path));
  return {
    'package.json': paths.has('package.json'),
    'package-lock.json': paths.has('package-lock.json'),
    'next.config.js': paths.has('next.config.js'),
    'next.config.ts': paths.has('next.config.ts'),
    'next.config.mjs': paths.has('next.config.mjs'),
    'vite.config.ts': paths.has('vite.config.ts'),
    'vite.config.js': paths.has('vite.config.js'),
    'nest-cli.json': paths.has('nest-cli.json'),
    'prisma/schema.prisma': paths.has('prisma/schema.prisma'),
    'src/db/mongoose.ts': paths.has('src/db/mongoose.ts'),
    'tailwind.config.js': paths.has('tailwind.config.js'),
    'tailwind.config.ts': paths.has('tailwind.config.ts'),
    Dockerfile: paths.has('Dockerfile'),
    'docker-compose.yml': paths.has('docker-compose.yml'),
    '.github/workflows/ci.yml': paths.has('.github/workflows/ci.yml'),
    '.eslintrc.json': paths.has('.eslintrc.json'),
    'eslint.config.js': paths.has('eslint.config.js'),
    '.prettierrc': paths.has('.prettierrc'),
    '.prettierrc.json': paths.has('.prettierrc.json'),
    '.git': paths.has('.git'),
    '.editorconfig': paths.has('.editorconfig'),
    'structify.config.json': paths.has('structify.config.json'),
    'structify.manifest.json': paths.has('structify.manifest.json'),
    'structify.project-graph.json': paths.has('structify.project-graph.json'),
  };
}

function emptyDetectedStack(): DetectedStack {
  return {
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
  };
}

function mapFrontend(override: string | undefined, detected: string[]): DetectedFrontend {
  const value = override ?? detected[0];
  if (value === 'next') {
    return 'next';
  }
  if (value === 'vite-react' || value === 'vite' || value === 'react') {
    return 'vite-react';
  }
  return value ? 'unknown' : 'none';
}

function mapBackend(override: string | undefined, detected: string[]): DetectedBackend {
  const value = override ?? detected[0];
  if (value === 'express') {
    return 'express';
  }
  if (value === 'nest') {
    return 'nest';
  }
  return value ? 'unknown' : 'none';
}

function mapDatabase(override: string | undefined, detected: string[]): DetectedDatabase {
  const value = override ?? detected[0];
  if (value === 'postgres') {
    return 'postgres';
  }
  if (value === 'mongodb') {
    return 'mongodb';
  }
  return value ? 'unknown' : 'none';
}

function mapOrm(override: string | undefined, detected: string[]): DetectedOrm {
  const value = override ?? detected[0];
  if (value === 'prisma') {
    return 'prisma';
  }
  if (value === 'mongoose') {
    return 'mongoose';
  }
  return value ? 'unknown' : 'none';
}

function mapStyling(override: string | undefined, detected: string[]): DetectedStyling {
  const value = override ?? detected[0];
  if (value === 'tailwind') {
    return 'tailwind';
  }
  if (value === 'mui') {
    return 'mui';
  }
  return value ? 'unknown' : 'none';
}

function mapPackageManager(override: string | undefined, detected: string): DetectedPackageManager {
  const value = override ?? detected;
  return value === 'npm' ? 'npm' : 'unknown';
}
