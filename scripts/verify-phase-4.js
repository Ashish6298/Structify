const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPORT_PATH = path.join(__dirname, '../phase-4-verification-report.txt');

function runCheck(title, command, expectFailure = false, cwd = path.join(__dirname, '..')) {
  console.log(`Running check: ${title}...`);
  let output = '';
  let status = 'PASS';
  const timestamp = new Date().toISOString();

  try {
    output = execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });
    if (expectFailure) {
      status = 'FAIL'; // Expected command to throw
    }
  } catch (error) {
    if (expectFailure) {
      status = 'PASS'; // Threw as expected
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

function main() {
  fs.writeFileSync(REPORT_PATH, '');

  const envInfo = `
STRUCTIFY PHASE 4 VERIFICATION REPORT
======================================
Timestamp: ${new Date().toISOString()}
OS Platform: ${os.platform()} (${os.release()})
OS Architecture: ${os.arch()}
Node Version: ${process.version}
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
    { title: 'Turborepo Linting Verification', cmd: 'npx turbo lint' },
    {
      title: 'Prettier Formatting Check',
      cmd: 'npx prettier --check "**/*.{ts,js,json,md,yml,yaml}"',
    },
    { title: 'TypeScript Compile & Type Checking', cmd: 'npx turbo typecheck' },
    { title: 'Vitest Unit & Integration Testing', cmd: 'npx turbo test' },
    { title: 'Turborepo Packages Compile & Build', cmd: 'npx turbo build' },
  ];

  for (const check of buildChecks) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // 3. CLI bin package sanity
  console.log('Auditing Package Bin configuration...');
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

  // 4. CLI Smoke Tests
  const cliPath = 'node apps/cli/dist/index.js';
  const smokeTests = [
    { title: 'CLI default welcome smoke test', cmd: `${cliPath}` },
    { title: 'CLI help smoke test', cmd: `${cliPath} --help` },
    { title: 'CLI version smoke test', cmd: `${cliPath} --version` },
    { title: 'CLI doctor smoke test', cmd: `${cliPath} doctor` },
    { title: 'CLI doctor JSON smoke test', cmd: `${cliPath} doctor --json` },
    { title: 'CLI validate example smoke test', cmd: `${cliPath} validate --example` },
    { title: 'CLI validate JSON smoke test', cmd: `${cliPath} validate --example --json` },
    { title: 'CLI init dry-run smoke test', cmd: `${cliPath} init --dry-run` },
    {
      title: 'CLI init config dry-run smoke test',
      cmd: `${cliPath} init --config apps/cli/src/fixtures/valid-config.json --dry-run`,
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

  if (!allPassed) {
    process.exit(1);
  }
}

main();
