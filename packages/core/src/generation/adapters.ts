import {
  FullstackAdapter,
  FullstackContribution,
  FullstackGenerationContext,
} from './fullstack-architecture.js';

export class NpmWorkspaceAdapter implements FullstackAdapter {
  id = 'workspace-npm';
  kind = 'workspace' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack';
  }

  contribute(context: FullstackGenerationContext): FullstackContribution {
    const { projectName } = context.config;
    return {
      files: [
        {
          path: 'package.json',
          content:
            JSON.stringify(
              {
                name: projectName.toLowerCase(),
                version: '1.0.0',
                private: true,
                workspaces: ['frontend', 'backend', 'packages/*'],
                scripts: {
                  dev: 'npm run dev --workspaces --if-present',
                  build: 'npm run build --workspaces --if-present',
                  test: 'npm run test --workspaces --if-present',
                },
              },
              null,
              2,
            ) + '\n',
          source: 'workspace-npm',
        },
        {
          path: 'packages/shared/package.json',
          content:
            JSON.stringify(
              {
                name: `@${projectName.toLowerCase()}/shared`,
                version: '1.0.0',
                private: true,
                main: './src/index.ts',
                types: './src/index.ts',
                dependencies: {},
              },
              null,
              2,
            ) + '\n',
          source: 'workspace-npm',
        },
        {
          path: 'packages/shared/tsconfig.json',
          content:
            JSON.stringify(
              {
                compilerOptions: {
                  target: 'ES2022',
                  module: 'NodeNext',
                  moduleResolution: 'NodeNext',
                  declaration: true,
                  strict: true,
                  skipLibCheck: true,
                },
                include: ['src/**/*'],
              },
              null,
              2,
            ) + '\n',
          source: 'workspace-npm',
        },
        {
          path: 'packages/shared/src/index.ts',
          content: `export const SHARED = true;\n`,
          source: 'workspace-npm',
        },
      ],
    };
  }
}

