const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'phase-8-2-verification-report.txt');
const tempRoot = path.join(os.tmpdir(), `structify-phase-8-2-${Date.now()}`);
const cliBin = path.join(root, 'apps', 'cli', 'dist', 'index.js');
fs.mkdirSync(tempRoot, { recursive: true });

const sections = [];
let failed = false;

function run(title, command, options = {}) {
  console.log(`Running check: ${title}...`);
  const started = new Date().toISOString();
  try {
    const output = execSync(command, {
      cwd: options.cwd || root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let pass = options.expectFailure ? false : true;
    if (options.mustNotContain && output.includes(options.mustNotContain)) pass = false;
    if (options.mustContain && !output.includes(options.mustContain)) pass = false;
    if (!pass) failed = true;
    sections.push({ title, command, started, status: pass ? 'PASS' : 'FAIL', output });
    return output;
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}${error.message || ''}`;
    let pass = options.expectFailure === true;
    if (options.mustContain && !output.includes(options.mustContain)) pass = false;
    if (options.mustNotContain && output.includes(options.mustNotContain)) pass = false;
    if (!pass) failed = true;
    sections.push({ title, command, started, status: pass ? 'PASS' : 'FAIL', output });
    return output;
  }
}

function parseVitestCounts(output) {
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
  const passedCount = [...cleanOutput.matchAll(/Tests\s+(\d+)\s+passed/g)]
    .map((match) => Number(match[1]))
    .reduce((total, count) => total + count, 0);
  const skippedCount = [...cleanOutput.matchAll(/(\d+)\s+skipped/g)]
    .map((match) => Number(match[1]))
    .reduce((total, count) => total + count, 0);
  const fileCount = [...cleanOutput.matchAll(/\((\d+)\s+tests\)/g)]
    .map((match) => Number(match[1]))
    .reduce((total, count) => total + count, 0);
  return { matched: passedCount || fileCount, skipped: skippedCount };
}

function runFocused(title, command) {
  const output = run(title, command);
  const counts = parseVitestCounts(output);
  if (counts.matched === 0) {
    failed = true;
    sections.push({
      title: `${title} execution count validation`,
      command: 'focused test non-zero assertion',
      started: new Date().toISOString(),
      status: 'FAIL',
      output:
        'Focused verification ran zero matching tests. This section cannot pass with all tests skipped.',
    });
    return;
  }
  sections.push({
    title: `${title} execution count validation`,
    command: 'focused test count assertion',
    started: new Date().toISOString(),
    status: counts.skipped === 0 ? 'PASS' : 'WARN',
    output: JSON.stringify(counts, null, 2),
  });
}

function writeConfig(name, config) {
  const filePath = path.join(tempRoot, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

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

const config = {
  projectName: 'phase-8-2-app',
  version: '1.0',
  mode: 'fullstack',
  stack: {
    frontend: 'next',
    backend: 'express',
    styling: 'tailwind',
    database: 'postgres',
    orm: 'prisma',
    packageManager: 'npm',
  },
  tools: { ...tools, docker: true, githubActions: true },
};
const configPath = writeConfig('phase-8-2-app', config);

sections.push({
  title: 'Environment',
  command: 'node/npm/os metadata',
  started: new Date().toISOString(),
  status: 'PASS',
  output: JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      os: os.platform(),
      architecture: os.arch(),
      node: process.version,
      npm: execSync('npm --version', { encoding: 'utf8' }).trim(),
      workspace: root,
    },
    null,
    2,
  ),
});

run(
  'npm dependency status without pnpm artifact noise',
  'npm ls --workspaces --depth=0 --package-lock=false',
  {
    mustNotContain: '.pnpm',
  },
);
run(
  'pnpm repository artifact check',
  "node -e \"const fs=require('fs'); if(fs.existsSync('pnpm-lock.yaml')||fs.existsSync('pnpm-workspace.yaml')) process.exit(1)\"",
);

for (const doc of [
  'phase_8_2_cleanup.md',
  'phase_8_1_hardening.md',
  'cli_commands.md',
  'verification_reports.md',
  'virtual_file_graph.md',
  'project_graph.md',
  'manifest.md',
  'package_manager_adapters.md',
]) {
  run(`Documentation check: ${doc}`, `node -e "require('fs').accessSync('docs/${doc}')"`);
}

run('Zero-warning lint', 'npm run lint');
run('Format check', 'npm run format:check');
run('Typecheck', 'npm run typecheck');
run('Full test suite', 'npm test');
run('Build', 'npm run build');

runFocused(
  'Focused Verification: Project Graph tests',
  'npx vitest run packages/core/src/platform/project-graph.spec.ts',
);

const dryOutput = run(
  'Dry-run JSON consistency check',
  `node ${cliBin} --json init --config ${configPath} --dry-run --output ${path.join(tempRoot, 'dry-run')}`,
);
try {
  const parsed = JSON.parse(dryOutput);
  const sameCount = parsed.virtualFileGraph?.fileCount === parsed.data?.graph?.fileCount;
  const sameFiles =
    JSON.stringify(parsed.virtualFileGraph?.files) === JSON.stringify(parsed.data?.graph?.files);
  const generatedEmpty = Array.isArray(parsed.generatedFiles) && parsed.generatedFiles.length === 0;
  if (!sameCount || !sameFiles || !generatedEmpty || parsed.virtualFileGraph.fileCount === 0) {
    throw new Error('Dry-run JSON virtual graph is inconsistent.');
  }
  sections.push({
    title: 'Dry-run JSON parsed consistency assertion',
    command: 'JSON.parse dry-run output',
    started: new Date().toISOString(),
    status: 'PASS',
    output: JSON.stringify(
      {
        fileCount: parsed.virtualFileGraph.fileCount,
        generatedFiles: parsed.generatedFiles.length,
        plannedFiles: parsed.plannedFiles.length,
      },
      null,
      2,
    ),
  });
} catch (error) {
  failed = true;
  sections.push({
    title: 'Dry-run JSON parsed consistency assertion',
    command: 'JSON.parse dry-run output',
    started: new Date().toISOString(),
    status: 'FAIL',
    output: String(error),
  });
}

const scaffoldOut = path.join(tempRoot, 'generated');
run(
  'Scaffold integration with verification',
  `node ${cliBin} init --config ${configPath} --yes --output ${scaffoldOut} --verify`,
);
run(
  'verify-project deep structural validation',
  `node ${cliBin} --json verify-project --path ${scaffoldOut}`,
  {
    mustContain: '"dependencyChecks"',
  },
);
run('Inspect generated project', `node ${cliBin} --json inspect`, {
  cwd: scaffoldOut,
  mustContain: '"projectGraph"',
});

const conflictDir = path.join(tempRoot, 'conflict');
fs.mkdirSync(conflictDir, { recursive: true });
fs.writeFileSync(path.join(conflictDir, 'existing.txt'), 'existing');
run(
  'Conflict error classification check',
  `node ${cliBin} --json init --config ${configPath} --yes --output ${conflictDir}`,
  {
    expectFailure: true,
    mustContain: 'TARGET_DIRECTORY_NOT_EMPTY',
    mustNotContain: 'INTERNAL_ERROR',
  },
);

run('Package binary check', `node ${cliBin} --help`);

const report = [
  'Structify Phase 8.2 Verification Report',
  '='.repeat(80),
  `Final status: ${failed ? 'FAIL' : 'PASS'}`,
  '',
  ...sections.map((section) =>
    [
      '='.repeat(80),
      `SECTION: ${section.title}`,
      `Command: ${section.command}`,
      `Timestamp: ${section.started}`,
      `Status: ${section.status}`,
      '='.repeat(80),
      section.output,
      '',
    ].join('\n'),
  ),
  '='.repeat(80),
  'VERIFICATION SUMMARY',
  `All Verification Steps Passed: ${failed ? 'NO' : 'YES'}`,
  `Report compiled to: ${reportPath}`,
].join('\n');

fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Report compiled to: ${reportPath}`);
if (failed) process.exit(1);
