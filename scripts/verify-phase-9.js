const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'phase-9-verification-report.txt');
const tempRoot = path.join(os.tmpdir(), `structify-phase-9-${Date.now()}`);
const cliBin = path.join(root, 'apps', 'cli', 'dist', 'index.js');
fs.mkdirSync(tempRoot, { recursive: true });

const sections = [];
let failed = false;

function now() {
  return new Date().toISOString();
}

function addSection(section) {
  if (section.status === 'FAIL') failed = true;
  sections.push({ timestamp: now(), ...section });
}

function run(title, command, options = {}) {
  console.log(`Running Phase 9 check: ${title}...`);
  try {
    const output = execSync(command, {
      cwd: options.cwd || root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: 'true' },
    });
    let status = 'PASS';
    if (options.mustContain && !output.includes(options.mustContain)) status = 'FAIL';
    if (options.mustNotContain && output.includes(options.mustNotContain)) status = 'FAIL';
    addSection({ title, command, status, output });
    return output;
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}${error.message || ''}`;
    let status = options.expectFailure ? 'PASS (Expected Failure Verified)' : 'FAIL';
    if (options.mustContain && !output.includes(options.mustContain)) status = 'FAIL';
    if (options.mustNotContain && output.includes(options.mustNotContain)) status = 'FAIL';
    addSection({
      title,
      command,
      status,
      output,
      negativePath: options.expectFailure
        ? {
            label: 'VERIFIED NEGATIVE PATH',
            expectedCondition: options.expectedCondition,
            expectedErrorCode: options.expectedErrorCode,
            actualErrorCode: extractErrorCode(output),
            rollbackRequired: options.rollbackRequired === true,
            rollbackExecuted: rollbackExecuted(output),
            passReason: `Command failed as expected with ${options.expectedErrorCode}.`,
          }
        : undefined,
    });
    if (!options.expectFailure) failed = true;
    return output;
  }
}

function extractErrorCode(output) {
  try {
    const parsed = JSON.parse(extractFirstJsonObject(output));
    return parsed.errors?.[0]?.code ?? parsed.code ?? 'UNKNOWN';
  } catch (_error) {
    const match = output.match(/"(?:code|errorCode)":\s*"([^"]+)"/);
    return match?.[1] ?? 'UNKNOWN';
  }
}

function rollbackExecuted(output) {
  try {
    const parsed = JSON.parse(extractFirstJsonObject(output));
    return (
      (Array.isArray(parsed.rollbackResults) && parsed.rollbackResults.length > 0) ||
      (Array.isArray(parsed.rollbackActions) && parsed.rollbackActions.length > 0) ||
      (Array.isArray(parsed.plannedRollbackActions) && parsed.plannedRollbackActions.length > 0)
    );
  } catch (_error) {
    return output.includes('Rollback executed');
  }
}

function extractFirstJsonObject(output) {
  const start = output.indexOf('{');
  if (start === -1) throw new Error('No JSON object found.');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < output.length; index += 1) {
    const char = output[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') inString = !inString;
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return output.slice(start, index + 1);
  }
  throw new Error('Unclosed JSON object.');
}

function parseJson(title, command, assertFn, options = {}) {
  const output = run(title, command, options);
  try {
    const parsed = JSON.parse(extractFirstJsonObject(output));
    assertFn(parsed);
    addSection({
      title: `${title} structured assertion`,
      command: 'JSON assertion',
      status: 'PASS',
      output: JSON.stringify(parsed.summary ?? parsed.data ?? parsed, null, 2),
    });
    return parsed;
  } catch (error) {
    addSection({
      title: `${title} structured assertion`,
      command: 'JSON assertion',
      status: 'FAIL',
      output: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function runFocused(title, command) {
  const output = run(title, command);
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
  const matched =
    [...clean.matchAll(/Tests\s+(\d+)\s+passed/g)]
      .map((match) => Number(match[1]))
      .reduce((total, count) => total + count, 0) ||
    [...clean.matchAll(/\((\d+)\s+tests\)/g)]
      .map((match) => Number(match[1]))
      .reduce((total, count) => total + count, 0);
  const skipped = [...clean.matchAll(/(\d+)\s+skipped/g)]
    .map((match) => Number(match[1]))
    .reduce((total, count) => total + count, 0);
  addSection({
    title: `${title} matched/skipped assertion`,
    command: 'focused test count assertion',
    status: matched === 0 ? 'FAIL' : skipped === 0 ? 'PASS' : 'WARN',
    output: JSON.stringify({ matchedTestsExecuted: matched, skippedTests: skipped }, null, 2),
  });
}

function writeConfig(name, config) {
  const filePath = path.join(tempRoot, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

const baseConfig = {
  projectName: 'phase9-app',
  version: '1.0',
  mode: 'frontend-only',
  stack: {
    frontend: 'next',
    backend: 'none',
    styling: 'none',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
  tools: {
    docker: false,
    eslint: false,
    prettier: false,
    githubActions: false,
    git: false,
    editorconfig: true,
    husky: false,
    lintStaged: false,
    commitlint: false,
  },
};

const configPath = writeConfig('phase9-app', baseConfig);
const backendConfigPath = writeConfig('phase9-backend', {
  ...baseConfig,
  projectName: 'phase9-backend',
  mode: 'backend-only',
  stack: {
    frontend: 'none',
    backend: 'express',
    styling: 'none',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
});
addSection({
  title: 'Environment',
  command: 'node/npm/os metadata',
  status: 'INFO',
  output: JSON.stringify(
    {
      timestamp: now(),
      os: os.platform(),
      release: os.release(),
      architecture: os.arch(),
      node: process.version,
      npm: execSync('npm --version', { encoding: 'utf8' }).trim(),
      workspace: root,
    },
    null,
    2,
  ),
});

run('npm dependency validation', 'npm ls --workspaces --depth=0 --package-lock=false', {
  mustNotContain: '.pnpm',
});
run(
  'pnpm artifact absence',
  "node -e \"const fs=require('fs'); if(fs.existsSync('pnpm-lock.yaml')||fs.existsSync('pnpm-workspace.yaml')) process.exit(1)\"",
);

for (const doc of [
  'docs/phase_9_evolution_engine.md',
  'docs/cli_commands.md',
  'docs/verification_reports.md',
  'docs/project_graph.md',
  'docs/manifest.md',
]) {
  run(`Documentation check: ${doc}`, `node -e "require('fs').accessSync('${doc}')"`);
}

run('Zero-warning lint', 'npm run lint');
run('Format check', 'npm run format:check');
run('Typecheck', 'npm run typecheck');
run('Build', 'npm run build');
run('Full test suite', 'npm test');

runFocused(
  'Focused Project State Reader and Drift Detector tests',
  'npx vitest run packages/core/src/platform/phase9.spec.ts',
);
runFocused(
  'Focused Patch Engine and Module Addition tests',
  'npx vitest run packages/core/src/platform/phase9.spec.ts',
);
runFocused(
  'Focused Upgrade and Repair Plan tests',
  'npx vitest run packages/core/src/platform/phase9.spec.ts',
);
runFocused(
  'Focused Migration Graph and Rollback tests',
  'npx vitest run packages/core/src/platform/phase9.spec.ts packages/core/src/execution/rollback-final.spec.ts',
);
runFocused('Focused CLI Phase 9 tests', 'npx vitest run apps/cli/src/phase9.spec.ts');
runFocused('Focused MCP planning tool tests', 'npx vitest run apps/mcp-server/src/tools.spec.ts');

const projectPath = path.join(tempRoot, 'generated');
run(
  'Generated project setup',
  `node ${cliBin} init --config ${configPath} --yes --output ${projectPath}`,
);
const backendProjectPath = path.join(tempRoot, 'backend-generated');
run(
  'Generated backend project setup',
  `node ${cliBin} init --config ${backendConfigPath} --yes --output ${backendProjectPath}`,
);

parseJson(
  'Module add Docker dry-run',
  `node ${cliBin} --json add docker --dry-run --path ${projectPath}`,
  (parsed) => {
    if (parsed.data.code !== 'MODULE_PLAN_READY')
      throw new Error('Docker dry-run did not create plan.');
  },
);
parseJson(
  'Module add Docker apply',
  `node ${cliBin} --json add docker --yes --path ${projectPath}`,
  (parsed) => {
    if (parsed.success !== true) throw new Error('Docker apply failed.');
  },
);
parseJson(
  'Module already-present negative path',
  `node ${cliBin} --json add docker --dry-run --path ${projectPath}`,
  (parsed) => {
    if (parsed.code !== 'MODULE_ALREADY_PRESENT')
      throw new Error('Expected MODULE_ALREADY_PRESENT.');
  },
);
run(
  'Incompatible module negative path',
  `node ${cliBin} --json add tailwind --path ${backendProjectPath}`,
  {
    expectFailure: true,
    expectedCondition: 'Adding frontend styling to an incompatible project must be rejected.',
    expectedErrorCode: 'MODULE_INCOMPATIBLE',
    rollbackRequired: false,
    mustContain: 'MODULE_INCOMPATIBLE',
  },
);
parseJson(
  'Upgrade dry-run',
  `node ${cliBin} --json upgrade --dry-run --path ${projectPath}`,
  (parsed) => {
    if (parsed.command !== 'upgrade') throw new Error('Upgrade JSON mismatch.');
  },
);
parseJson(
  'Repair dry-run',
  `node ${cliBin} --json repair --dry-run --path ${projectPath}`,
  (parsed) => {
    if (parsed.command !== 'repair') throw new Error('Repair JSON mismatch.');
  },
);
fs.rmSync(path.join(projectPath, 'structify.project-graph.json'));
parseJson(
  'Repair apply',
  `node ${cliBin} --json repair --apply --yes --path ${projectPath}`,
  (parsed) => {
    if (parsed.success !== true) throw new Error('Repair apply failed.');
  },
);
parseJson(
  'verify-project strict',
  `node ${cliBin} --json verify-project --strict --path ${projectPath}`,
  (parsed) => {
    if (parsed.success !== true) throw new Error('Strict verification failed.');
  },
);
parseJson('Inspect drift JSON', `node ${cliBin} --json inspect --path ${projectPath}`, (parsed) => {
  if (!parsed.data.state || !parsed.data.driftReport)
    throw new Error('Inspect missing Phase 9 data.');
});

const conflictDir = path.join(tempRoot, 'conflict');
fs.mkdirSync(conflictDir);
fs.writeFileSync(path.join(conflictDir, 'existing.txt'), 'existing');
run(
  'Conflict expected negative path',
  `node ${cliBin} --json init --config ${configPath} --yes --output ${conflictDir}`,
  {
    expectFailure: true,
    expectedCondition: 'Non-empty target directories must be rejected.',
    expectedErrorCode: 'TARGET_DIRECTORY_NOT_EMPTY',
    rollbackRequired: false,
    mustContain: 'TARGET_DIRECTORY_NOT_EMPTY',
    mustNotContain: 'INTERNAL_ERROR',
  },
);

run('Package binary check', `node ${cliBin} --help`, { mustContain: 'upgrade' });

const report = [
  'Structify Phase 9 Verification Report',
  '='.repeat(80),
  `Final status: ${failed ? 'FAIL' : 'PASS'}`,
  `Generated at: ${now()}`,
  '',
  ...sections.map((section, index) =>
    [
      '='.repeat(80),
      `SECTION ${index + 1}: ${section.title}`,
      `Command: ${section.command}`,
      `Timestamp: ${section.timestamp}`,
      `Status: ${section.status}`,
      section.negativePath ? `Negative Path: ${section.negativePath.label}` : undefined,
      section.negativePath
        ? `Expected Condition: ${section.negativePath.expectedCondition}
