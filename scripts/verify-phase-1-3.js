const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPORT_PATH = path.join(__dirname, '../phase-1-3-verification-report.txt');

// Helper to execute command and return output formatted with title
function runCheck(title, command, cwd = path.join(__dirname, '..')) {
  console.log(`Running check: ${title}...`);
  let output = '';
  let status = 'PASS';
  const timestamp = new Date().toISOString();

  try {
    output = execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    status = 'FAIL';
    output = error.stdout + '\n' + error.stderr + '\n' + error.message;
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
  // Clear previous report
  fs.writeFileSync(REPORT_PATH, '');

  // 1. Environment Info
  const envInfo = `
STRUCTIFY PHASE 1-3 VERIFICATION REPORT
=======================================
Timestamp: ${new Date().toISOString()}
OS Platform: ${os.platform()} (${os.release()})
OS Architecture: ${os.arch()}
Node Version: ${process.version}
Root Workspace Path: ${path.resolve(__dirname, '..')}
`;
  fs.appendFileSync(REPORT_PATH, envInfo);

  let allPassed = true;

  // 2. Doc checks
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

  // 3. Execution Commands
  const checks = [
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

  for (const check of checks) {
    const passed = runCheck(check.title, check.cmd);
    if (!passed) allPassed = false;
  }

  // 4. Dist artifacts checks
  console.log('Auditing Built Distributions...');
  const distChecks = [
    { name: '@structify/core', path: '../packages/core/dist/index.js' },
    { name: '@structify/logger', path: '../packages/logger/dist/index.js' },
    { name: 'structify-cli', path: '../apps/cli/dist/index.js' },
    { name: 'structify-mcp-server', path: '../apps/mcp-server/dist/index.js' },
  ];

  let distOutput = 'Distribution Artifacts Checked:\n';
  let distsPassed = true;
  for (const dist of distChecks) {
    const fullPath = path.resolve(__dirname, dist.path);
    if (fs.existsSync(fullPath)) {
      distOutput += ` [x] ${dist.name} output - Built successfully (${fs.statSync(fullPath).size} bytes)\n`;
    } else {
      distOutput += ` [ ] ${dist.name} output - MISSING at ${fullPath}\n`;
      distsPassed = false;
    }
  }

  const distSection = `
================================================================================
SECTION: Build Artifacts Distribution Check
Timestamp: ${new Date().toISOString()}
Status: ${distsPassed ? 'PASS' : 'FAIL'}
================================================================================
${distOutput}
`;
  fs.appendFileSync(REPORT_PATH, distSection);
  if (!distsPassed) allPassed = false;

  // Final Summary
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