export class NextAdapter implements FullstackAdapter {
  id = 'frontend-next';
  kind = 'frontend' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && context.config.stack.frontend === 'next';
  }

  contribute(context: FullstackGenerationContext): FullstackContribution {
    const { projectName } = context.config;
    return {
      dependencies: [
        {
          name: 'next',
          version: '^15.0.0',
          kind: 'runtime',
          source: 'frontend-next',
          target: 'frontend',
        },
        {
          name: 'react',
          version: '^19.0.0',
          kind: 'runtime',
          source: 'frontend-next',
          target: 'frontend',
        },
        {
          name: 'react-dom',
          version: '^19.0.0',
          kind: 'runtime',
          source: 'frontend-next',
          target: 'frontend',
        },
        {
          name: 'typescript',
          version: '^5.0.0',
          kind: 'development',
          source: 'frontend-next',
          target: 'frontend',
        },
        {
          name: '@types/react',
          version: '^19.0.0',
          kind: 'development',
          source: 'frontend-next',
          target: 'frontend',
        },
        {
          name: '@types/react-dom',
          version: '^19.0.0',
          kind: 'development',
          source: 'frontend-next',
          target: 'frontend',
        },
      ],
      files: [
        {
          path: 'frontend/next.config.ts',
          content: `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n`,
          source: 'frontend-next',
        },
        {
          path: 'frontend/tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}\n`,
          source: 'frontend-next',
        },
        {
          path: 'frontend/app/layout.tsx',
          content: `import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = {\n  title: "${projectName}",\n  description: "Generated by Structify",\n};\n\nexport default function RootLayout({\n  children,\n}: Readonly<{\n  children: React.ReactNode;\n}>) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
          source: 'frontend-next',
        },
        {
          path: 'frontend/app/page.tsx',
          content: `export default function Home() {\n  return (\n    <main className="flex min-h-screen flex-col items-center justify-center p-24">\n      <h1 className="text-4xl font-bold">Welcome to ${projectName}</h1>\n      <p className="mt-4 text-xl">Generated with Structify Next.js</p>\n    </main>\n  );\n}\n`,
          source: 'frontend-next',
        },
        {
          path: 'frontend/app/globals.css',
          content: `body {\n  margin: 0;\n  font-family: sans-serif;\n}\n`,
          source: 'frontend-next',
        },
      ],
    };
  }
}

export class ViteReactAdapter implements FullstackAdapter {
  id = 'frontend-vite-react';
  kind = 'frontend' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && context.config.stack.frontend === 'vite-react';
  }

  contribute(context: FullstackGenerationContext): FullstackContribution {
    const { projectName } = context.config;
    return {
      dependencies: [
        {
          name: 'react',
          version: '^19.0.0',
          kind: 'runtime',
          source: 'frontend-vite-react',
          target: 'frontend',
        },
        {
          name: 'react-dom',
          version: '^19.0.0',
          kind: 'runtime',
          source: 'frontend-vite-react',
          target: 'frontend',
        },
        {
          name: 'vite',
          version: '^6.0.0',
          kind: 'development',
          source: 'frontend-vite-react',
          target: 'frontend',
        },
        {
          name: '@vitejs/plugin-react',
          version: '^4.3.0',
          kind: 'development',
          source: 'frontend-vite-react',
          target: 'frontend',
        },
        {
          name: 'typescript',
          version: '^5.0.0',
          kind: 'development',
          source: 'frontend-vite-react',
          target: 'frontend',
        },
        {
          name: '@types/react',
          version: '^19.0.0',
          kind: 'development',
          source: 'frontend-vite-react',
          target: 'frontend',
        },
        {
          name: '@types/react-dom',
          version: '^19.0.0',
          kind: 'development',
          source: 'frontend-vite-react',
          target: 'frontend',
        },
      ],
      files: [
        {
          path: 'frontend/vite.config.ts',
          content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
          source: 'frontend-vite-react',
        },
        {
          path: 'frontend/tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}\n`,
          source: 'frontend-vite-react',
        },
        {
          path: 'frontend/index.html',
          content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>${projectName}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
          source: 'frontend-vite-react',
        },
        {
          path: 'frontend/src/main.tsx',
          content: `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.tsx';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n`,
          source: 'frontend-vite-react',
        },
        {
          path: 'frontend/src/App.tsx',
          content: `export default function App() {\n  return (\n    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>\n      <h1>Welcome to ${projectName}</h1>\n      <p>Generated with Structify React Vite</p>\n    </div>\n  );\n}\n`,
          source: 'frontend-vite-react',
        },
        {
          path: 'frontend/src/index.css',
          content: `body {\n  margin: 0;\n  font-family: sans-serif;\n}\n`,
          source: 'frontend-vite-react',
        },
      ],
    };
  }
}

export class ExpressAdapter implements FullstackAdapter {
  id = 'backend-express';
  kind = 'backend' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && context.config.stack.backend === 'express';
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: 'express',
          version: '^4.19.0',
          kind: 'runtime',
          source: 'backend-express',
          target: 'backend',
        },
        {
          name: 'typescript',
          version: '^5.0.0',
          kind: 'development',
          source: 'backend-express',
          target: 'backend',
        },
        {
          name: 'ts-node-dev',
          version: '^2.0.0',
          kind: 'development',
          source: 'backend-express',
          target: 'backend',
        },
        {
          name: '@types/express',
          version: '^4.17.0',
          kind: 'development',
          source: 'backend-express',
          target: 'backend',
        },
        {
          name: '@types/node',
          version: '^20.0.0',
          kind: 'development',
          source: 'backend-express',
          target: 'backend',
        },
      ],
      files: [
        {
          path: 'backend/tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "lib": ["es2022"],
    "outDir": "./dist",
    "rootDir": "..",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*", "../packages/shared/src/**/*"]
}\n`,
          source: 'backend-express',
        },
        {
          path: 'backend/src/config/env.ts',
          content: `export const ENV = {\n  PORT: process.env.PORT || 3000,\n  NODE_ENV: process.env.NODE_ENV || 'development',\n};\n`,
          source: 'backend-express',
        },
        {
          path: 'backend/src/middleware/error.middleware.ts',
          content: `import { Request, Response, NextFunction } from 'express';\n\nexport function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {\n  const message = err instanceof Error ? err.message : 'Internal Server Error';\n  if (err instanceof Error && err.stack) {\n    console.error(err.stack);\n  }\n  res.status(500).json({\n    success: false,\n    error: message,\n  });\n}\n`,
          source: 'backend-express',
        },
        {
          path: 'backend/src/routes/health.route.ts',
          content: `import { Router } from 'express';\n\nexport const healthRouter = Router();\nhealthRouter.get('/health', (req, res) => {\n  res.json({ status: 'ok', timestamp: new Date() });\n});\n`,
          source: 'backend-express',
        },
        {
          path: 'backend/src/app.ts',
          content: `import express from 'express';\nimport { healthRouter } from './routes/health.route.js';\nimport { errorHandler } from './middleware/error.middleware.js';\n\nexport const app = express();\napp.use(express.json());\napp.use('/api', healthRouter);\napp.use(errorHandler);\n`,
          source: 'backend-express',
        },
        {
          path: 'backend/src/index.ts',
          content: `import { app } from './app.js';\nimport { ENV } from './config/env.js';\n\napp.listen(ENV.PORT, () => {\n  console.log(\`Server running on http://localhost:\${ENV.PORT} in \${ENV.NODE_ENV} mode\`);\n});\n`,
          source: 'backend-express',
        },
      ],
    };
  }
}

