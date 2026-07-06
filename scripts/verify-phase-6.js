const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPORT_PATH = path.join(__dirname, '../phase-6-verification-report.txt');

function runCheck(title, command, expectFailure = false, cwd = path.join(__dirname, '..')) {
  console.log(`Running check: ${title}...`);
  let output = '';
  let status = 'PASS';
  const timestamp = new Date().toISOString();

  try {
    output = execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });
    if (expectFailure) {
      status = 'FAIL';
    }
  } catch (error) {
    if (expectFailure) {
      status = 'PASS';
      output = error.stdout + '\n' + error.stderr + '\n' + error.message;
    } else {
      status = 'FAIL';
      output = error.stdout + '\n' + error.stderr + '\n' + error.message;
    }
  }

  const section = `
================================================================================
SECTION: ${title}
Command: ${command}
Timestamp: ${timestamp}
Status: ${status}
================================================================================
${output}
`;
  fs.appendFileSync(REPORT_PATH, section);
  return status === 'PASS';
}

function runInteractiveMock() {
  return new Promise((resolve) => {
    console.log('Running check: CLI Interactive prompt wizard simulation...');
    const binFile = path.resolve(__dirname, '../apps/cli/dist/index.js');
    const child = spawn('node', [binFile, 'init', '--dry-run'], {
      cwd: path.join(__dirname, '..'),
    });

    let stdoutData = '';

    // Stream-driven stdin feeder
    let lastStepWritten = 0;
    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
      const str = data.toString();
      const match = str.match(/\[Step (\d+)\/\d+\]/);
      if (match) {
        const stepNum = parseInt(match[1], 10);
        if (stepNum > lastStepWritten) {
          lastStepWritten = stepNum;
          child.stdin.write('\n');
        }
      }
    });

    child.stderr.on('data', (data) => {
      stdoutData += '\n[STDERR] ' + data.toString();
    });

    const timeout = setTimeout(() => {
      stdoutData += '\n[TIMEOUT] Interactive dry-run simulation exceeded 20 seconds.';
      child.kill();
    }, 20000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      const status = code === 0 ? 'PASS' : 'FAIL';
      const section = `
================================================================================
SECTION: CLI Interactive prompt wizard simulation
Command: node apps/cli/dist/index.js init (with mocked stdin)
Timestamp: ${new Date().toISOString()}
Status: ${status}
Exit Code: ${code}
================================================================================
${stdoutData}
`;
      fs.appendFileSync(REPORT_PATH, section);
      resolve(code === 0);
    });
  });
}

