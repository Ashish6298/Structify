export const FRONTEND_OPTIONS = [
  { value: 'next', label: 'Next.js', description: 'Next.js React Framework', available: true },
  {
    value: 'vite-react',
    label: 'React (Vite)',
    description: 'Vite React Starter Pack',
    available: true,
  },
  { value: 'none', label: 'None', description: 'No frontend framework', available: true },
] as const;

export const BACKEND_OPTIONS = [
  {
    value: 'express',
    label: 'Express',
    description: 'Minimalist Node.js API server',
    available: true,
  },
  { value: 'nest', label: 'NestJS', description: 'Progressive Node.js framework', available: true },
  { value: 'none', label: 'None', description: 'No backend framework', available: true },
] as const;

export const STYLING_OPTIONS = [
  {
    value: 'tailwind',
    label: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    available: true,
  },
  {
    value: 'mui',
    label: 'Material UI (MUI)',
    description: 'Material design library',
    available: true,
  },
  { value: 'none', label: 'None', description: 'Plain vanilla CSS', available: true },
] as const;

export const DATABASE_OPTIONS = [
  { value: 'postgres', label: 'PostgreSQL', description: 'Relational database', available: true },
  { value: 'mongodb', label: 'MongoDB', description: 'NoSQL document database', available: true },
  { value: 'none', label: 'None', description: 'No database client', available: true },
] as const;

export const ORM_OPTIONS = [
  { value: 'prisma', label: 'Prisma', description: 'Next-generation ORM', available: true },
  {
    value: 'mongoose',
    label: 'Mongoose',
    description: 'MongoDB object modeling tool',
    available: true,
  },
  { value: 'none', label: 'None', description: 'No ORM/ODM mapper', available: true },
] as const;

export const PACKAGE_MANAGERS = [
  { value: 'npm', label: 'npm', description: 'Default Node.js package manager', available: true },
  {
    value: 'pnpm',
    label: 'pnpm',
    description: 'Fast, disk space efficient package manager',
    available: true,
  },
] as const;

export const PROJECT_MODES = [
  {
    value: 'frontend-only',
    label: 'Frontend Only',
    description: 'Client-only application scaffolding',
  },
  { value: 'backend-only', label: 'Backend Only', description: 'API-only server scaffolding' },
  {
    value: 'fullstack',
    label: 'Fullstack',
    description: 'Combined client and API server scaffolding',
  },
] as const;

export const LANGUAGES = [
  {
    value: 'typescript',
    label: 'TypeScript',
    description: 'Strict syntactical superset of JavaScript',
  },
] as const;

export const DEFAULT_CONFIG = {
  version: '1.0',
  mode: 'frontend-only',
  language: 'typescript',
  stack: {
    frontend: 'next',
    backend: 'none',
    styling: 'tailwind',
    database: 'postgres',
    orm: 'prisma',
    packageManager: 'npm',
  },
  tools: {
    docker: false,
    eslint: true,
    prettier: true,
    githubActions: false,
    git: true,
    editorconfig: true,
    husky: false,
    lintStaged: false,
    commitlint: false,
  },
} as const;
