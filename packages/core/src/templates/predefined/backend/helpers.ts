import { PredefinedTemplateFile } from '../types.js';

export interface BackendPackageOptions {
  projectName: string;
  description: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const commonDevDependencies = {
  '@types/node': '^20.17.6',
  '@typescript-eslint/eslint-plugin': '^6.21.0',
  '@typescript-eslint/parser': '^6.21.0',
  eslint: '^8.57.0',
  prettier: '^3.3.2',
  tsx: '^4.19.2',
  typescript: '^5.5.2',
};

export function createBackendPackageJson(options: BackendPackageOptions): string {
  return (
    JSON.stringify(
      {
        name: options.projectName.toLowerCase(),
        version: '1.0.0',
        private: true,
        type: 'module',
        description: options.description,
        scripts: {
          dev: 'tsx watch src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
          lint: 'eslint "src/**/*.ts"',
          format: 'prettier --write "src/**/*.ts" "*.json" "*.md"',
          ...options.scripts,
        },
        dependencies: sortRecord(options.dependencies),
        devDependencies: sortRecord({
          ...commonDevDependencies,
          ...(options.devDependencies ?? {}),
        }),
      },
      null,
      2,
    ) + '\n'
  );
}

export function commonBackendFiles(projectName: string, readme: string): PredefinedTemplateFile[] {
  return [
    { path: 'README.md', content: readme },
    {
      path: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
`,
    },
    {
      path: '.eslintrc.json',
      content: `{
  "root": true,
  "env": {
    "es2022": true,
    "node": true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ]
  }
}
`,
    },
    {
      path: '.prettierrc',
      content: `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all"
}
`,
    },
    {
      path: '.env.example',
      content: `NODE_ENV=development
PORT=3000
APP_NAME=${projectName}
`,
    },
    {
      path: 'src/types/http.ts',
      content: `export interface ApiResponse<T> {
  data: T;
  requestId: string;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
  };
  requestId: string;
}
`,
    },
    {
      path: 'src/interfaces/health.interface.ts',
      content: `export interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
  service: string;
}
`,
    },
  ];
}

export function createReadme(title: string, description: string, endpoints: string[]): string {
  return `# ${title}

${description}

## Scripts

- \`npm run dev\` starts the local development server.
- \`npm run build\` compiles TypeScript into \`dist/\`.
- \`npm run lint\` checks source files with ESLint.
- \`npm start\` runs the compiled server.

## Endpoints

${endpoints.map((endpoint) => `- \`${endpoint}\``).join('\n')}

## Environment

Copy \`.env.example\` to \`.env\` and replace demo values as needed. This starter does not include production secrets, credentials, or deployment-specific configuration.
`;
}

export function sortRecord(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right)),
  );
}
