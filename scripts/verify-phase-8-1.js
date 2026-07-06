const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'phase-8-1-verification-report.txt');
const tempRoot = path.join(os.tmpdir(), `structify-phase-8-1-${Date.now()}`);
const cliBin = path.join(root, 'apps', 'cli', 'dist', 'index.js');
fs.mkdirSync(tempRoot, { recursive: true });

const sections = [];
let failed = false;

function run(title, command, options = {}) {
  console.log(`Running check: ${title}...`);
  const started = new Date().toISOString();
  try {
    const output = execSync(command, {
      cwd: options.cwd || root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    const pass = options.expectFailure ? false : true;
    if (!pass) failed = true;
    sections.push({ title, command, started, status: pass ? 'PASS' : 'FAIL', output });
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}${error.message || ''}`;
    const pass = options.expectFailure === true;
    if (!pass) failed = true;
    sections.push({ title, command, started, status: pass ? 'PASS' : 'FAIL', output });
  }
}

function writeConfig(name, config) {
  const filePath = path.join(tempRoot, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

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

const configs = {
  nextTailwind: {
    projectName: 'next-tailwind',
    version: '1.0',
    mode: 'frontend-only',
    stack: {
      frontend: 'next',
      backend: 'none',
      styling: 'tailwind',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: baseTools,
  },
  viteMui: {
    projectName: 'vite-mui',
    version: '1.0',
    mode: 'frontend-only',
    stack: {
      frontend: 'vite-react',
      backend: 'none',
      styling: 'mui',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: baseTools,
  },
  express: {
    projectName: 'express-api',
    version: '1.0',
    mode: 'backend-only',
    stack: {
      frontend: 'none',
      backend: 'express',
      styling: 'none',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: baseTools,
  },
  nest: {
    projectName: 'nest-api',
    version: '1.0',
    mode: 'backend-only',
    stack: {
      frontend: 'none',
      backend: 'nest',
      styling: 'none',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: baseTools,
  },
  fullstack: {
    projectName: 'next-express',
    version: '1.0',
    mode: 'fullstack',
    stack: {
      frontend: 'next',
      backend: 'express',
      styling: 'tailwind',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: baseTools,
  },
  prisma: {
    projectName: 'prisma-app',
    version: '1.0',
    mode: 'backend-only',
    stack: {
      frontend: 'none',
      backend: 'express',
      styling: 'none',
      database: 'postgres',
      orm: 'prisma',
      packageManager: 'npm',
    },
    tools: baseTools,
  },
  mongoose: {
    projectName: 'mongoose-app',
    version: '1.0',
    mode: 'backend-only',
    stack: {
      frontend: 'none',
      backend: 'express',
      styling: 'none',
      database: 'mongodb',
      orm: 'mongoose',
      packageManager: 'npm',
    },
    tools: baseTools,
  },
  dockerCi: {
    projectName: 'docker-ci',
    version: '1.0',
    mode: 'frontend-only',
    stack: {
      frontend: 'vite-react',
      backend: 'none',
      styling: 'none',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: { ...baseTools, docker: true, githubActions: true },
  },
};

const configFiles = Object.fromEntries(
  Object.entries(configs).map(([name, config]) => [name, writeConfig(name, config)]),
);

sections.push({
  title: 'Environment',
  command: 'node/npm/os metadata',
  started: new Date().toISOString(),
  status: 'PASS',
  output: JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      os: os.platform(),
      architecture: os.arch(),
      node: process.version,
      npm: execSync('npm --version', { encoding: 'utf8' }).trim(),
      workspace: root,
    },
    null,
    2,
  ),
});

for (const doc of [
  'phase_8_1_hardening.md',
  'generator_composition.md',
  'dependency_graph.md',
  'testing_strategy.md',
]) {
  run(`Documentation check: ${doc}`, `node -e "require('fs').accessSync('docs/${doc}')"`);
}

run('Dependency Status', 'npm ls --workspaces --depth=0 --package-lock=false');
run('Zero-Warning Lint', 'npm run lint');
run('Format Check', 'npm run format:check');
run('Typecheck', 'npm run typecheck');
run('Full Test Suite', 'npm test');
run('Build', 'npm run build');

run(
  'Focused Verification: composable generator tests',
  'npx vitest run packages/core/src/generation/composable.spec.ts -t "composes MVP"',
);
run(
  'Focused Verification: dependency resolver tests',
  'npx vitest run packages/core/src/generation/composable.spec.ts -t "resolves dependencies"',
);
run(
  'Focused Verification: Project Graph tests',
  'npx vitest run packages/core/src/generation/composable.spec.ts -t "Project Graph|projectGraph"',
);
run(
  'Focused Verification: template logic reduction tests',
  "node -e \"const fs=require('fs'); const src=fs.readFileSync('packages/core/src/generation/composable.ts','utf8'); if(!src.includes('selectGenerators')) process.exit(1)\"",
);
run(
  'Focused Verification: service container tests',
  'npx vitest run packages/core/src/generation/composable.spec.ts -t "services"',
);
run(
  'Focused Verification: structural project validation tests',
  'npx vitest run packages/core/src/generation/composable.spec.ts -t "structurally validates"',
);
run(
  'Focused Verification: snapshot tests',
  'npx vitest run packages/core/src/generation/composable.spec.ts -t "snapshots"',
);
run(
  'Focused Verification: benchmark analytics tests',
  'npx vitest run packages/core/src/generation/composable.spec.ts -t "analytics"',
);

for (const [name, configPath] of Object.entries(configFiles)) {
  const output = path.join(tempRoot, `out-${name}`);
  run(
    `Scaffold integration: ${name}`,
    `node ${cliBin} init --config ${configPath} --yes --output ${output} --verify`,
  );
  run(`Inspect integration: ${name}`, `node ${cliBin} --json inspect`, { cwd: output });
  run(`Structural validation: ${name}`, `node ${cliBin} verify-project --path ${output}`);
}

const dryRunOut = path.join(tempRoot, 'dry-run-output');
run(
  'Dry-run creates nothing and reports diff',
  `node ${cliBin} init --config ${configFiles.nextTailwind} --dry-run --json --output ${dryRunOut}`,
);
run(
  'Dry-run filesystem check',
  `node -e "if(require('fs').existsSync('${dryRunOut.replace(/\\/g, '\\\\')}')) process.exit(1)"`,
);

const conflictDir = path.join(tempRoot, 'conflict');
fs.mkdirSync(conflictDir, { recursive: true });
fs.writeFileSync(path.join(conflictDir, 'existing.txt'), 'existing');
run(
  'Conflict detection existing non-empty directory',
  `node ${cliBin} init --config ${configFiles.express} --yes --output ${conflictDir}`,
  { expectFailure: true },
);

run('Package binary check', `node ${cliBin} --help`);

const report = [
  'Structify Phase 8.1 Verification Report',
  '='.repeat(80),
  `Final status: ${failed ? 'FAIL' : 'PASS'}`,
  '',
  ...sections.map((section) =>
    [
      '='.repeat(80),
      `SECTION: ${section.title}`,
      `Command: ${section.command}`,
      `Timestamp: ${section.started}`,
      `Status: ${section.status}`,
      '='.repeat(80),
      section.output,
      '',
    ].join('\n'),
  ),
  '='.repeat(80),
  'VERIFICATION SUMMARY',
  `All Verification Steps Passed: ${failed ? 'NO' : 'YES'}`,
  `Report compiled to: ${reportPath}`,
].join('\n');

fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Report compiled to: ${reportPath}`);
if (failed) process.exit(1);
