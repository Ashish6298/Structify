const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'phase-7-final-verification-report.txt');

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

  append(`STRUCTIFY PHASE 7 FINAL VERIFICATION REPORT
=============================================
Timestamp: ${new Date().toISOString()}
OS Platform: ${os.platform()} (${os.release()})
OS Architecture: ${os.arch()}
Node Version: ${process.version}
npm Version: ${npmVersion}
Root Workspace Path: ${ROOT}

Phase 7 Scope:
  - ProjectHealthEngine (runProjectHealthCheck)
  - StackDetector (detectStack)
  - Unified doctor command (env + project health)
  - Unified repair command (health diagnostics + dry-run preview)
  - Unified inspect command (full health report)
  - Unified verify-project command (strict/non-strict)
  - New CLIErrorCode values (10 new codes)
  - 6 new documentation files
  - 28 new health-engine unit tests
  - 16 new stack-detector unit tests
`);

  let allPassed = true;

  // ── Documentation Check ────────────────────────────────────────────────────
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
    'project_health_guide.md',
    'drift_detection.md',
    'doctor_guide.md',
    'repair_guide.md',
    'inspect_guide.md',
    'verify_project_guide.md',
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

  // ── Health Engine Source File Check ────────────────────────────────────────
  const healthFiles = [
    'packages/core/src/platform/health-engine.ts',
    'packages/core/src/platform/stack-detector.ts',
    'packages/core/src/platform/health-engine.spec.ts',
  ];
  let healthFilesOutput = 'Phase 7 Source Files:\n';
  let healthFilesPassed = true;
  for (const file of healthFiles) {
    const filePath = path.join(ROOT, file);
    if (fs.existsSync(filePath)) {
      healthFilesOutput += ` [x] ${file} - Present (${fs.statSync(filePath).size} bytes)\n`;
    } else {
      healthFilesOutput += ` [ ] ${file} - MISSING\n`;
      healthFilesPassed = false;
    }
  }
  append(`
================================================================================
SECTION: Phase 7 Source File Presence Check
Timestamp: ${new Date().toISOString()}
Status: ${healthFilesPassed ? 'PASS' : 'FAIL'}
================================================================================
${healthFilesOutput}
`);
  if (!healthFilesPassed) allPassed = false;

  // ── Error Code Check ───────────────────────────────────────────────────────
  const errorTsPath = path.join(ROOT, 'apps/cli/src/utils/error.ts');
  const errorContent = fs.existsSync(errorTsPath) ? fs.readFileSync(errorTsPath, 'utf8') : '';
  const newCodes = [
    'PROJECT_NOT_FOUND',
    'METADATA_MISSING',
    'MANIFEST_INVALID',
    'PROJECT_GRAPH_INVALID',
    'DEPENDENCY_GRAPH_INVALID',
    'STACK_DETECTION_FAILED',
    'DRIFT_DETECTED',
    'REPAIR_NOT_SAFE',
    'REPAIR_PLAN_READY',
    'REPAIR_APPLIED',
  ];
  let codesOutput = 'New CLIErrorCode values:\n';
  let codesPassed = true;
  for (const code of newCodes) {
    const present = errorContent.includes(`'${code}'`);
    codesOutput += ` ${present ? '[x]' : '[ ]'} ${code}${present ? '' : ' - MISSING'}\n`;
    if (!present) codesPassed = false;
  }
  append(`
================================================================================
SECTION: New CLIErrorCode Values Check
Timestamp: ${new Date().toISOString()}
Status: ${codesPassed ? 'PASS' : 'FAIL'}
================================================================================
${codesOutput}
`);
  if (!codesPassed) allPassed = false;

  // ── Standard Pipeline ──────────────────────────────────────────────────────
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
  ];

  for (const check of checks) {
    if (!runCheck(check.title, check.cmd, check)) allPassed = false;
  }

  // ── Focused Health Engine Tests ────────────────────────────────────────────
  const healthEngineTests = [
    {
      title: 'Stack Detector unit tests',
      cmd: 'npx vitest run src/platform/health-engine.spec.ts -t "Stack Detector"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'ProjectHealthEngine Core tests',
      cmd: 'npx vitest run src/platform/health-engine.spec.ts -t "ProjectHealthEngine - Core"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Diagnostic Classification tests',
      cmd: 'npx vitest run src/platform/health-engine.spec.ts -t "ProjectHealthEngine - Diagnostic Classification"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Report Shape Conformance tests',
      cmd: 'npx vitest run src/platform/health-engine.spec.ts -t "ProjectHealthEngine - JSON Shape"',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Phase 9 state and drift tests',
      cmd: 'npx vitest run src/platform/phase9.spec.ts',
      cwd: path.join(ROOT, 'packages/core'),
    },
    {
      title: 'Project validator tests',
      cmd: 'npx vitest run src/platform/project-validator.spec.ts',
      cwd: path.join(ROOT, 'packages/core'),
    },
  ];
  for (const check of healthEngineTests) {
    if (!runCheck(check.title, check.cmd, check)) allPassed = false;
  }

  // ── Binary Check ──────────────────────────────────────────────────────────
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

  // ── CLI Smoke Tests ────────────────────────────────────────────────────────
  const cliPath = 'node apps/cli/dist/index.js';
  const cliChecks = [
    { title: 'CLI default welcome smoke test', cmd: `${cliPath}` },
    { title: 'CLI help smoke test', cmd: `${cliPath} --help` },
    { title: 'CLI version smoke test', cmd: `${cliPath} --version` },
    { title: 'CLI doctor smoke test', cmd: `${cliPath} doctor` },
    { title: 'CLI doctor --json smoke test', cmd: `${cliPath} doctor --json` },
    { title: 'CLI validate example smoke test', cmd: `${cliPath} validate --example` },
    { title: 'CLI init dry-run smoke test', cmd: `${cliPath} init --yes --dry-run` },
    // Note: 'add tailwind --json' correctly exits with code 1 when run from a non-Structify directory
    { title: 'CLI inspect smoke test', cmd: `${cliPath} inspect` },
    { title: 'CLI inspect --json smoke test', cmd: `${cliPath} inspect --json` },
    { title: 'CLI repair smoke test', cmd: `${cliPath} repair` },
    { title: 'CLI repair --json smoke test', cmd: `${cliPath} repair --json` },
    { title: 'CLI repair --dry-run smoke test', cmd: `${cliPath} repair --dry-run` },
  ];
  for (const check of cliChecks) {
    if (!runCheck(check.title, check.cmd)) allPassed = false;
  }

  // ── Scaffold + Project Health Checks ──────────────────────────────────────
  const tempDir = path.join(os.tmpdir(), `structify-phase7-final-${Date.now()}`);
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

  const nextTailwindConfig = writeJsonConfig(configDir, 'next-tailwind', {
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
  });

  const expressConfig = writeJsonConfig(configDir, 'express', {
    projectName: 'express-api',
    version: '1.0',
    mode: 'fullstack',
    stack: {
      frontend: 'none',
      backend: 'express',
      styling: 'none',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
    tools: baseTools,
  });

  const dockerConfig = writeJsonConfig(configDir, 'docker-actions', {
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
  });

  const nextTailwindOutput = path.join(tempDir, 'next-tailwind');
  const expressOutput = path.join(tempDir, 'express-api');
  const dockerOutput = path.join(tempDir, 'docker-actions');

  const scaffoldChecks = [
    ['Scaffold Next + Tailwind', nextTailwindConfig, nextTailwindOutput],
    ['Scaffold Express API', expressConfig, expressOutput],
    ['Scaffold Docker + GitHub Actions', dockerConfig, dockerOutput],
  ];

  for (const [title, configPath, outputPath] of scaffoldChecks) {
    if (
      !runCheck(title, `${cliPath} init --config ${configPath} --yes --output ${outputPath}`, {
        timeout: 120000,
      })
    ) {
      allPassed = false;
    }
  }

  // ── Project Health on scaffolded projects ─────────────────────────────────
  const healthChecks = [
    {
      title: 'inspect --json on Next+Tailwind project',
      cmd: `${cliPath} --cwd ${nextTailwindOutput} inspect --json`,
    },
    {
      title: 'doctor --json on Next+Tailwind project',
      cmd: `${cliPath} --cwd ${nextTailwindOutput} doctor --json`,
    },
    {
      title: 'repair --json on Next+Tailwind project (dry-run)',
      cmd: `${cliPath} --cwd ${nextTailwindOutput} repair --json`,
    },
    {
      title: 'verify-project on Next+Tailwind project',
      cmd: `${cliPath} --cwd ${nextTailwindOutput} verify-project --json`,
    },
    {
      title: 'verify-project --strict on Next+Tailwind project',
      cmd: `${cliPath} --cwd ${nextTailwindOutput} verify-project --strict --json`,
    },
    {
      title: 'inspect --json on Express project',
      cmd: `${cliPath} --cwd ${expressOutput} inspect --json`,
    },
    {
      title: 'doctor --json on Express project',
      cmd: `${cliPath} --cwd ${expressOutput} doctor --json`,
    },
    {
      title: 'repair --json on Docker project',
      cmd: `${cliPath} --cwd ${dockerOutput} repair --json`,
    },
  ];

  for (const check of healthChecks) {
    if (!runCheck(check.title, check.cmd)) allPassed = false;
  }

  // ── Stack Detection on scaffolded projects ─────────────────────────────────
  // Verify JSON output contains detectedStack with correct values
  let stackDetectionPassed = true;
  let stackDetectionOutput = 'Stack Detection in JSON output:\n';
  try {
    const inspectJson = JSON.parse(
      execSync(`${cliPath} --cwd ${nextTailwindOutput} inspect --json`, {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: 'pipe',
      }),
    );
    const stack = inspectJson.data?.detectedStack;
    if (stack) {
      stackDetectionOutput += ` [x] detectedStack present in inspect --json output\n`;
      stackDetectionOutput += ` [${
        stack.frontend === 'next' ? 'x' : '!'
      }] frontend === 'next' (got: ${stack.frontend})\n`;
      stackDetectionOutput += ` [${
        stack.styling === 'tailwind' ? 'x' : '!'
      }] styling === 'tailwind' (got: ${stack.styling})\n`;
      stackDetectionOutput += ` [${stack.confidence ? 'x' : '!'}] confidence: ${stack.confidence}\n`;
      stackDetectionOutput += ` [${stack.detectionSource ? 'x' : '!'}] detectionSource: ${stack.detectionSource}\n`;
      if (stack.frontend !== 'next' || stack.styling !== 'tailwind') stackDetectionPassed = false;
    } else {
      stackDetectionOutput += ' [ ] detectedStack NOT present in inspect --json output - MISSING\n';
      stackDetectionPassed = false;
    }
  } catch (error) {
    stackDetectionOutput += ` [!] Failed to parse inspect --json: ${error.message}\n`;
    stackDetectionPassed = false;
  }
  append(`
================================================================================
SECTION: Stack Detection Verification
Timestamp: ${new Date().toISOString()}
Status: ${stackDetectionPassed ? 'PASS' : 'FAIL'}
================================================================================
${stackDetectionOutput}
`);
  if (!stackDetectionPassed) allPassed = false;

  // ── Repairability Output Check ─────────────────────────────────────────────
  let repairabilityPassed = true;
  let repairabilityOutput = 'Repairability in repair --json output:\n';
  try {
    const repairJson = JSON.parse(
      execSync(`${cliPath} --cwd ${nextTailwindOutput} repair --json`, {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: 'pipe',
      }),
    );
    const codes = ['REPAIR_PLAN_READY', 'REPAIR_NOT_SAFE', 'NO_REPAIR_NEEDED'];
    repairabilityOutput += ` [${codes.includes(repairJson.code) ? 'x' : '!'}] code field present: ${repairJson.code}\n`;
    repairabilityOutput += ` [${typeof repairJson.data?.fixableCount === 'number' ? 'x' : '!'}] fixableCount present\n`;
    repairabilityOutput += ` [${typeof repairJson.data?.notFixableCount === 'number' ? 'x' : '!'}] notFixableCount present\n`;
    repairabilityOutput += ` [${repairJson.data?.healthSummary ? 'x' : '!'}] healthSummary present\n`;
    if (
      !codes.includes(repairJson.code) ||
      typeof repairJson.data?.fixableCount !== 'number' ||
      typeof repairJson.data?.notFixableCount !== 'number'
    ) {
      repairabilityPassed = false;
    }
  } catch (error) {
    repairabilityOutput += ` [!] Failed to parse repair --json: ${error.message}\n`;
    repairabilityPassed = false;
  }
  append(`
================================================================================
SECTION: Repairability Output Verification
Timestamp: ${new Date().toISOString()}
Status: ${repairabilityPassed ? 'PASS' : 'FAIL'}
================================================================================
${repairabilityOutput}
`);
  if (!repairabilityPassed) allPassed = false;

  // ── Health Summary Output Check ────────────────────────────────────────────
  let healthSummaryPassed = true;
  let healthSummaryOutput = 'healthSummary in doctor --json output:\n';
  try {
    const doctorJson = JSON.parse(
      execSync(`${cliPath} --cwd ${nextTailwindOutput} doctor --json`, {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: 'pipe',
      }),
    );
    const hs = doctorJson.data?.healthSummary;
    healthSummaryOutput += ` [${hs ? 'x' : '!'}] healthSummary present\n`;
    if (hs) {
      for (const key of ['total', 'pass', 'info', 'warnings', 'errors', 'fixable', 'notFixable']) {
        healthSummaryOutput += ` [${typeof hs[key] === 'number' ? 'x' : '!'}] healthSummary.${key}: ${hs[key]}\n`;
        if (typeof hs[key] !== 'number') healthSummaryPassed = false;
      }
    } else {
      healthSummaryPassed = false;
    }
  } catch (error) {
    healthSummaryOutput += ` [!] Failed to parse doctor --json: ${error.message}\n`;
    healthSummaryPassed = false;
  }
  append(`
================================================================================
SECTION: HealthSummary JSON Output Verification
Timestamp: ${new Date().toISOString()}
Status: ${healthSummaryPassed ? 'PASS' : 'FAIL'}
================================================================================
${healthSummaryOutput}
`);
  if (!healthSummaryPassed) allPassed = false;

  // ── Repair Apply Test ──────────────────────────────────────────────────────
  // Remove a safe file and verify repair restores it
  let repairApplyPassed = true;
  let repairApplyOutput = 'Repair Apply Test:\n';
  try {
    const editorConfigPath = path.join(nextTailwindOutput, '.editorconfig');
    const hadEditorConfig = fs.existsSync(editorConfigPath);
    if (hadEditorConfig) {
      fs.rmSync(editorConfigPath);
      repairApplyOutput += ` [x] Removed .editorconfig to create drift\n`;
    }
    execSync(`${cliPath} --cwd ${nextTailwindOutput} repair --apply --yes --json`, {
      encoding: 'utf8',
      cwd: ROOT,
      stdio: 'pipe',
    });
    const restored = fs.existsSync(editorConfigPath);
    repairApplyOutput += ` [${restored ? 'x' : '!'}] .editorconfig restored by repair --apply --yes\n`;
    if (!restored) repairApplyPassed = false;
  } catch (error) {
    repairApplyOutput += ` [!] Repair apply failed: ${error.message}\n`;
    repairApplyPassed = false;
  }
  append(`
================================================================================
SECTION: Repair Apply Test (Remove safe file and restore)
Timestamp: ${new Date().toISOString()}
Status: ${repairApplyPassed ? 'PASS' : 'FAIL'}
================================================================================
${repairApplyOutput}
`);
  if (!repairApplyPassed) allPassed = false;

  // ── Strict Verify-Project Test ─────────────────────────────────────────────
  // Modify README.md (non-strict should still pass, strict should fail)
  let strictVerifyPassed = true;
  let strictVerifyOutput = 'Strict verify-project Test:\n';
  try {
    const readmePath = path.join(nextTailwindOutput, 'README.md');
    fs.appendFileSync(readmePath, '\n# Manual Edit\n');
    strictVerifyOutput += ` [x] Modified README.md to introduce drift\n`;

    // Non-strict: should still pass (modified file is warning, not error)
    let nonStrictPassed = true;
    try {
      execSync(`${cliPath} --cwd ${nextTailwindOutput} verify-project --json`, {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: 'pipe',
      });
      strictVerifyOutput += ` [x] Non-strict verify-project passed (expected)\n`;
    } catch {
      strictVerifyOutput += ` [!] Non-strict verify-project FAILED unexpectedly\n`;
      nonStrictPassed = false;
    }

    // Strict mode: should fail (modified file is WARNING → strict treats as error)
    let strictFailedCorrectly = false;
    try {
      execSync(`${cliPath} --cwd ${nextTailwindOutput} verify-project --strict --json`, {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: 'pipe',
      });
      strictVerifyOutput += ` [!] Strict verify-project passed but SHOULD have failed\n`;
    } catch {
      strictVerifyOutput += ` [x] Strict verify-project correctly failed on drift (expected)\n`;
      strictFailedCorrectly = true;
    }

    if (!nonStrictPassed || !strictFailedCorrectly) strictVerifyPassed = false;
  } catch (error) {
    strictVerifyOutput += ` [!] Strict verify test error: ${error.message}\n`;
    strictVerifyPassed = false;
  }
  append(`
================================================================================
SECTION: Strict verify-project behavior test
Timestamp: ${new Date().toISOString()}
Status: ${strictVerifyPassed ? 'PASS' : 'FAIL'}
================================================================================
${strictVerifyOutput}
`);
  if (!strictVerifyPassed) allPassed = false;

  // ── Verbose Event Summary Test ─────────────────────────────────────────────
  if (
    !runCheck(
      'JSON output with verbose event summaries',
      `${cliPath} --verbose --json init --config ${nextTailwindConfig} --yes --output ${path.join(tempDir, 'json-output')}`,
    )
  ) {
    allPassed = false;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
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

Phase 7 Final Verification Items:
  [${allPassed ? 'x' : '!'}] ESLint: 0 errors
  [${allPassed ? 'x' : '!'}] Prettier: all files formatted
  [${allPassed ? 'x' : '!'}] TypeScript: 0 type errors
  [${allPassed ? 'x' : '!'}] Vitest: all tests pass
  [${allPassed ? 'x' : '!'}] Build: all packages build
  [${allPassed ? 'x' : '!'}] CLI smoke tests pass
  [${allPassed ? 'x' : '!'}] Stack detection verified in JSON output
  [${allPassed ? 'x' : '!'}] Repairability verified in JSON output
  [${allPassed ? 'x' : '!'}] Health summary verified in JSON output
  [${allPassed ? 'x' : '!'}] Repair apply restores missing safe files
  [${allPassed ? 'x' : '!'}] Strict verify-project fails on drift
  [${allPassed ? 'x' : '!'}] New documentation files present (6 new)
  [${allPassed ? 'x' : '!'}] New CLIErrorCode values present (10 new)
  [${allPassed ? 'x' : '!'}] health-engine.ts and stack-detector.ts present
================================================================================
`);
  console.log(`Report compiled to: ${REPORT_PATH}`);
  if (!allPassed) process.exit(1);
}

main();
