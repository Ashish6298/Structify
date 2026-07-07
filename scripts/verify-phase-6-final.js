const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPORT_PATH = path.join(__dirname, '../phase-6-final-verification-report.txt');

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
STRUCTIFY PHASE 6 FINAL COMPLETED VERIFICATION REPORT
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

  // 1. Monorepo linting, typechecking and tests
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

  const cliPath = 'node apps/cli/dist/index.js';

  // 3. CLI Presets commands checks
  const presetCommands = [
    { title: 'Preset List Check', cmd: `${cliPath} preset list` },
    { title: 'Preset Path Check', cmd: `${cliPath} preset path` },
    { title: 'Preset Show built-in Check', cmd: `${cliPath} preset show next-postgres-tailwind` },
    { title: 'Preset Create Check', cmd: `${cliPath} preset create test-verify-preset` },
    { title: 'Preset Show custom Check', cmd: `${cliPath} preset show test-verify-preset` },
    { title: 'Preset Info Check', cmd: `${cliPath} preset info test-verify-preset` },
    {
      title: 'Preset Export Check',
      cmd: `${cliPath} preset export test-verify-preset exported.json`,
    },
    { title: 'Preset Validate Check', cmd: `${cliPath} preset validate exported.json` },
    { title: 'Preset Import Check', cmd: `${cliPath} preset import exported.json` },
    {
      title: 'Preset Copy Check',
      cmd: `${cliPath} preset copy test-verify-preset copied-test-preset`,
    },
    {
      title: 'Preset Rename Check',
      cmd: `${cliPath} preset rename copied-test-preset renamed-test-preset`,
    },
    { title: 'Preset Remove Check', cmd: `${cliPath} preset remove renamed-test-preset` },
    { title: 'Preset Cleanup Original', cmd: `${cliPath} preset remove test-verify-preset` },
  ];

  for (const check of presetCommands) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // Cleanup exported.json file
  try {
    fs.unlinkSync(path.join(__dirname, '../exported.json'));
  } catch (e) {}

  // 4. Project generation checks using presets
  const genChecks = [
    {
      title: 'Scaffold using Preset Next Postgres Tailwind (dry-run)',
      cmd: `${cliPath} init --preset next-postgres-tailwind --dry-run --yes --output temp-out-preset`,
    },
    {
      title: 'Scaffold using Preset Express Mongoose (dry-run)',
      cmd: `${cliPath} generate --preset express-mongoose --dry-run --yes --output temp-out-preset-mongoose`,
    },
  ];

  for (const check of genChecks) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // 5. Documentation verify
  const docs = ['docs/cli_guide.md', 'docs/cli_commands.md', 'docs/presets_and_config.md'];
  let docsPassed = true;
  let docsOutput = 'Documentation Files Audited:\n';
  for (const doc of docs) {
    const docPath = path.resolve(__dirname, '..', doc);
    if (fs.existsSync(docPath)) {
      docsOutput += ` - ${doc}: EXISTS\n`;
    } else {
      docsOutput += ` - ${doc}: MISSING\n`;
      docsPassed = false;
    }
  }

  const docSection = `
================================================================================
SECTION: Documentation Audit
Timestamp: ${new Date().toISOString()}
Status: ${docsPassed ? 'PASS' : 'FAIL'}
================================================================================
${docsOutput}
`;
  fs.appendFileSync(REPORT_PATH, docSection);
  if (!docsPassed) allPassed = false;

  // Final Pass/Fail Summary
  const finalSummary = `
================================================================================
FINAL VERIFICATION STATUS: ${allPassed ? 'PASS' : 'FAIL'}
================================================================================
`;
  fs.appendFileSync(REPORT_PATH, finalSummary);
  console.log(`Verification completed: ${allPassed ? 'PASS' : 'FAIL'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
