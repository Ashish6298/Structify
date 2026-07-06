const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'phase-8-verification-report.txt');

function append(text) {
  fs.appendFileSync(REPORT_PATH, text);
}

function runCheck(title, command, options = {}) {
  console.log(`Running check: ${title}...`);
  let output = '';
  let status = 'PASS';
  try {
    output = execSync(command, {
      cwd: options.cwd ?? ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: options.timeout ?? 120000,
    });
    if (options.expectFailure) status = 'FAIL';
  } catch (error) {
    output = `${error.stdout ?? ''}\n${error.stderr ?? ''}\n${error.message}`;
    status = options.expectFailure ? 'PASS' : 'FAIL';
  }
  append(`
================================================================================
SECTION: ${title}
Command: ${command}
Timestamp: ${new Date().toISOString()}
Status: ${status}
================================================================================
${options.focused ? 'Focused Verification: filtered tests may report skipped tests outside the target area. Full coverage is represented by the full test-suite section.\n' : ''}${output}
`);
  return status === 'PASS';
}

function writeConfig(dir, name, config) {
  const filePath = path.join(dir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

async function main() {
  fs.writeFileSync(REPORT_PATH, '');
  let npmVersion = 'N/A';
  try {
    npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  } catch (error) {
    npmVersion = error instanceof Error ? error.message : String(error);
  }

  append(`STRUCTIFY PHASE 8 VERIFICATION REPORT
======================================
Timestamp: ${new Date().toISOString()}
OS Platform: ${os.platform()} (${os.release()})
OS Architecture: ${os.arch()}
Node Version: ${process.version}
npm Version: ${npmVersion}
Root Workspace Path: ${ROOT}
`);

  let allPassed = true;
  const docs = [
    'template_inheritance.md',
    'template_dsl.md',
    'virtual_file_graph.md',
    'diff_engine.md',
    'transaction_engine.md',
    'dependency_graph.md',
    'generator_composition.md',
    'plugin_sandbox.md',
    'event_persistence.md',
    'mcp_tools.md',
    'verification_reports.md',
    'event_bus.md',
    'hook_system.md',
    'manifest.md',
    'cli_commands.md',
  ];
  let docsPassed = true;
  let docOutput = 'Documentation Files Checked:\n';
  for (const doc of docs) {
    const docPath = path.join(ROOT, 'docs', doc);
    if (fs.existsSync(docPath)) {
      docOutput += ` [x] ${doc} - Present (${fs.statSync(docPath).size} bytes)\n`;
    } else {
      docOutput += ` [ ] ${doc} - MISSING\n`;
      docsPassed = false;
    }
  }
  append(`
================================================================================
SECTION: Documentation Presence Check
Timestamp: ${new Date().toISOString()}
Status: ${docsPassed ? 'PASS' : 'FAIL'}
================================================================================
${docOutput}
`);
  if (!docsPassed) allPassed = false;

  const checks = [
    { title: 'Dependency Status', cmd: 'npm ls --workspaces --depth=0 --package-lock=false' },
    { title: 'Zero-Warning Lint', cmd: 'npm run lint' },
    { title: 'Format Check', cmd: 'npm run format:check' },
    { title: 'Typecheck', cmd: 'npm run typecheck' },
    { title: 'Full Test-Suite Summary', cmd: 'npm test', timeout: 180000 },
    { title: 'Build Result', cmd: 'npm run build', timeout: 180000 },
    {
      title: 'Focused Verification: Doctor npm-first check',
      cmd: 'node apps/cli/dist/index.js doctor --json',
      focused: true,
    },
    {
      title: 'Focused Verification: Template Inheritance tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Template Inheritance"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Template DSL tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Template DSL"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Virtual File Graph tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Virtual File Graph"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Diff Engine tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Diff Engine"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Transaction Engine tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Transaction Engine"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Dependency Graph tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Dependency Graph"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Generator Composition tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Generator Composition"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Plugin Sandbox tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Plugin Sandbox"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: Event Persistence tests',
      cmd: 'npx vitest run src/platform/index.spec.ts -t "Event Persistence"',
      cwd: path.join(ROOT, 'packages/core'),
      focused: true,
    },
    {
      title: 'Focused Verification: MCP tool tests',
      cmd: 'npx vitest run src/tools.spec.ts',
      cwd: path.join(ROOT, 'apps/mcp-server'),
      focused: true,
    },
  ];

  for (const check of checks) {
    if (!runCheck(check.title, check.cmd, check)) allPassed = false;
  }

  const binPath = path.join(ROOT, 'apps/cli/dist/index.js');
  const binExists = fs.existsSync(binPath);
  append(`
================================================================================
SECTION: Package Binary Check
Timestamp: ${new Date().toISOString()}
Status: ${binExists ? 'PASS' : 'FAIL'}
================================================================================
Checked CLI bin destination: ${binPath}
Exists: ${binExists ? 'Yes' : 'No'}
`);
  if (!binExists) allPassed = false;

  const cli = 'node apps/cli/dist/index.js';
  for (const check of [
    { title: 'CLI Smoke: welcome', cmd: `${cli}` },
    { title: 'CLI Smoke: help', cmd: `${cli} --help` },
    { title: 'CLI Smoke: validate example', cmd: `${cli} validate --example` },
    { title: 'CLI Smoke: add planning', cmd: `${cli} add tailwind --json` },
    { title: 'CLI Smoke: repair', cmd: `${cli} repair` },
  ]) {
    if (!runCheck(check.title, check.cmd)) allPassed = false;
  }

  const tempDir = path.join(os.tmpdir(), `structify-phase8-${Date.now()}`);
  const configDir = path.join(tempDir, 'configs');
  fs.mkdirSync(configDir, { recursive: true });
  const tools = {
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
    nextTailwind: writeConfig(configDir, 'next-tailwind', {
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
      tools,
    }),
    viteMui: writeConfig(configDir, 'vite-mui', {
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
      tools,
    }),
    express: writeConfig(configDir, 'express', {
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
      tools,
    }),
    nest: writeConfig(configDir, 'nest', {
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
      tools,
    }),
    nextExpress: writeConfig(configDir, 'next-express', {
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
      tools,
    }),
    postgresPrisma: writeConfig(configDir, 'postgres-prisma', {
      projectName: 'postgres-prisma',
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
      tools,
    }),
    mongodbMongoose: writeConfig(configDir, 'mongodb-mongoose', {
      projectName: 'mongodb-mongoose',
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
      tools,
    }),
    dockerActions: writeConfig(configDir, 'docker-actions', {
      projectName: 'docker-actions',
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
      tools: { ...tools, docker: true, githubActions: true },
    }),
  };
  const scaffoldChecks = [
    ['Scaffold Next + Tailwind', configs.nextTailwind, 'next-tailwind'],
    ['Scaffold Vite + MUI', configs.viteMui, 'vite-mui'],
    ['Scaffold Express', configs.express, 'express-api'],
    ['Scaffold Nest', configs.nest, 'nest-api'],
    ['Scaffold Next + Express', configs.nextExpress, 'next-express'],
    ['Scaffold PostgreSQL + Prisma', configs.postgresPrisma, 'postgres-prisma'],
    ['Scaffold MongoDB + Mongoose', configs.mongodbMongoose, 'mongodb-mongoose'],
    ['Scaffold Docker + GitHub Actions', configs.dockerActions, 'docker-actions'],
  ];
  for (const [title, configPath, outputName] of scaffoldChecks) {
    if (
      !runCheck(
        title,
        `${cli} init --config ${configPath} --yes --output ${path.join(tempDir, outputName)}`,
      )
    ) {
      allPassed = false;
    }
  }
  if (
    !runCheck(
      'Dry-run diff human output',
      `${cli} init --config ${configs.nextTailwind} --dry-run --output ${path.join(tempDir, 'dry-run')}`,
    )
  )
    allPassed = false;
  if (
    !runCheck(
      'JSON dry-run includes diff',
      `${cli} --json init --config ${configs.nextTailwind} --dry-run --output ${path.join(tempDir, 'json-dry-run')}`,
    )
  )
    allPassed = false;
  if (
    !runCheck(
      'Event log generation',
      `${cli} init --config ${configs.nextTailwind} --yes --event-log --output ${path.join(tempDir, 'event-log')}`,
    )
  )
    allPassed = false;
  if (
    !runCheck(
      'Inspect manifest and event log',
      `${cli} --cwd ${path.join(tempDir, 'event-log')} inspect --json`,
    )
  )
    allPassed = false;

  const conflictDir = path.join(tempDir, 'conflict');
  fs.mkdirSync(conflictDir, { recursive: true });
  fs.writeFileSync(path.join(conflictDir, 'user-file.txt'), 'user');
  if (
    !runCheck(
      'Conflict detection existing non-empty output',
      `${cli} init --config ${configs.express} --yes --output ${conflictDir}`,
      { expectFailure: true },
    )
  )
    allPassed = false;

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    append(`\nCleanup failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  append(`
================================================================================
VERIFICATION SUMMARY
====================
All Verification Steps Passed: ${allPassed ? 'YES' : 'NO'}
Report compiled to: ${REPORT_PATH}
================================================================================
`);
  console.log(`Report compiled to: ${REPORT_PATH}`);
  if (!allPassed) process.exit(1);
}

main();
