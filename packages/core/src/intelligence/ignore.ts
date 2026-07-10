import path from 'path';

const IGNORED_DIRS = new Set([
  '.next',
  '.turbo',
  '.vite',
  '.yarn',
  'coverage',
  'dist',
  'build',
  'out',
  'target',
  'tmp',
  'temp',
  'node_modules',
]);

const GENERATED_FILE_PATTERNS = [
  /\.tsbuildinfo$/i,
  /^pnpm-lock\.yaml$/i,
  /^package-lock\.json$/i,
  /^yarn\.lock$/i,
  /^bun\.lockb?$/i,
  /^coverage-final\.json$/i,
];

const CONFIG_FILE_PATTERNS = [
  /^tsconfig(\..+)?\.json$/i,
  /^jsconfig(\..+)?\.json$/i,
  /^vite\.config\.(ts|js|mjs|cjs)$/i,
  /^next\.config\.(ts|js|mjs|cjs)$/i,
  /^tailwind\.config\.(ts|js|mjs|cjs)$/i,
  /^postcss\.config\.(ts|js|mjs|cjs)$/i,
  /^eslint\.config\.(ts|js|mjs|cjs)$/i,
  /^\.eslintrc(\..+)?$/i,
  /^prettier\.config\.(ts|js|mjs|cjs)$/i,
  /^\.prettierrc(\..+)?$/i,
  /^nest-cli\.json$/i,
  /^docker-compose\.(ya?ml)$/i,
  /^Dockerfile$/i,
];

const ASSET_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
]);

const ARCHITECTURAL_NAMES = new Set([
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'next.config.ts',
  'vite.config.ts',
  'vite.config.js',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'postcss.config.ts',
  'prisma',
  'src',
  'app',
  'pages',
  'public',
]);

export function isIgnored(targetPath: string): boolean {
  const parts = normalizeParts(targetPath);
  return parts.some((part) => IGNORED_DIRS.has(part));
}

export function isGenerated(targetPath: string): boolean {
  const fileName = path.basename(targetPath);
  return GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

export function isConfiguration(targetPath: string): boolean {
  const fileName = path.basename(targetPath);
  if (fileName.startsWith('.env')) {
    return true;
  }
  return CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

export function isAsset(targetPath: string): boolean {
  return ASSET_EXTENSIONS.has(path.extname(targetPath).toLowerCase());
}

export function isArchitectural(targetPath: string): boolean {
  if (isConfiguration(targetPath) || isAsset(targetPath)) {
    return true;
  }
  const normalized = targetPath.replaceAll('\\', '/');
  const fileName = path.basename(normalized);
  if (ARCHITECTURAL_NAMES.has(fileName)) {
    return true;
  }
  return [
    /^src\//i,
    /^app\//i,
    /^pages\//i,
    /^components?\//i,
    /^shared\//i,
    /^public\//i,
    /^prisma\//i,
    /^database\//i,
    /^db\//i,
  ].some((pattern) => pattern.test(normalized));
}

function normalizeParts(targetPath: string): string[] {
  return targetPath.replaceAll('\\', '/').split('/').filter(Boolean);
}
