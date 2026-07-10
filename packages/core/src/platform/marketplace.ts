import path from 'path';
import fs from 'fs';
import { DetectedStack } from './stack-detector.js';
import { ProjectState } from './phase9.js';
import { PatchPlan, PatchOperation, MigrationGraph } from './phase9.js';

export interface Integration {
  id: string;
  name: string;
  category: string;
  compatibility: {
    frontends: string[];
    backends: string[];
  };
  dependencies: string[];
  devDependencies?: string[];
  generatedFiles: { path: string; content: string }[];
  envVars: { key: string; value: string; description: string }[];
  docsLink: string;
  installSteps: string[];
}

export const INTEGRATIONS_CATALOG: Integration[] = [
  // --- AUTHENTICATION ---
  {
    id: 'better-auth',
    name: 'Better Auth',
    category: 'auth',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['better-auth'],
    generatedFiles: [
      { path: 'lib/auth.ts', content: `import { betterAuth } from "better-auth";\nexport const auth = betterAuth({});\n` }
    ],
    envVars: [
      { key: 'BETTER_AUTH_SECRET', value: 'super-secret-key-123', description: 'Secret key for signing sessions' }
    ],
    docsLink: 'https://better-auth.com',
    installSteps: ['Install better-auth package', 'Configure lib/auth.ts', 'Add BETTER_AUTH_SECRET env variable']
  },
  {
    id: 'next-auth',
    name: 'NextAuth',
    category: 'auth',
    compatibility: { frontends: ['next'], backends: ['none', 'unknown'] },
    dependencies: ['next-auth'],
    generatedFiles: [
      { path: 'app/api/auth/[...nextauth]/route.ts', content: `import NextAuth from "next-auth";\nconst handler = NextAuth({});\nexport { handler as GET, handler as POST };\n` }
    ],
    envVars: [
      { key: 'NEXTAUTH_SECRET', value: 'nextauth-secret-key', description: 'Encryption secret for NextAuth sessions' }
    ],
    docsLink: 'https://next-auth.js.org',
    installSteps: ['Install next-auth package', 'Configure NextAuth API Route', 'Add NEXTAUTH_SECRET env variable']
  },
  {
    id: 'clerk',
    name: 'Clerk Auth',
    category: 'auth',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['none', 'unknown'] },
    dependencies: ['@clerk/nextjs'],
    generatedFiles: [
      { path: 'middleware.ts', content: `import { clerkMiddleware } from "@clerk/nextjs/server";\nexport default clerkMiddleware();\nexport const config = { matcher: ["/((?!.*\\\\..*|_next).*)", "/", "/(api|trpc)(.*)"] };\n` }
    ],
    envVars: [
      { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', value: 'pk_test_...', description: 'Clerk publishable api key' }
    ],
    docsLink: 'https://clerk.com',
    installSteps: ['Install @clerk/nextjs', 'Set up Clerk middleware.ts', 'Add publishable key to environment']
  },
  {
    id: 'supabase-auth',
    name: 'Supabase Auth',
    category: 'auth',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['@supabase/supabase-js'],
    generatedFiles: [
      { path: 'lib/supabase.ts', content: `import { createClient } from "@supabase/supabase-js";\nexport const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);\n` }
    ],
    envVars: [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://your-supabase-url.supabase.co', description: 'Supabase Project URL' },
      { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'anon-key-here', description: 'Supabase Anon Public API Key' }
    ],
    docsLink: 'https://supabase.com/docs/guides/auth',
    installSteps: ['Install supabase-js client', 'Configure lib/supabase.ts client', 'Add Supabase environment configs']
  },
  {
    id: 'firebase-auth',
    name: 'Firebase Auth',
    category: 'auth',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['firebase'],
    generatedFiles: [
      { path: 'lib/firebase.ts', content: `import { initializeApp } from "firebase/app";\nimport { getAuth } from "firebase/auth";\nconst app = initializeApp({});\nexport const auth = getAuth(app);\n` }
    ],
    envVars: [
      { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: 'api-key-here', description: 'Firebase Web SDK API Key' }
    ],
    docsLink: 'https://firebase.google.com/docs/auth',
    installSteps: ['Install firebase package', 'Configure lib/firebase.ts', 'Configure Firebase environment variables']
  },

  // --- PAYMENTS ---
  {
    id: 'stripe',
    name: 'Stripe Payments',
    category: 'payments',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['stripe', '@stripe/stripe-js'],
    generatedFiles: [
      { path: 'lib/stripe.ts', content: `import Stripe from 'stripe';\nexport const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });\n` }
    ],
    envVars: [
      { key: 'STRIPE_SECRET_KEY', value: 'sk_test_...', description: 'Stripe Secret API Key' }
    ],
    docsLink: 'https://stripe.com/docs',
    installSteps: ['Install stripe SDKs', 'Configure stripe client lib/stripe.ts', 'Add Stripe Secret API Key']
  },
  {
    id: 'lemon-squeezy',
    name: 'Lemon Squeezy',
    category: 'payments',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['@lemonsqueezy/lemonsqueezy.js'],
    generatedFiles: [
      { path: 'lib/lemonsqueezy.ts', content: `import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";\nlemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });\n` }
    ],
    envVars: [
      { key: 'LEMON_SQUEEZY_API_KEY', value: 'api_key_...', description: 'Lemon Squeezy API Key' }
    ],
    docsLink: 'https://docs.lemonsqueezy.com',
    installSteps: ['Install lemonsqueezy.js client sdk', 'Configure lemonsqueezy client lib/lemonsqueezy.ts', 'Add API Key']
  },

  // --- LOGGING ---
  {
    id: 'winston',
    name: 'Winston',
    category: 'logging',
    compatibility: { frontends: ['next'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['winston'],
    generatedFiles: [
      { path: 'lib/logger.ts', content: `import winston from 'winston';\nexport const logger = winston.createLogger({ transports: [new winston.transports.Console()] });\n` }
    ],
    envVars: [],
    docsLink: 'https://github.com/winstonjs/winston',
    installSteps: ['Install winston logging package', 'Configure log transporter lib/logger.ts']
  },
  {
    id: 'pino',
    name: 'Pino Logger',
    category: 'logging',
    compatibility: { frontends: ['next'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['pino'],
    generatedFiles: [
      { path: 'lib/logger.ts', content: `import pino from 'pino';\nexport const logger = pino();\n` }
    ],
    envVars: [],
    docsLink: 'https://getpino.io',
    installSteps: ['Install pino logging package', 'Configure logger logger.ts']
  },

  // --- MONITORING ---
  {
    id: 'sentry',
    name: 'Sentry Monitoring',
    category: 'monitoring',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['@sentry/nextjs'],
    generatedFiles: [
      { path: 'sentry.client.config.js', content: `import * as Sentry from "@sentry/nextjs";\nSentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN });\n` }
    ],
    envVars: [
      { key: 'NEXT_PUBLIC_SENTRY_DSN', value: 'https://...@sentry.io/...', description: 'Sentry Data Source Name' }
    ],
    docsLink: 'https://sentry.io',
    installSteps: ['Install @sentry/nextjs SDK', 'Create client config file sentry.client.config.js', 'Add Sentry DSN']
  },

  // --- CACHE ---
  {
    id: 'redis',
    name: 'Redis Cache',
    category: 'cache',
    compatibility: { frontends: ['next'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['ioredis'],
    generatedFiles: [
      { path: 'lib/redis.ts', content: `import Redis from 'ioredis';\nexport const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');\n` }
    ],
    envVars: [
      { key: 'REDIS_URL', value: 'redis://localhost:6379', description: 'Redis Connection Connection URL' }
    ],
    docsLink: 'https://redis.io',
    installSteps: ['Install ioredis client package', 'Configure lib/redis.ts connector client', 'Add REDIS_URL']
  },

  // --- QUEUE ---
  {
    id: 'bullmq',
    name: 'BullMQ Queue',
    category: 'queue',
    compatibility: { frontends: ['next'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['bullmq'],
    generatedFiles: [
      { path: 'lib/queue.ts', content: `import { Queue } from 'bullmq';\nexport const taskQueue = new Queue('tasks', { connection: { host: 'localhost', port: 6379 } });\n` }
    ],
    envVars: [],
    docsLink: 'https://bullmq.io',
    installSteps: ['Install bullmq', 'Set up task queue helper lib/queue.ts']
  },

  // --- EMAIL ---
  {
    id: 'resend',
    name: 'Resend',
    category: 'email',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['resend'],
    generatedFiles: [
      { path: 'lib/email.ts', content: `import { Resend } from 'resend';\nexport const resend = new Resend(process.env.RESEND_API_KEY);\n` }
    ],
    envVars: [
      { key: 'RESEND_API_KEY', value: 're_...', description: 'Resend API Key' }
    ],
    docsLink: 'https://resend.com',
    installSteps: ['Install resend client package', 'Configure client lib/email.ts', 'Add RESEND_API_KEY env']
  },

  // --- STORAGE ---
  {
    id: 's3',
    name: 'AWS S3 Storage',
    category: 'storage',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['@aws-sdk/client-s3'],
    generatedFiles: [
      { path: 'lib/s3.ts', content: `import { S3Client } from '@aws-sdk/client-s3';\nexport const s3 = new S3Client({ region: process.env.AWS_REGION });\n` }
    ],
    envVars: [
      { key: 'AWS_REGION', value: 'us-east-1', description: 'AWS S3 region' }
    ],
    docsLink: 'https://aws.amazon.com/s3/',
    installSteps: ['Install S3 client package SDK', 'Configure lib/s3.ts client', 'Add AWS region variable']
  },

  // --- VALIDATION ---
  {
    id: 'zod',
    name: 'Zod Validation',
    category: 'validation',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['express', 'nest', 'none', 'unknown'] },
    dependencies: ['zod'],
    generatedFiles: [
      { path: 'schemas/index.ts', content: `import { z } from 'zod';\nexport const UserSchema = z.object({ id: z.string(), email: z.string().email() });\n` }
    ],
    envVars: [],
    docsLink: 'https://zod.dev',
    installSteps: ['Install zod schema library', 'Create standard user model schemas/index.ts']
  },

  // --- ANALYTICS ---
  {
    id: 'posthog',
    name: 'PostHog Analytics',
    category: 'analytics',
    compatibility: { frontends: ['next', 'vite-react'], backends: ['none', 'unknown'] },
    dependencies: ['posthog-js'],
    generatedFiles: [
      { path: 'lib/posthog.ts', content: `import posthog from 'posthog-js';\nif (typeof window !== 'undefined') { posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, { api_host: 'https://app.posthog.com' }); }\nexport { posthog };\n` }
    ],
    envVars: [
      { key: 'NEXT_PUBLIC_POSTHOG_KEY', value: 'phc_...', description: 'PostHog API Token' }
    ],
    docsLink: 'https://posthog.com',
    installSteps: ['Install posthog-js SDK client', 'Create init module lib/posthog.ts', 'Add token config to environment']
  }
];

export const CATEGORIES_LIST = [
  'auth',
  'payments',
  'logging',
  'monitoring',
  'cache',
  'queue',
  'email',
  'storage',
  'validation',
  'analytics',
  'database',
  'orm'
];

export function getIntegrationsForCategory(category: string, stack: DetectedStack): Integration[] {
  const normalizedCategory = category.toLowerCase().trim();
  
  // Filter catalog integrations by category and stack compatibility
  return INTEGRATIONS_CATALOG.filter((integration) => {
    if (integration.category !== normalizedCategory) {
      return false;
    }
    
    // Check compatibility: matching frontend framework
    const frontendMatch = integration.compatibility.frontends.includes(stack.frontend) ||
                          integration.compatibility.frontends.includes('unknown');
    
    // Check compatibility: matching backend framework
    const backendMatch = integration.compatibility.backends.includes(stack.backend) ||
                         integration.compatibility.backends.includes('unknown');
                         
    return frontendMatch || backendMatch;
  });
}

function buildMigrationGraph(operation: string, operations: PatchOperation[]): MigrationGraph {
  return {
    version: '1.0.0',
    operation,
    nodes: operations.map((patch) => ({
      id: `migration-${patch.id}`,
      type: patch.targetPath === 'package.json' ? 'dependency' : 'module',
      dependsOn: [],
      preconditions: [],
      affectedFiles: [patch.targetPath],
      rollbackActions: [`Revert changes to ${patch.targetPath}`],
      risk: 'low',
      verificationSteps: [`Verify ${patch.targetPath}`]
    }))
  };
}

export function buildIntegrationPatchPlan(
  projectPath: string,
  integration: Integration,
  _state: ProjectState
): PatchPlan {
  const operations: PatchOperation[] = [];
  const conflicts: PatchPlan['conflicts'] = [];
  
  // 1. Plan environment variable insertions into .env.example
  if (integration.envVars.length > 0) {
    const envPath = '.env.example';
    const absoluteEnvPath = path.join(projectPath, envPath);
    const exists = fs.existsSync(absoluteEnvPath);
    const currentContent = exists ? fs.readFileSync(absoluteEnvPath, 'utf8') : '';
    
    let appendLines = '';
    for (const v of integration.envVars) {
      if (!currentContent.includes(`${v.key}=`)) {
        appendLines += `# ${v.description}\n${v.key}=${v.value}\n`;
      }
    }
    
    if (appendLines) {
      operations.push({
        id: `append-${envPath}`,
        type: 'append-file',
        targetPath: envPath,
        description: `Append env configs for ${integration.name}`,
        appendContent: appendLines,
        conflictPolicy: 'merge'
      });
    }
  }
  
  // 2. Plan files creation
  for (const file of integration.generatedFiles) {
    const absoluteFilePath = path.join(projectPath, file.path);
    const exists = fs.existsSync(absoluteFilePath);
    if (exists) {
      conflicts.push({
        code: 'PATCH_CONFLICT',
        message: `File already exists with conflicting contents: ${file.path}`,
        path: file.path
      });
    } else {
      operations.push({
        id: `create-${file.path}`,
        type: 'create-file',
        targetPath: file.path,
        description: `Generate ${file.path} for ${integration.name} setup`,
        content: file.content,
        conflictPolicy: 'error'
      });
    }
  }
  
  // 3. Plan package.json dependencies modifications
  const dependencyChanges: PatchPlan['dependencyChanges'] = [];
  for (const dep of integration.dependencies) {
    dependencyChanges.push({
      section: 'dependencies',
      name: dep,
      to: 'latest'
    });
  }
  
  if (integration.devDependencies) {
    for (const devDep of integration.devDependencies) {
      dependencyChanges.push({
        section: 'devDependencies',
        name: devDep,
        to: 'latest'
      });
    }
  }
  
  // Add package.json update operation if dependencies changed
  if (dependencyChanges.length > 0) {
    const packageJsonPath = 'package.json';
    const absolutePackageJsonPath = path.join(projectPath, packageJsonPath);
    if (fs.existsSync(absolutePackageJsonPath)) {
      const pkgObj = JSON.parse(fs.readFileSync(absolutePackageJsonPath, 'utf8'));
      if (!pkgObj.dependencies) pkgObj.dependencies = {};
      
      for (const change of dependencyChanges) {
        if (change.section === 'dependencies') {
          pkgObj.dependencies[change.name] = change.to;
        } else if (change.section === 'devDependencies') {
          if (!pkgObj.devDependencies) pkgObj.devDependencies = {};
          pkgObj.devDependencies[change.name] = change.to;
        }
      }
      
      operations.push({
        id: 'update-package-json',
        type: 'update-file',
        targetPath: packageJsonPath,
        description: `Install dependencies for ${integration.name}`,
        content: JSON.stringify(pkgObj, null, 2) + '\n',
        conflictPolicy: 'merge'
      });
    }
  }

  // 4. Update structify.manifest.json metadata if present
  const manifestPath = 'structify.manifest.json';
  const absoluteManifestPath = path.join(projectPath, manifestPath);
  if (fs.existsSync(absoluteManifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));
      if (!manifest.modules) manifest.modules = [];
      if (!manifest.modules.includes(integration.id)) {
        manifest.modules.push(integration.id);
        operations.push({
          id: 'update-manifest',
          type: 'update-file',
          targetPath: manifestPath,
          description: `Update modules list in ${manifestPath}`,
          content: JSON.stringify(manifest, null, 2) + '\n',
          conflictPolicy: 'merge'
        });
      }
    } catch {
      // Ignore if unparseable
    }
  }

  // 5. Update structify.project-graph.json metadata if present
  const graphPath = 'structify.project-graph.json';
  const absoluteGraphPath = path.join(projectPath, graphPath);
  if (fs.existsSync(absoluteGraphPath)) {
    try {
      const graph = JSON.parse(fs.readFileSync(absoluteGraphPath, 'utf8'));
      if (!graph.nodes) graph.nodes = [];
      const nodeExists = graph.nodes.some((n: any) => n.id === `module:${integration.id}`);
      if (!nodeExists) {
        graph.nodes.push({
          id: `module:${integration.id}`,
          type: 'module',
          label: integration.name,
          properties: {
            category: integration.category,
            dependencies: integration.dependencies
          }
        });
        operations.push({
          id: 'update-project-graph',
          type: 'update-file',
          targetPath: graphPath,
          description: `Register node in structify.project-graph.json`,
          content: JSON.stringify(graph, null, 2) + '\n',
          conflictPolicy: 'merge'
        });
      }
    } catch {
      // Ignore
    }
  }

  return {
    id: `add-integration-${integration.id}`,
    description: `Add marketplace integration ${integration.name}`,
    operations,
    conflicts,
    dependencyChanges,
    filesChanged: operations.map(op => op.targetPath),
    migrationGraph: buildMigrationGraph(`add-integration-${integration.id}`, operations),
    dryRun: false
  };
}