export class NestAdapter implements FullstackAdapter {
  id = 'backend-nest';
  kind = 'backend' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && context.config.stack.backend === 'nest';
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: '@nestjs/common',
          version: '^10.0.0',
          kind: 'runtime',
          source: 'backend-nest',
          target: 'backend',
        },
        {
          name: '@nestjs/core',
          version: '^10.0.0',
          kind: 'runtime',
          source: 'backend-nest',
          target: 'backend',
        },
        {
          name: 'reflect-metadata',
          version: '^0.2.0',
          kind: 'runtime',
          source: 'backend-nest',
          target: 'backend',
        },
        {
          name: 'rxjs',
          version: '^7.8.0',
          kind: 'runtime',
          source: 'backend-nest',
          target: 'backend',
        },
        {
          name: 'typescript',
          version: '^5.0.0',
          kind: 'development',
          source: 'backend-nest',
          target: 'backend',
        },
        {
          name: '@types/node',
          version: '^20.0.0',
          kind: 'development',
          source: 'backend-nest',
          target: 'backend',
        },
        {
          name: '@nestjs/cli',
          version: '^10.0.0',
          kind: 'development',
          source: 'backend-nest',
          target: 'backend',
        },
      ],
      files: [
        {
          path: 'backend/tsconfig.json',
          content: `{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}\n`,
          source: 'backend-nest',
        },
        {
          path: 'backend/src/app.service.ts',
          content: `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class AppService {\n  getHello(): string {\n    return 'Hello from NestJS (generated by Structify)!';\n  }\n}\n`,
          source: 'backend-nest',
        },
        {
          path: 'backend/src/app.controller.ts',
          content: `import { Controller, Get } from '@nestjs/common';\nimport { AppService } from './app.service.js';\n\n@Controller()\nexport class AppController {\n  constructor(private readonly appService: AppService) {}\n\n  @Get()\n  getHello(): string {\n    return this.appService.getHello();\n  }\n}\n`,
          source: 'backend-nest',
        },
        {
          path: 'backend/src/app.module.ts',
          content: `import { Module } from '@nestjs/common';\nimport { AppController } from './app.controller.js';\nimport { AppService } from './app.service.js';\n\n@Module({\n  imports: [],\n  controllers: [AppController],\n  providers: [AppService],\n})\nexport class AppModule {}\n`,
          source: 'backend-nest',
        },
        {
          path: 'backend/src/main.ts',
          content: `import { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module.js';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(3000);\n  console.log('Application is running on: http://localhost:3000');\n}\nbootstrap();\n`,
          source: 'backend-nest',
        },
      ],
    };
  }
}

export class PostgresAdapter implements FullstackAdapter {
  id = 'database-postgres';
  kind = 'database' as const;
  supports(context: FullstackGenerationContext) {
    return context.config.mode === 'fullstack' && context.config.stack.database === 'postgres';
  }
  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {};
  }
}

export class MongoDbAdapter implements FullstackAdapter {
  id = 'database-mongodb';
  kind = 'database' as const;
  supports(context: FullstackGenerationContext) {
    return context.config.mode === 'fullstack' && context.config.stack.database === 'mongodb';
  }
  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {};
  }
}

