const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'phase-7-verification-report.txt');

function append(section) {
  fs.appendFileSync(REPORT_PATH, section);
}

function runCheck(title, command, options = {}) {
  console.log(`Running check: ${title}...`);
  const timestamp = new Date().toISOString();
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
Timestamp: ${timestamp}
Status: ${status}
================================================================================
${output}
`);
  return status === 'PASS';
}

function writeJsonConfig(dir, name, config) {
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

  append(`STRUCTIFY PHASE 7 VERIFICATION REPORT
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
    'architecture_guide.md',
    'cli_commands.md',
    'supported_stacks.md',
    'generator_guide.md',
    'template_registry.md',
    'plugin_registry.md',
    'module_system_guide.md',
    'event_bus.md',
    'hook_system.md',
    'manifest.md',
    'phase_6_readiness.md',
  ];
  let docOutput = 'Documentation Files Checked:\n';
  let docsPassed = true;
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
    {
      title: 'Workspace Dependency Installation Status',
      cmd: 'npm ls --workspaces --depth=0 --package-lock=false',
      timeout: 60000,
    },
    { title: 'Zero-Warning Lint Result', cmd: 'npm run lint' },
    { title: 'Formatting Check', cmd: 'npm run format:check' },
    { title: 'Typecheck Result', cmd: 'npm run typecheck' },
    { title: 'Unit and Integration Tests', cmd: 'npm test' },
    { title: 'Build Result', cmd: 'npm run build' },
    {
      title: 'Event Bus tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "Event Bus"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Hook System tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "Hook System"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Plugin SDK tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "Plugin SDK"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Generator SDK tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "Generator SDK"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Template SDK tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "Template SDK"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Module SDK tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "Module SDK"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Manifest tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "Manifest"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'npm-default behavior tests',
      cmd: 'npx vitest run src/extensions/index.spec.ts -t "npm should be the default"',
      cwd: path.join(ROOT, 'packages/core'),
    },
  ];
  for (const check of checks) {
    if (!runCheck(check.title, check.cmd, check)) allPassed = false;
  }

  const binFile = path.join(ROOT, 'apps/cli/dist/index.js');
  const binExists = fs.existsSync(binFile);
  append(`
================================================================================
SECTION: Package Binary Check
Timestamp: ${new Date().toISOString()}
Status: ${binExists ? 'PASS' : 'FAIL'}
================================================================================
Checked CLI bin destination: ${binFile}
Exists: ${binExists ? 'Yes' : 'No'}
`);
  if (!binExists) allPassed = false;

  const cliPath = 'node apps/cli/dist/index.js';
  const cliChecks = [
    { title: 'CLI default welcome smoke test', cmd: `${cliPath}` },
    { title: 'CLI help smoke test', cmd: `${cliPath} --help` },
    { title: 'CLI version smoke test', cmd: `${cliPath} --version` },
    { title: 'CLI doctor smoke test', cmd: `${cliPath} doctor` },
    { title: 'CLI validate example smoke test', cmd: `${cliPath} validate --example` },
    { title: 'CLI init dry-run smoke test', cmd: `${cliPath} init --yes --dry-run` },
    { title: 'CLI add-module planning smoke test', cmd: `${cliPath} add tailwind --json` },
    { title: 'CLI inspect smoke test', cmd: `${cliPath} inspect` },
    { title: 'CLI repair smoke test', cmd: `${cliPath} repair` },
  ];
  for (const check of cliChecks) {
    if (!runCheck(check.title, check.cmd)) allPassed = false;
  }

  const tempDir = path.join(os.tmpdir(), `structify-phase7-${Date.now()}`);
  const configDir = path.join(tempDir, 'configs');
  fs.mkdirSync(configDir, { recursive: true });
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
    nextTailwind: writeJsonConfig(configDir, 'next-tailwind', {
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
    }),
    viteMui: writeJsonConfig(configDir, 'vite-mui', {
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
    }),
    express: writeJsonConfig(configDir, 'express', {
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
    }),
    nest: writeJsonConfig(configDir, 'nest', {
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
    }),
    nextExpress: writeJsonConfig(configDir, 'next-express', {
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
    }),
    postgresPrisma: writeJsonConfig(configDir, 'postgres-prisma', {
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
      tools: baseTools,
    }),
    mongodbMongoose: writeJsonConfig(configDir, 'mongodb-mongoose', {
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
      tools: baseTools,
    }),
    dockerActions: writeJsonConfig(configDir, 'docker-actions', {
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
      tools: { ...baseTools, docker: true, githubActions: true },
    }),
  };

  const scaffoldChecks = [
    ['Scaffold Next + Tailwind', configs.nextTailwind, 'next-tailwind'],
    ['Scaffold Vite + MUI', configs.viteMui, 'vite-mui'],
    ['Scaffold Express', configs.express, 'express-api'],
    ['Scaffold Nest', configs.nest, 'nest-api'],
    ['Scaffold Next + Express fullstack', configs.nextExpress, 'next-express'],
    ['Scaffold PostgreSQL + Prisma', configs.postgresPrisma, 'postgres-prisma'],
    ['Scaffold MongoDB + Mongoose', configs.mongodbMongoose, 'mongodb-mongoose'],
    ['Scaffold Docker + GitHub Actions', configs.dockerActions, 'docker-actions'],
  ];
  for (const [title, configPath, outputName] of scaffoldChecks) {
    const outputPath = path.join(tempDir, outputName);
    if (
      !runCheck(title, `${cliPath} init --config ${configPath} --yes --output ${outputPath}`, {
        timeout: 120000,
      })
    ) {
      allPassed = false;
    }
  }
  if (
    !runCheck(
      'Inspect manifest reading',
      `${cliPath} --cwd ${path.join(tempDir, 'next-tailwind')} inspect --json`,
    )
  ) {
    allPassed = false;
  }
  if (
    !runCheck(
      'JSON output with verbose event summaries',
      `${cliPath} --verbose --json init --config ${configs.nextTailwind} --yes --output ${path.join(tempDir, 'json-output')}`,
    )
  ) {
    allPassed = false;
  }

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    append(
      `\nTemporary cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
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