Expected Error Code: ${section.negativePath.expectedErrorCode}
Actual Error Code: ${section.negativePath.actualErrorCode}
Rollback Required: ${section.negativePath.rollbackRequired ? 'yes' : 'no'}
Rollback Executed: ${section.negativePath.rollbackExecuted ? 'yes' : 'no'}
Pass Reason: ${section.negativePath.passReason}`
        : undefined,
      '-'.repeat(80),
      section.output,
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  ),
  '='.repeat(80),
  'VERIFICATION SUMMARY',
  `Total Sections: ${sections.length}`,
  `PASS: ${sections.filter((section) => section.status === 'PASS').length}`,
  `EXPECTED NEGATIVE PATHS: ${sections.filter((section) => section.status === 'PASS (Expected Failure Verified)').length}`,
  `WARN: ${sections.filter((section) => section.status === 'WARN').length}`,
  `INFO: ${sections.filter((section) => section.status === 'INFO').length}`,
  `FAIL: ${sections.filter((section) => section.status === 'FAIL').length}`,
  `All Verification Steps Passed: ${failed ? 'NO' : 'YES'}`,
  `Report compiled to: ${reportPath}`,
].join('\n');

fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Report compiled to: ${reportPath}`);
fs.rmSync(tempRoot, { recursive: true, force: true });
if (failed) process.exit(1);