export class PrismaAdapter implements FullstackAdapter {
  id = 'orm-prisma';
  kind = 'orm' as const;

  supports(context: FullstackGenerationContext): boolean {
    return (
      context.config.mode === 'fullstack' &&
      context.config.stack.database === 'postgres' &&
      context.config.stack.orm === 'prisma'
    );
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: 'prisma',
          version: '^5.15.0',
          kind: 'development',
          source: 'orm-prisma',
          target: 'backend',
        },
        {
          name: '@prisma/client',
          version: '^5.15.0',
          kind: 'runtime',
          source: 'orm-prisma',
          target: 'backend',
        },
      ],
      files: [
        {
          path: 'backend/prisma/schema.prisma',
          content: `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\nmodel User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n}\n`,
          source: 'orm-prisma',
        },
        {
          path: 'backend/src/db/prisma.ts',
          content: `import { PrismaClient } from '@prisma/client';\n\nconst globalForPrisma = global as unknown as { prisma: PrismaClient };\n\nexport const prisma =\n  globalForPrisma.prisma ||\n  new PrismaClient({\n    log: ['query'],\n  });\n\nif (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;\n`,
          source: 'orm-prisma',
        },
      ],
    };
  }
}

export class MongooseAdapter implements FullstackAdapter {
  id = 'orm-mongoose';
  kind = 'orm' as const;

  supports(context: FullstackGenerationContext): boolean {
    return (
      context.config.mode === 'fullstack' &&
      context.config.stack.database === 'mongodb' &&
      context.config.stack.orm === 'mongoose'
    );
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: 'mongoose',
          version: '^8.4.0',
          kind: 'runtime',
          source: 'orm-mongoose',
          target: 'backend',
        },
      ],
      files: [
        {
          path: 'backend/src/db/mongoose.ts',
          content: `import mongoose from 'mongoose';\n\nconst MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb';\n\nexport async function connectDB() {\n  try {\n    await mongoose.connect(MONGODB_URI);\n    console.log('MongoDB Connected Successfully');\n  } catch (error) {\n    console.error('MongoDB connection failure:', error);\n    process.exit(1);\n  }\n}\n`,
          source: 'orm-mongoose',
        },
        {
          path: 'backend/src/models/example.model.ts',
          content: `import { Schema, model } from 'mongoose';\n\ninterface IUser {\n  name: string;\n  email: string;\n}\n\nconst userSchema = new Schema<IUser>({\n  name: { type: String, required: true },\n  email: { type: String, required: true, unique: true },\n});\n\nexport const User = model<IUser>('User', userSchema);\n`,
          source: 'orm-mongoose',
        },
      ],
    };
  }
}

export class DockerAdapter implements FullstackAdapter {
  id = 'tooling-docker';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && !!context.config.tools.docker;
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      files: [
        {
          path: 'Dockerfile',
          content: `FROM node:20-alpine\nWORKDIR /app\nCOPY package.json package-lock.json* ./\nRUN npm install\nCOPY . .\nRUN npm run build\nEXPOSE 3000\nCMD ["npm", "run", "start"]\n`,
          source: 'tooling-docker',
        },
        {
          path: 'docker-compose.yml',
          content: `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n`,
          source: 'tooling-docker',
        },
      ],
    };
  }
}

export class EslintAdapter implements FullstackAdapter {
  id = 'tooling-eslint';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && !!context.config.tools.eslint;
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: 'eslint',
          version: '^8.56.0',
          kind: 'development',
          source: 'tooling-eslint',
          target: 'root',
        },
        {
          name: '@typescript-eslint/parser',
          version: '^6.21.0',
          kind: 'development',
          source: 'tooling-eslint',
          target: 'root',
        },
        {
          name: '@typescript-eslint/eslint-plugin',
          version: '^6.21.0',
          kind: 'development',
          source: 'tooling-eslint',
          target: 'root',
        },
      ],
      files: [
        {
          path: '.eslintrc.json',
          content: `{\n  "root": true,\n  "parser": "@typescript-eslint/parser",\n  "plugins": ["@typescript-eslint"],\n  "extends": [\n    "eslint:recommended",\n    "plugin:@typescript-eslint/recommended"\n  ],\n  "rules": {\n    "@typescript-eslint/no-unused-vars": [\n      "error",\n      {\n        "argsIgnorePattern": "^_",\n        "varsIgnorePattern": "^_"\n      }\n    ]\n  }\n}\n`,
          source: 'tooling-eslint',
        },
      ],
    };
  }
}

