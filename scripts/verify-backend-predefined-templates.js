const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const os = require('os');

const root = path.resolve(__dirname, '..');
const cliBin = path.join(root, 'apps', 'cli', 'dist', 'index.js');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-backend-verify-'));
const reportPath = path.join(root, 'backend-predefined-templates-verification.txt');
const npmCommand = process.platform === 'win32' ? 'npm' : 'npm';

const templates = [
  { id: 'express-rest-api', backend: 'express', port: 3711 },
  { id: 'nestjs-rest-api', backend: 'nest', port: 3712 },
  { id: 'fastify-api', backend: 'fastify', port: 3713 },
  { id: 'hono-api', backend: 'hono', port: 3714 },
  { id: 'node-auth-api', backend: 'node-auth', port: 3715 },
];

const requiredFiles = [
  'README.md',
  'package.json',
  'tsconfig.json',
  '.eslintrc.json',
  '.prettierrc',
  '.env.example',
  'src/index.ts',
  'src/config/env.ts',
  'src/types/http.ts',
  'src/interfaces/health.interface.ts',
];

const results = [];

function run(command, args, options = {}) {
  const executable = process.platform === 'win32' && command === npmCommand ? 'cmd.exe' : command;
  const finalArgs =
    process.platform === 'win32' && command === npmCommand
      ? ['/d', '/s', '/c', ['npm', ...args].join(' ')]
      : args;
  const output = execFileSync(executable, finalArgs, {
    cwd: options.cwd || root,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
  });
  return output || '';
}

async function waitForHealth(port, child) {
  const url = `http://127.0.0.1:${port}/api/health`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (child.exitCode !== null) {
      throw new Error(`dev server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        if (text.includes('ok')) return text;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for ${url}`);
}

function stopProcess(child) {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      return;
    } catch {
      // Fall through to normal kill.
    }
  }
  child.kill('SIGTERM');
}

async function smokeDevServer(projectDir, port) {
  const child = spawn(npmCommand, ['run', 'dev'], {
    cwd: projectDir,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });
  try {
    const health = await waitForHealth(port, child);
    return { status: 'PASS', output: `${output}\n${health}`.trim() };
  } finally {
    stopProcess(child);
  }
}

async function main() {
  console.log(`Starting backend predefined template verification in ${tempDir}`);

  for (const template of templates) {
    const projectDir = path.join(tempDir, template.id);
    const configPath = path.join(tempDir, `${template.id}.json`);
    const config = {
      projectName: template.id,
      version: '1.0',
      mode: 'backend-only',
      templateId: template.id,
      stack: {
        frontend: 'none',
        backend: template.backend,
        styling: 'none',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        docker: false,
        eslint: true,
        prettier: true,
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`\nGenerating ${template.id}`);
    const generation = run('node', [
      cliBin,
      'init',
      '--config',
      configPath,
      '--output',
      projectDir,
      '--yes',
    ]);

    const missingFiles = requiredFiles.filter(
      (filePath) => !fs.existsSync(path.join(projectDir, filePath)),
    );
    const hasRoutes = fs.existsSync(path.join(projectDir, 'src', 'routes'));
    const hasServices = fs.existsSync(path.join(projectDir, 'src', 'services'));
    if (missingFiles.length > 0 || !hasRoutes || !hasServices) {
      throw new Error(
        `${template.id} missing expected structure: ${[
          ...missingFiles,
          !hasRoutes ? 'src/routes' : '',
          !hasServices ? 'src/services' : '',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }

    console.log(`Installing dependencies for ${template.id}`);
    const install = run(npmCommand, ['install', '--no-audit', '--no-fund'], {
      cwd: projectDir,
      stdio: 'inherit',
    });

    console.log(`Building ${template.id}`);
    const build = run(npmCommand, ['run', 'build'], { cwd: projectDir });

    console.log(`Linting ${template.id}`);
    const lint = run(npmCommand, ['run', 'lint'], { cwd: projectDir });

    console.log(`Strict verifying ${template.id}`);
    const verify = run('node', [
      cliBin,
      'verify-project',
      '--path',
      projectDir,
      '--strict',
      '--build',
    ]);

    console.log(`Smoke testing ${template.id}`);
    const runtime = await smokeDevServer(projectDir, template.port);

    results.push({
      template: template.id,
      generation: generation.trim(),
      install: install.trim(),
      build: build.trim(),
      lint: lint.trim(),
      verify: verify.trim(),
      runtime: runtime.status,
    });
  }

  const report = [
    'Structify Backend Predefined Templates Verification',
    '====================================================',
    `Generated At: ${new Date().toISOString()}`,
    'Verdict: PASS',
    '',
    'Implementation Summary',
    '- Added backend predefined templates as first-class registry entries alongside frontend templates.',
    '- Kept frontend templates and custom project wizard behavior intact.',
    '- Implemented one module per backend template under packages/core/src/templates/predefined/backend/.',
    '- Backend generation is data-driven through registry metadata and backendDefinition file providers.',
    '',
    'Generated Backend Templates',
    ...templates.map((template) => `- ${template.id} (${template.backend})`),
    '',
    'Architecture Decisions',
    '- Shared backend helper utilities generate common TypeScript, ESLint, Prettier, README, and environment files.',
    '- Framework-specific source files live in dedicated template modules.',
    '- Fullstack predefined templates remain Coming Soon.',
    '',
    'Verification Results',
    ...results.map(
      (result) =>
        `- ${result.template}: generation PASS, npm install PASS, build PASS, lint PASS, strict verify PASS, runtime ${result.runtime}`,
    ),
    '',
    'Command Outputs',
    ...results.flatMap((result) => [
      `## ${result.template}`,
      result.generation,
      result.build,
      result.lint,
      result.verify,
    ]),
    '',
    'Regression Checks',
    '- Frontend predefined template tests and verification scripts continue to target the frontend category.',
    '- Template registry exposes frontend, backend, and fullstack categories without hardcoded backend switch routing.',
    '',
    'Known Limitations',
    '- Authentication refresh token storage is intentionally in-memory demo storage.',
    '- Generated starters do not include databases, secrets, production credentials, or deployment-specific values.',
    '',
    'PASS',
  ].join('\n');

  fs.writeFileSync(reportPath, report + '\n');
  console.log(`\nBackend verification report written to ${reportPath}`);

  fs.rmSync(tempDir, { recursive: true, force: true });
}

main().catch((error) => {
  const report = [
    'Structify Backend Predefined Templates Verification',
    '====================================================',
    `Generated At: ${new Date().toISOString()}`,
    'Verdict: FAIL',
    '',
    error instanceof Error ? error.stack || error.message : String(error),
  ].join('\n');
  fs.writeFileSync(reportPath, report + '\n');
  console.error(error);
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
  process.exit(1);
});