async function main() {
  fs.writeFileSync(REPORT_PATH, '');

  let pnpmVersion = 'N/A';
  try {
    pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
  } catch (e) {}

  const envInfo = `
STRUCTIFY PHASE 5.6 + PHASE 6 VERIFICATION REPORT
==================================================
Timestamp: ${new Date().toISOString()}
OS Platform: ${os.platform()} (${os.release()})
OS Architecture: ${os.arch()}
Node Version: ${process.version}
pnpm Version: ${pnpmVersion}
Root Workspace Path: ${path.resolve(__dirname, '..')}
`;
  fs.appendFileSync(REPORT_PATH, envInfo);

  let allPassed = true;

  // 1. Doc files presence check
  console.log('Auditing Documentation Files...');
  const docsDir = path.join(__dirname, '../docs');
  const expectedDocs = [
    'architecture_guide.md',
    'cli_commands.md',
    'cli_guide.md',
    'coding_standards.md',
    'contributing_guide.md',
    'contributing.md',
    'development_standards.md',
    'future_features.md',
    'generator_architecture.md',
    'generator_guide.md',
    'mcp_documentation.md',
    'mcp_guide.md',
    'module_system_guide.md',
    'preset_guide.md',
    'presets_and_config.md',
    'roadmap.md',
    'scope_lock.md',
    'supported_stacks.md',
    'testing_strategy.md',
    'generator_registry.md',
    'template_registry.md',
    'plugin_registry.md',
    'dependency_registry.md',
    'execution_graph.md',
    'rollback_manager.md',
    'file_operation_manager.md',
    'package_manager_adapters.md',
    'os_adapter.md',
    'command_executor.md',
    'template_variable_engine.md',
    'phase_6_readiness.md',
  ];

  let docCheckOutput = 'Documentation Files Checked:\n';
  let docsPassed = true;
  for (const doc of expectedDocs) {
    const docPath = path.join(docsDir, doc);
    if (fs.existsSync(docPath)) {
      docCheckOutput += ` [x] ${doc} - Present (${fs.statSync(docPath).size} bytes)\n`;
    } else {
      docCheckOutput += ` [ ] ${doc} - MISSING\n`;
      docsPassed = false;
    }
  }

  const docSection = `
================================================================================
SECTION: Documentation Presence Check
Timestamp: ${new Date().toISOString()}
Status: ${docsPassed ? 'PASS' : 'FAIL'}
================================================================================
${docCheckOutput}
`;
  fs.appendFileSync(REPORT_PATH, docSection);
  if (!docsPassed) allPassed = false;

  // 2. Monorepo core checks
  const buildChecks = [
    { title: 'Workspace Dependencies Installation Check', cmd: 'npx pnpm install' },
    {
      title: 'Workspace ESLint Linting (Zero-Warnings Target)',
      cmd: 'npx eslint "packages/*/src/**/*.ts" "apps/*/src/**/*.ts"',
    },
    {
      title: 'Prettier Formatting Check',
      cmd: 'npx prettier --check "**/*.{ts,js,json,md,yml,yaml}"',
    },
    { title: 'TypeScript Compile & Type Checking', cmd: 'npx pnpm -r typecheck' },
    { title: 'Vitest Unit & Integration Testing', cmd: 'npx pnpm -r test' },
    { title: 'Workspace Packages Compile & Build', cmd: 'npx pnpm -r build' },
  ];

  for (const check of buildChecks) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // 3. Specific Architecture Component tests
  const archChecks = [
    {
      title: 'GenerationSession tests',
      cmd: 'npx vitest run src/execution/engine.spec.ts -t GenerationSession',
      cwd: path.join(__dirname, '../packages/core'),
    },
    {
      title: 'Generator Registry Integration tests',
      cmd: 'npx vitest run src/registry/index.spec.ts -t generatorRegistry',
      cwd: path.join(__dirname, '../packages/core'),
    },
    {
      title: 'Template Variable Engine tests',
      cmd: 'npx vitest run src/templates/engine.spec.ts',
      cwd: path.join(__dirname, '../packages/core'),
    },
    {
      title: 'Dependency Registry tests',
      cmd: 'npx vitest run src/registry/index.spec.ts -t DependencyRegistry',
      cwd: path.join(__dirname, '../packages/core'),
    },
    {
      title: 'Safe File Operation Manager tests',
      cmd: 'npx vitest run src/filesystem/safe-ops.spec.ts',
      cwd: path.join(__dirname, '../packages/core'),
    },
    {
      title: 'Rollback Manager tests',
      cmd: 'npx vitest run src/execution/index.spec.ts -t RollbackManager',
      cwd: path.join(__dirname, '../packages/core'),
    },
    {
      title: 'Conflict Detection tests',
      cmd: 'npx vitest run src/execution/engine.spec.ts -t conflict',
      cwd: path.join(__dirname, '../packages/core'),
    },
  ];

  for (const check of archChecks) {
    const passed = runCheck(check.title, check.cmd, false, check.cwd);
    if (!passed) allPassed = false;
  }

  // 4. CLI bin package sanity
  const binFile = path.resolve(__dirname, '../apps/cli/dist/index.js');
  const binExists = fs.existsSync(binFile);
  const binSection = `
================================================================================
SECTION: Package Binary Presence check
Timestamp: ${new Date().toISOString()}
Status: ${binExists ? 'PASS' : 'FAIL'}
================================================================================
Checked CLI bin destination: ${binFile}
Exists: ${binExists ? 'Yes' : 'No'}
`;
  fs.appendFileSync(REPORT_PATH, binSection);
  if (!binExists) allPassed = false;

  // 5. CLI Smoke Tests
  const cliPath = 'node apps/cli/dist/index.js';
  const smokeTests = [
    { title: 'CLI default welcome smoke test', cmd: `${cliPath}` },
    { title: 'CLI help smoke test', cmd: `${cliPath} --help` },
    { title: 'CLI version smoke test', cmd: `${cliPath} --version` },
    { title: 'CLI doctor smoke test', cmd: `${cliPath} doctor` },
    { title: 'CLI doctor JSON smoke test', cmd: `${cliPath} doctor --json` },
    { title: 'CLI validate example smoke test', cmd: `${cliPath} validate --example` },
    { title: 'CLI validate JSON smoke test', cmd: `${cliPath} validate --example --json` },
    { title: 'CLI init dry-run smoke test', cmd: `${cliPath} init --yes --dry-run` },
    {
      title: 'CLI init config dry-run smoke test',
      cmd: `${cliPath} init --config apps/cli/src/fixtures/valid-config.json --dry-run`,
    },
    {
      title: 'CLI init config JSON dry-run smoke test',
      cmd: `${cliPath} init --config apps/cli/src/fixtures/valid-config.json --dry-run --json`,
    },
    {
      title: 'CLI invalid config validation smoke test',
      cmd: `${cliPath} validate --config apps/cli/src/fixtures/invalid-config.json`,
      expectFailure: true,
    },
    { title: 'CLI add command smoke test', cmd: `${cliPath} add tailwind` },
    { title: 'CLI inspect command smoke test', cmd: `${cliPath} inspect` },
    { title: 'CLI repair command smoke test', cmd: `${cliPath} repair` },
  ];

  for (const test of smokeTests) {
    const passed = runCheck(test.title, test.cmd, !!test.expectFailure);
    if (!passed) allPassed = false;
  }

  // 6. Real Project Generation MVP Stack Smoke Tests
  const tempGenDir = path.join(os.tmpdir(), `structify-verify-${Date.now()}`);
  fs.mkdirSync(tempGenDir, { recursive: true });

  const configsDir = path.join(tempGenDir, 'configs');
  fs.mkdirSync(configsDir, { recursive: true });
  const writeConfig = (name, config) => {
    const filePath = path.join(configsDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    return filePath;
  };
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
  const genConfigs = {
    nextTailwind: writeConfig('next-tailwind', {
      projectName: 'next-tailwind-scaffold',
      version: '1.0',
      mode: 'frontend-only',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'none',
        orm: 'none',
        packageManager: 'pnpm',
      },
      tools: baseTools,
    }),
    viteMui: writeConfig('vite-mui', {
      projectName: 'vite-mui-scaffold',
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
    express: writeConfig('express', {
      projectName: 'express-scaffold',
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
    nest: writeConfig('nest', {
      projectName: 'nest-scaffold',
      version: '1.0',
      mode: 'backend-only',
      stack: {
        frontend: 'none',
        backend: 'nest',
        styling: 'none',
        database: 'none',
        orm: 'none',
        packageManager: 'pnpm',
      },
      tools: baseTools,
    }),
    nextExpress: writeConfig('next-express', {
      projectName: 'next-express-scaffold',
      version: '1.0',
      mode: 'fullstack',
      stack: {
        frontend: 'next',
        backend: 'express',
        styling: 'tailwind',
        database: 'none',
        orm: 'none',
        packageManager: 'pnpm',
      },
      tools: baseTools,
    }),
    viteExpress: writeConfig('vite-express', {
      projectName: 'vite-express-scaffold',
      version: '1.0',
      mode: 'fullstack',
      stack: {
        frontend: 'vite-react',
        backend: 'express',
        styling: 'mui',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: baseTools,
    }),
    postgresPrisma: writeConfig('postgres-prisma', {
      projectName: 'postgres-prisma-scaffold',
      version: '1.0',
      mode: 'backend-only',
      stack: {
        frontend: 'none',
        backend: 'express',
        styling: 'none',
        database: 'postgres',
        orm: 'prisma',
        packageManager: 'pnpm',
      },
      tools: baseTools,
    }),
    mongodbMongoose: writeConfig('mongodb-mongoose', {
      projectName: 'mongodb-mongoose-scaffold',
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
    dockerActions: writeConfig('docker-actions', {
      projectName: 'docker-actions-scaffold',
      version: '1.0',
      mode: 'frontend-only',
      stack: {
        frontend: 'vite-react',
        backend: 'none',
        styling: 'none',
        database: 'none',
        orm: 'none',
        packageManager: 'pnpm',
      },
      tools: { ...baseTools, docker: true, githubActions: true },
    }),
  };

  const genTests = [
    {
      title: 'MVP Scaffold Next.js + Tailwind CSS project',
      cmd: `${cliPath} init --config ${genConfigs.nextTailwind} --output ${path.join(tempGenDir, 'next-tailwind-scaffold')} --yes`,
    },
    {
      title: 'MVP Scaffold React Vite + Material UI project',
      cmd: `${cliPath} init --config ${genConfigs.viteMui} --yes --output ${path.join(tempGenDir, 'vite-mui-scaffold')}`,
    },
    {
      title: 'MVP Scaffold Express project',
      cmd: `${cliPath} init --config ${genConfigs.express} --yes --output ${path.join(tempGenDir, 'express-scaffold')}`,
    },
    {
      title: 'MVP Scaffold Nest project',
      cmd: `${cliPath} init --config ${genConfigs.nest} --yes --output ${path.join(tempGenDir, 'nest-scaffold')}`,
    },
    {
      title: 'MVP Scaffold Next + Express fullstack project',
      cmd: `${cliPath} init --config ${genConfigs.nextExpress} --yes --output ${path.join(tempGenDir, 'next-express-scaffold')}`,
    },
    {
      title: 'MVP Scaffold Vite + Express fullstack project',
      cmd: `${cliPath} init --config ${genConfigs.viteExpress} --yes --output ${path.join(tempGenDir, 'vite-express-scaffold')}`,
    },
    {
      title: 'MVP Scaffold PostgreSQL + Prisma project',
      cmd: `${cliPath} init --config ${genConfigs.postgresPrisma} --yes --output ${path.join(tempGenDir, 'postgres-prisma-scaffold')}`,
    },
    {
      title: 'MVP Scaffold MongoDB + Mongoose project',
      cmd: `${cliPath} init --config ${genConfigs.mongodbMongoose} --yes --output ${path.join(tempGenDir, 'mongodb-mongoose-scaffold')}`,
    },
    {
      title: 'MVP Scaffold Docker + GitHub Actions project',
      cmd: `${cliPath} init --config ${genConfigs.dockerActions} --yes --output ${path.join(tempGenDir, 'docker-actions-scaffold')}`,
    },
    {
      title: 'MVP Scaffold JSON output verification',
      cmd: `${cliPath} init --config ${genConfigs.nextTailwind} --yes --json --output ${path.join(tempGenDir, 'json-scaffold')}`,
    },
  ];

  for (const test of genTests) {
    const passed = runCheck(test.title, test.cmd);
    if (!passed) allPassed = false;
  }

  // Cleanup temp scaffolding output
  try {
    fs.rmSync(tempGenDir, { recursive: true, force: true });
  } catch (e) {}

  // 7. Interactive Wizard Prompt Simulation Test
  const promptPassed = await runInteractiveMock();
  if (!promptPassed) allPassed = false;

  // Summary
  const summary = `
================================================================================
VERIFICATION SUMMARY
====================
All Verification Steps Passed: ${allPassed ? 'YES' : 'NO'}
Report compiled to: ${REPORT_PATH}
================================================================================
`;
  fs.appendFileSync(REPORT_PATH, summary);
  console.log(summary);

  const generatedConfig = path.join(__dirname, '../structify.config.json');
  if (fs.existsSync(generatedConfig)) {
    fs.unlinkSync(generatedConfig);
  }

  if (!allPassed) {
    process.exit(1);
  }
}

main();
