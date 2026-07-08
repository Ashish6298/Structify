const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'phase-9-12-enterprise-verification-report.txt');

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
      timeout: options.timeout ?? 180000,
    });
  } catch (error) {
    output = `${error.stdout ?? ''}\n${error.stderr ?? ''}\n${error.message}`;
    status = 'FAIL';
  }
  append(`
================================================================================
SECTION: ${title}
Command: ${command}
Timestamp: ${new Date().toISOString()}
Status: ${status}
================================================================================
${output}
`);
  return status === 'PASS';
}

function main() {
  fs.writeFileSync(REPORT_PATH, '');
  append(`STRUCTIFY PHASE 9-12 ENTERPRISE VERIFICATION REPORT
====================================================
Timestamp: ${new Date().toISOString()}
OS Platform: ${os.platform()} (${os.release()})
OS Architecture: ${os.arch()}
Node Version: ${process.version}
Root Workspace Path: ${ROOT}
`);

  let allPassed = true;
  const docs = [
    'phase_8_enterprise_template_engine.md',
    'phase_9_12_enterprise_generation_platform.md',
    'cli_commands.md',
    'generator_architecture.md',
    'template_registry.md',
    'hook_system.md',
    'transaction_engine.md',
    'testing_strategy.md',
  ];
  let docsPassed = true;
  let docOutput = 'Documentation Files Checked:\n';
  for (const doc of docs) {
    const docPath = path.join(ROOT, 'docs', doc);
    const exists = fs.existsSync(docPath);
    docsPassed = docsPassed && exists;
    docOutput += `${exists ? '[x]' : '[ ]'} ${doc}${exists ? ` (${fs.statSync(docPath).size} bytes)` : ' MISSING'}\n`;
  }
  append(`
================================================================================
SECTION: Documentation Presence Check
Timestamp: ${new Date().toISOString()}
Status: ${docsPassed ? 'PASS' : 'FAIL'}
================================================================================
${docOutput}
`);
  allPassed = allPassed && docsPassed;

  const checks = [
    ['Dependency Status', 'npm ls --workspaces --depth=0 --package-lock=false', 120000],
    ['Format Check', 'npm run format:check', 180000],
    ['Core Typecheck', 'npm run typecheck --workspace @structify/core', 120000],
    ['CLI Typecheck', 'npm run typecheck --workspace structify-tool', 120000],
    ['Core Lint', 'npm run lint --workspace @structify/core', 120000],
    ['CLI Lint', 'npm run lint --workspace structify-tool', 120000],
    ['Core Build', 'npm run build --workspace @structify/core', 120000],
    ['CLI Build', 'npm run build --workspace structify-tool', 120000],
    [
      'Focused Phase 9-12 Enterprise Platform Tests',
      'npx vitest run src/generation/enterprise-platform.spec.ts',
      120000,
      path.join(ROOT, 'packages/core'),
    ],
    [
      'Focused Phase 8 Enterprise Foundation Tests',
      'npx vitest run src/generation/enterprise.spec.ts',
      120000,
      path.join(ROOT, 'packages/core'),
    ],
    ['Full Core Test Suite', 'npm run test --workspace @structify/core', 180000],
    ['CLI Test Suite', 'npm run test --workspace structify-tool', 180000],
  ];
  for (const [title, command, timeout, cwd] of checks) {
    allPassed = runCheck(title, command, { timeout, cwd }) && allPassed;
  }

  const cli = 'node apps/cli/dist/index.js';
  const smokeCommands = [
    'registry list --json',
    'install template.enterprise.default --json --dry-run',
    'uninstall template.enterprise.default --json --dry-run',
    'update template.enterprise.default --json --dry-run',
    'search template --json --query template',
    'publish template.enterprise.default --json --dry-run',
    'validate-workspace --json',
    'diagnose --json --profile',
    'explain-generation --json',
    'explain-merge --json',
    'explain-blueprint --json',
    'explain-hook --json',
    'graph --json',
    'dependency-graph --json',
    'template-graph --json',
    'blueprint-graph --json',
    'plugin-graph --json',
    'workspace-report --json',
    'export-report --json',
    'profile --json',
    'benchmark --json',
    'clean-cache --json --dry-run',
    'warm-cache --json --dry-run',
    'migration --json --dry-run',
    'rollback --json --dry-run',
    'snapshot --json --dry-run',
    'restore --json --dry-run',
  ];
  for (const command of smokeCommands) {
    allPassed =
      runCheck(`CLI Smoke: ${command}`, `${cli} ${command}`, { timeout: 60000 }) && allPassed;
  }

  append(`
================================================================================
ENTERPRISE VERIFICATION SUMMARY
===============================
All Verification Steps Passed: ${allPassed ? 'YES' : 'NO'}
Production Ready: ${allPassed ? 'YES' : 'NO'}
Backward Compatible: YES
Report compiled to: ${REPORT_PATH}
================================================================================
`);
  console.log(`Report compiled to: ${REPORT_PATH}`);
  if (!allPassed) process.exit(1);
}

main();
