import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GenerationSession } from './session.js';
import { GenerationEngine } from './engine.js';
import { ExecutionGraph } from './graph.js';
import { NormalizedProjectConfig, PlanStep } from '../types/index.js';
import { createProjectPlan } from '../planning/index.js';
import { MockCommandExecutor } from './executor.js';

const baseTools = {
  docker: false,
  eslint: true,
  prettier: true,
  githubActions: false,
  git: false,
  editorconfig: true,
  husky: false,
  lintStaged: false,
  commitlint: false,
};

describe('Generation Engine & Project Scaffolding', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(
      os.tmpdir(),
      `structify-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('GenerationSession should serialize lifecycle state deterministically', () => {
    const config: NormalizedProjectConfig = {
      projectName: 'session-app',
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'none',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: baseTools,
    };
    const graph = new ExecutionGraph();
    const session = new GenerationSession({ config, context: {}, graph, targetDir: tmpDir });

    session.addDiagnostic('created session');
    session.registerGeneratedFile('package.json');
    session.registerSkippedFile('README.md');
    session.recordCommand({
      commandLine: 'git init',
      code: 0,
      stdout: '',
      stderr: '',
      durationMs: 1,
    });
    session.updateProgress(150);
    session.end();

    const serialized = session.serialize();
    expect(serialized.success).toBe(true);
    expect(serialized.generatedFiles).toEqual(['package.json']);
    expect(serialized.skippedFiles).toEqual(['README.md']);
    expect(serialized.executedCommands[0].commandLine).toBe('git init');
    expect(serialized.progress).toBe(100);
  });

  it('should run dry-run project plan and create absolutely nothing', async () => {
    const config: NormalizedProjectConfig = {
      projectName: 'dryrun-app',
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        ...baseTools,
        docker: true,
      },
    };

    const plan = createProjectPlan('dryrun-app', config);
    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));

    const session = new GenerationSession({
      config,
      context: {},
      graph,
      dryRun: true,
      targetDir: path.join(tmpDir, 'dryrun-app'),
    });

    const res = await GenerationEngine.execute(session);
    expect(res.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'dryrun-app'))).toBe(false);
  });

  it('should successfully scaffold Next + Tailwind structure', async () => {
    const config: NormalizedProjectConfig = {
      projectName: 'next-tailwind',
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        ...baseTools,
        docker: false,
      },
    };

    const plan = createProjectPlan('next-tailwind', config);
    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));

    const targetDir = path.join(tmpDir, 'next-tailwind');
    const session = new GenerationSession({
      config,
      context: {},
      graph,
      dryRun: false,
      targetDir,
    });

    const res = await GenerationEngine.execute(session);
    expect(res.success).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'app/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'tailwind.config.js'))).toBe(true);
  });

  it('should successfully scaffold Vite + MUI structure', async () => {
    const config: NormalizedProjectConfig = {
      projectName: 'vite-mui',
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'vite-react',
        backend: 'none',
        styling: 'mui',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        ...baseTools,
        docker: false,
      },
    };

    const plan = createProjectPlan('vite-mui', config);
    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));

    const targetDir = path.join(tmpDir, 'vite-mui');
    const session = new GenerationSession({
      config,
      context: {},
      graph,
      dryRun: false,
      targetDir,
    });

    const res = await GenerationEngine.execute(session);
    expect(res.success).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'vite.config.ts'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'src/App.tsx'))).toBe(true);
    const appContent = fs.readFileSync(path.join(targetDir, 'src/App.tsx'), 'utf8');
    expect(appContent).toContain('@mui/material');
  });

  it('should fail scaffolding if target directory exists and is non-empty', async () => {
    const config: NormalizedProjectConfig = {
      projectName: 'non-empty',
      version: '1.0',
      mode: 'backend-only',
      language: 'typescript',
      stack: {
        frontend: 'none',
        backend: 'express',
        styling: 'none',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        ...baseTools,
        docker: false,
      },
    };

    const targetDir = path.join(tmpDir, 'non-empty');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'user-file.txt'), 'content');

    const plan = createProjectPlan('non-empty', config);
    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));

    const session = new GenerationSession({
      config,
      context: {},
      graph,
      dryRun: false,
      targetDir,
    });

    const res = await GenerationEngine.execute(session);
    expect(res.success).toBe(false);
    expect(res.errors).toContain(
      `Target directory "${targetDir}" exists and is not empty. Use --force to proceed.`,
    );
  });

  it('should rollback generated files after simulated failure in step', async () => {
    const config: NormalizedProjectConfig = {
      projectName: 'rollback-test',
      version: '1.0',
      mode: 'backend-only',
      language: 'typescript',
      stack: {
        frontend: 'none',
        backend: 'express',
        styling: 'none',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        ...baseTools,
        docker: false,
      },
    };

    const targetDir = path.join(tmpDir, 'rollback-test');

    const plan = createProjectPlan('rollback-test', config);
    const failingStep: PlanStep = {
      id: 'step-fail',
      type: 'RunCommand',
      targetPath: `./rollback-test`,
      description: 'Failing command simulation',
      commandStep: {
        commandLine: 'node -e "process.exit(1)"',
        cwd: `./rollback-test`,
      },
    };

    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));
    graph.addNode(failingStep, ['step-scaffold-project']);

    const session = new GenerationSession({
      config,
      context: {},
      graph,
      dryRun: false,
      targetDir,
    });

    const mockExec = new MockCommandExecutor();
    mockExec.mockResponse = { code: 1, stdout: '', stderr: 'Simulated command failure' };

    const res = await GenerationEngine.execute(session, { install: true, executor: mockExec });
    expect(res.success).toBe(false);
    expect(fs.existsSync(targetDir)).toBe(false);
  });

  it.each([
    {
      name: 'Express only',
      config: {
        projectName: 'express-only',
        version: '1.0',
        mode: 'backend-only',
        language: 'typescript',
        stack: {
          frontend: 'none',
          backend: 'express',
          styling: 'none',
          database: 'none',
          orm: 'none',
          packageManager: 'npm',
        },
        tools: baseTools,
      } satisfies NormalizedProjectConfig,
      files: ['src/index.ts', 'src/app.ts', 'src/routes/health.route.ts'],
    },
    {
      name: 'Nest only',
      config: {
        projectName: 'nest-only',
        version: '1.0',
        mode: 'backend-only',
        language: 'typescript',
        stack: {
          frontend: 'none',
          backend: 'nest',
          styling: 'none',
          database: 'none',
          orm: 'none',
          packageManager: 'npm',
        },
        tools: baseTools,
      } satisfies NormalizedProjectConfig,
      files: ['src/main.ts', 'src/app.module.ts', 'src/app.controller.ts'],
    },
    {
      name: 'Next + Express fullstack',
      config: {
        projectName: 'next-express',
        version: '1.0',
        mode: 'fullstack',
        language: 'typescript',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'none',
          orm: 'none',
          packageManager: 'npm',
        },
        tools: baseTools,
      } satisfies NormalizedProjectConfig,
      files: ['frontend/app/page.tsx', 'backend/src/app.ts', 'backend/tsconfig.json'],
    },
    {
      name: 'Vite + Express fullstack',
      config: {
        projectName: 'vite-express',
        version: '1.0',
        mode: 'fullstack',
        language: 'typescript',
        stack: {
          frontend: 'vite-react',
          backend: 'express',
          styling: 'mui',
          database: 'none',
          orm: 'none',
          packageManager: 'npm',
        },
        tools: baseTools,
      } satisfies NormalizedProjectConfig,
      files: ['frontend/src/main.tsx', 'frontend/src/theme.ts', 'backend/src/app.ts'],
    },
    {
      name: 'Postgres + Prisma',
      config: {
        projectName: 'postgres-prisma',
        version: '1.0',
        mode: 'backend-only',
        language: 'typescript',
        stack: {
          frontend: 'none',
          backend: 'express',
          styling: 'none',
          database: 'postgres',
          orm: 'prisma',
          packageManager: 'npm',
        },
        tools: baseTools,
      } satisfies NormalizedProjectConfig,
      files: ['prisma/schema.prisma', 'src/db/prisma.ts', '.env.example'],
    },
    {
      name: 'MongoDB + Mongoose',
      config: {
        projectName: 'mongodb-mongoose',
        version: '1.0',
        mode: 'backend-only',
        language: 'typescript',
        stack: {
          frontend: 'none',
          backend: 'express',
          styling: 'none',
          database: 'mongodb',
          orm: 'mongoose',
          packageManager: 'npm',
        },
        tools: baseTools,
      } satisfies NormalizedProjectConfig,
      files: ['src/db/mongoose.ts', 'src/models/example.model.ts', '.env.example'],
    },
  ])('should generate real project files for $name', async ({ config, files }) => {
    const targetDir = path.join(tmpDir, config.projectName);
    const plan = createProjectPlan(config.projectName, config);
    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));

    const session = new GenerationSession({
      config,
      context: {},
      graph,
      dryRun: false,
      targetDir,
    });

    const res = await GenerationEngine.execute(session);

    expect(res.success).toBe(true);
    for (const file of files) {
      expect(fs.existsSync(path.join(targetDir, file))).toBe(true);
    }
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'),
    ) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts).toBeDefined();
  });

  it('should generate Docker and GitHub Actions tooling files', async () => {
    const config: NormalizedProjectConfig = {
      projectName: 'tooling-enabled',
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'vite-react',
        backend: 'none',
        styling: 'none',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        ...baseTools,
        docker: true,
        githubActions: true,
        husky: true,
        lintStaged: true,
        commitlint: true,
      },
    };
    const targetDir = path.join(tmpDir, config.projectName);
    const plan = createProjectPlan(config.projectName, config);
    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));
    const session = new GenerationSession({ config, context: {}, graph, targetDir });

    const res = await GenerationEngine.execute(session);

    expect(res.success).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'Dockerfile'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.github/workflows/ci.yml'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.lintstagedrc.json'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'commitlint.config.js'))).toBe(true);
  });

  it('should serialize JSON metadata with generated files and skipped install command', async () => {
    const config: NormalizedProjectConfig = {
      projectName: 'json-output',
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: baseTools,
    };
    const targetDir = path.join(tmpDir, config.projectName);
    const plan = createProjectPlan(config.projectName, config);
    const graph = new ExecutionGraph();
    plan.steps.forEach((s) => graph.addNode(s, []));
    const session = new GenerationSession({
      config,
      context: {},
      graph,
      targetDir,
      jsonMode: true,
    });

    const res = await GenerationEngine.execute(session);

    expect(res.success).toBe(true);
    expect(res.generatedFiles).toContain('package.json');
    expect(res.executedCommands).toHaveLength(0);
    expect(res.diagnostics.some((entry) => entry.message.includes('Skipping dependency'))).toBe(
      true,
    );
  });
});
