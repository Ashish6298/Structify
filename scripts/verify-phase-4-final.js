const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPORT_PATH = path.join(__dirname, '../phase-4-final-verification-report.txt');

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

async function main() {
  fs.writeFileSync(REPORT_PATH, '');

  let npmVersion = 'N/A';
  try {
    npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  } catch (e) {}

  const envInfo = `
STRUCTIFY PHASE 4 FINAL COMPLETED VERIFICATION REPORT
======================================================
Timestamp: ${new Date().toISOString()}
OS Platform: ${os.platform()} (${os.release()})
OS Architecture: ${os.arch()}
Node Version: ${process.version}
npm Version: ${npmVersion}
Root Workspace Path: ${path.resolve(__dirname, '..')}
`;
  fs.appendFileSync(REPORT_PATH, envInfo);

  let allPassed = true;

  // 1. Monorepo environment validation
  const baseChecks = [
    { title: 'ESLint Lint Check', cmd: 'npm run lint' },
    { title: 'Prettier Format Check', cmd: 'npm run format:check' },
    { title: 'TypeScript Compilation & Typecheck', cmd: 'npm run typecheck' },
    { title: 'Vitest Unit & Integration Tests', cmd: 'npm test' },
    { title: 'Turborepo Packages Compile & Build', cmd: 'npm run build' },
  ];

  for (const check of baseChecks) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // 2. Binary presence verification
  const binFile = path.resolve(__dirname, '../apps/cli/dist/index.js');
  const binExists = fs.existsSync(binFile);
  const binSection = `
================================================================================
SECTION: CLI Binary Presence
Timestamp: ${new Date().toISOString()}
Status: ${binExists ? 'PASS' : 'FAIL'}
================================================================================
Path: ${binFile}
Exists: ${binExists ? 'Yes' : 'No'}
`;
  fs.appendFileSync(REPORT_PATH, binSection);
  if (!binExists) allPassed = false;

  // 3. CLI Help Smoke Verification
  const cliPath = 'node apps/cli/dist/index.js';
  const helpCommands = [
    { title: 'Global Help', cmd: `${cliPath} --help` },
    { title: 'Init Command Help', cmd: `${cliPath} init --help` },
    { title: 'Generate Command Help', cmd: `${cliPath} generate --help` },
    { title: 'Preset Command Help', cmd: `${cliPath} preset --help` },
    { title: 'Validate Command Help', cmd: `${cliPath} validate --help` },
    { title: 'Doctor Command Help', cmd: `${cliPath} doctor --help` },
    { title: 'Inspect Command Help', cmd: `${cliPath} inspect --help` },
    { title: 'Repair Command Help', cmd: `${cliPath} repair --help` },
    { title: 'Add Command Help', cmd: `${cliPath} add --help` },
    { title: 'Upgrade Command Help', cmd: `${cliPath} upgrade --help` },
    { title: 'Verify Project Command Help', cmd: `${cliPath} verify-project --help` },
  ];

  for (const check of helpCommands) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // 4. Generate Command compatibility validation
  const aliasChecks = [
    {
      title: 'Generate dry-run output validation',
      cmd: `${cliPath} --json generate --yes --dry-run`,
    },
    {
      title: 'Generate dry-run output with target directory',
      cmd: `${cliPath} --json generate --yes --dry-run --output dummy-dir`,
    },
  ];

  for (const check of aliasChecks) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // 5. Preset command validation
  const presetChecks = [
    { title: 'Preset list output check', cmd: `${cliPath} preset list` },
    { title: 'Preset list JSON output check', cmd: `${cliPath} --json preset list` },
    { title: 'Preset show details check', cmd: `${cliPath} preset show next-postgres-tailwind` },
    {
      title: 'Preset show JSON details check',
      cmd: `${cliPath} --json preset show next-postgres-tailwind`,
    },
    { title: 'Preset path query check', cmd: `${cliPath} preset path` },
    { title: 'Preset path query JSON check', cmd: `${cliPath} --json preset path` },
    {
      title: 'Preset unknown show error check',
      cmd: `${cliPath} --json preset show unknown-preset`,
      expectFailure: true,
    },
  ];

  for (const check of presetChecks) {
    const passed = runCheck(check.title, check.cmd, !!check.expectFailure);
    if (!passed) allPassed = false;
  }

  // 6. Documentation verify
  const docs = ['docs/cli_guide.md', 'docs/cli_commands.md', 'docs/presets_and_config.md'];
  let docsPassed = true;
  let docsOutput = 'Documentation Files Audited:\n';
  for (const doc of docs) {
    const docPath = path.join(__dirname, '..', doc);
    if (fs.existsSync(docPath)) {
      docsOutput += ` [x] ${doc} - Present (${fs.statSync(docPath).size} bytes)\n`;
    } else {
      docsOutput += ` [ ] ${doc} - MISSING\n`;
      docsPassed = false;
    }
  }

  const docSection = `
================================================================================
SECTION: Phase 4 Documentation presence audit
Timestamp: ${new Date().toISOString()}
Status: ${docsPassed ? 'PASS' : 'FAIL'}
================================================================================
${docsOutput}
`;
  fs.appendFileSync(REPORT_PATH, docSection);
  if (!docsPassed) allPassed = false;

  // Final Pass/Fail summary
  const summary = `
================================================================================
PHASE 4 FINAL VERIFICATION SUMMARY
==================================
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