export class PrettierAdapter implements FullstackAdapter {
  id = 'tooling-prettier';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && !!context.config.tools.prettier;
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: 'prettier',
          version: '^3.2.0',
          kind: 'development',
          source: 'tooling-prettier',
          target: 'root',
        },
      ],
      files: [
        {
          path: '.prettierrc',
          content: `{\n  "semi": true,\n  "singleQuote": true,\n  "tabWidth": 2,\n  "trailingComma": "all"\n}\n`,
          source: 'tooling-prettier',
        },
      ],
    };
  }
}

export class GithubActionsAdapter implements FullstackAdapter {
  id = 'tooling-github-actions';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && !!context.config.tools.githubActions;
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      files: [
        {
          path: '.github/workflows/ci.yml',
          content: `name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: npm install\n      - run: npm run lint\n        if: hashFiles('.eslintrc.json') != ''\n      - run: npm run build\n`,
          source: 'tooling-github-actions',
        },
      ],
    };
  }
}

export class GitAdapter implements FullstackAdapter {
  id = 'tooling-git';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && !!context.config.tools.git;
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      files: [
        {
          path: '.gitignore',
          content: `node_modules\ndist\n.env\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\n.vercel\n.next\n`,
          source: 'tooling-git',
        },
      ],
    };
  }
}

export class EditorconfigAdapter implements FullstackAdapter {
  id = 'tooling-editorconfig';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && !!context.config.tools.editorconfig;
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      files: [
        {
          path: '.editorconfig',
          content: `root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\ncharset = utf-8\ntrim_trailing_whitespace = true\ninsert_final_newline = true\n`,
          source: 'tooling-editorconfig',
        },
      ],
    };
  }
}

export class TailwindAdapter implements FullstackAdapter {
  id = 'styling-tailwind';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && context.config.stack.styling === 'tailwind';
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: 'tailwindcss',
          version: '^3.4.0',
          kind: 'development',
          source: 'styling-tailwind',
          target: 'frontend',
        },
        {
          name: 'postcss',
          version: '^8.4.0',
          kind: 'development',
          source: 'styling-tailwind',
          target: 'frontend',
        },
        {
          name: 'autoprefixer',
          version: '^10.4.0',
          kind: 'development',
          source: 'styling-tailwind',
          target: 'frontend',
        },
      ],
      files: [
        {
          path: 'frontend/tailwind.config.js',
          content: `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: [\n    "./app/**/*.{js,ts,jsx,tsx}",\n    "./src/**/*.{js,ts,jsx,tsx}",\n    "./index.html"\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};\n`,
          source: 'styling-tailwind',
        },
        {
          path: 'frontend/postcss.config.js',
          content: `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`,
          source: 'styling-tailwind',
        },
      ],
    };
  }
}

export class MuiAdapter implements FullstackAdapter {
  id = 'styling-mui';
  kind = 'tooling' as const;

  supports(context: FullstackGenerationContext): boolean {
    return context.config.mode === 'fullstack' && context.config.stack.styling === 'mui';
  }

  contribute(_context: FullstackGenerationContext): FullstackContribution {
    return {
      dependencies: [
        {
          name: '@mui/material',
          version: '^6.0.0',
          kind: 'runtime',
          source: 'styling-mui',
          target: 'frontend',
        },
        {
          name: '@emotion/react',
          version: '^11.11.0',
          kind: 'runtime',
          source: 'styling-mui',
          target: 'frontend',
        },
        {
          name: '@emotion/styled',
          version: '^11.11.0',
          kind: 'runtime',
          source: 'styling-mui',
          target: 'frontend',
        },
      ],
      files: [
        {
          path: 'frontend/src/theme.ts',
          content: `import { createTheme } from '@mui/material/styles';\n\nexport const theme = createTheme({\n  palette: {\n    mode: 'light',\n    primary: {\n      main: '#2563eb',\n    },\n  },\n});\n`,
          source: 'styling-mui',
        },
      ],
    };
  }
}
