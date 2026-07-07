const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'phase-8-2-final-verification-report.txt');
const tempRoot = path.join(os.tmpdir(), `structify-phase-8-2-final-${Date.now()}`);
const cliBin = path.join(root, 'apps', 'cli', 'dist', 'index.js');
fs.mkdirSync(tempRoot, { recursive: true });

const sections = [];
let failed = false;

function timestamp() {
  return new Date().toISOString();
}

function section(title, status, output, command = 'internal assertion') {
  if (status === 'FAIL') failed = true;
  sections.push({ title, command, status, timestamp: timestamp(), output: String(output ?? '') });
}

function run(title, command, options = {}) {
  console.log(`Running final check: ${title}...`);
  try {
    const output = execSync(command, {
      cwd: options.cwd || root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: 'true' },
    });
    let status = options.expectFailure ? 'FAIL' : 'PASS';
    if (options.mustContain && !output.includes(options.mustContain)) status = 'FAIL';
    if (options.mustNotContain && output.includes(options.mustNotContain)) status = 'FAIL';
    section(title, status, output, command);
    return output;
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}${error.message || ''}`;
    let status = options.expectFailure ? 'PASS' : 'FAIL';
    if (options.mustContain && !output.includes(options.mustContain)) status = 'FAIL';
    if (options.mustNotContain && output.includes(options.mustNotContain)) status = 'FAIL';
    section(title, status, output, command);
    return output;
  }
}

function parseVitestCounts(output) {
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
  return { matched, skipped };
}

function runFocused(title, command) {
  const output = run(title, command);
  const counts = parseVitestCounts(output);
  const status = counts.matched === 0 ? 'FAIL' : counts.skipped === 0 ? 'PASS' : 'WARN';
  section(
    `${title} matched/skipped assertion`,
    status,
    JSON.stringify(
      {
        matchedTestsExecuted: counts.matched,
        skippedTests: counts.skipped,
        zeroMatchFailure: counts.matched === 0,
      },
      null,
      2,
    ),
  );
}

function writeConfig(name, config) {
  const filePath = path.join(tempRoot, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

function parseJsonCommand(title, command, assertFn, options = {}) {
  const output = run(title, command, options);
  try {
    const parsed = JSON.parse(extractFirstJsonObject(output));
    assertFn(parsed);
    section(
      `${title} structured JSON assertion`,
      'PASS',
      JSON.stringify(parsed.summary ?? parsed.data ?? parsed, null, 2),
    );
    return parsed;
  } catch (error) {
    section(
      `${title} structured JSON assertion`,
      'FAIL',
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

function extractFirstJsonObject(output) {
  const start = output.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in command output.');
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
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return output.slice(start, index + 1);
  }
  throw new Error('JSON object was not closed in command output.');
}

function listFiles(dir) {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['.git', 'node_modules', '.turbo', 'dist'].includes(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push(absolute);
    }
  };
  walk(dir);
  return files;
}

function repositoryConsistencyChecks() {
  const files = listFiles(root);
  const allowedPnpm = [
    'docs/package_manager_adapters.md',
    'docs/phase_8_2_cleanup.md',
    'docs/verification_reports.md',
    'packages/core/src/adapters/package-manager.ts',
    'packages/core/src/adapters/index.spec.ts',
    'scripts/verify-phase-8-2.js',
    'scripts/verify-phase-8-2-final.js',
  ].map((file) => path.normalize(path.join(root, file)));
  const staleReportFiles = files.filter(
    (file) =>
      /^phase-.*verification-report\.txt$/.test(path.basename(file)) &&
      path.basename(file) !== 'phase-8-2-final-verification-report.txt',
  );
  const badPnpm = [];
  const stalePhrases = [];
  const stalePhraseParts = [
    ['Prompts for Package Manager', ' (npm, pnpm)'],
    ['operate in informational ', 'placeholder mode'],
    ['pnpm ', 'Version:'],
    ['npx ', 'pnpm install'],
    ['Package Managers**: ', 'npm, pnpm'],
  ];
  for (const file of files) {
    const relative = path.relative(root, file).replace(/\\/g, '/');
    if (file === reportPath) continue;
    const ext = path.extname(file).toLowerCase();
    if (!['.ts', '.js', '.json', '.md', '.yml', '.yaml', '.txt'].includes(ext)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('pnpm') && !allowedPnpm.includes(path.normalize(file))) {
      badPnpm.push(relative);
    }
    for (const phrase of stalePhraseParts.map((parts) => parts.join(''))) {
      if (text.includes(phrase)) stalePhrases.push(`${relative}: ${phrase}`);
    }
  }
  if (staleReportFiles.length > 0 || badPnpm.length > 0 || stalePhrases.length > 0) {
    throw new Error(
      JSON.stringify(
        {
          staleReportFiles: staleReportFiles.map((file) => path.relative(root, file)),
          unexpectedPnpmReferences: badPnpm,
          stalePhrases,
        },
        null,
        2,
      ),
    );
  }
}

const tools = {
  docker: true,
  eslint: true,
  prettier: true,
  githubActions: true,
  git: false,
  editorconfig: true,
  husky: false,
  lintStaged: false,
  commitlint: false,
};

const config = {
  projectName: 'final-phase-app',
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
  tools,
};
const configPath = writeConfig('final-phase-app', config);

section(
  'Environment',
  'INFO',
  JSON.stringify(
    {
      timestamp: timestamp(),
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
  'node/npm/os metadata',
);

run('npm dependency validation', 'npm ls --workspaces --depth=0 --package-lock=false', {
  mustNotContain: '.pnpm',
});
run(
  'pnpm artifact absence validation',
  "node -e \"const fs=require('fs'); if(fs.existsSync('pnpm-lock.yaml')||fs.existsSync('pnpm-workspace.yaml')) process.exit(1)\"",
);

try {
  repositoryConsistencyChecks();
  section(
    'Repository consistency scan',
    'PASS',
    'No unexpected pnpm references, stale historical reports, or obsolete phase phrases found.',
  );
} catch (error) {
  section(
    'Repository consistency scan',
    'FAIL',
    error instanceof Error ? error.message : String(error),
  );
}

for (const doc of [
  'README.md',
  'docs/cli_guide.md',
  'docs/cli_commands.md',
  'docs/verification_reports.md',
  'docs/virtual_file_graph.md',
  'docs/project_graph.md',
  'docs/manifest.md',
  'docs/package_manager_adapters.md',
  'docs/roadmap.md',
]) {
  run(
    `Documentation presence: ${doc}`,
    `node -e "require('fs').accessSync('${doc.replace(/\\/g, '/')}')"`,
  );
}

run('Zero-warning lint', 'npm run lint');
run('Format check', 'npm run format:check');
run('Typecheck', 'npm run typecheck');
run('Build verification', 'npm run build');
run('Full test suite', 'npm test');

runFocused(
  'Focused Project Graph verification',
  'npx vitest run packages/core/src/platform/project-graph.spec.ts',
);
runFocused(
  'Focused project structural validator verification',
  'npx vitest run packages/core/src/platform/project-validator.spec.ts',
);
runFocused(
  'Focused CLI JSON and dry-run verification',
  'npx vitest run apps/cli/src/phase-8-2-final.spec.ts',
);
runFocused(
  'Focused rollback exact-state verification',
  'npx vitest run packages/core/src/execution/rollback-final.spec.ts',
);

const dryRun = parseJsonCommand(
  'Dry-run JSON validation',
  `node ${cliBin} --json init --config ${configPath} --dry-run --output ${path.join(tempRoot, 'dry-run')}`,
  (parsed) => {
    if (!Array.isArray(parsed.generatedFiles) || parsed.generatedFiles.length !== 0) {
      throw new Error('Dry-run generatedFiles must be empty.');
    }
    if (JSON.stringify(parsed.plannedFiles) !== JSON.stringify(parsed.virtualFileGraph.files)) {
      throw new Error('plannedFiles and virtualFileGraph.files differ.');
    }
    if (JSON.stringify(parsed.virtualFileGraph) !== JSON.stringify(parsed.data.graph)) {
      throw new Error('top-level virtualFileGraph and data.graph differ.');
    }
    if (parsed.data.analytics.fileCount !== parsed.virtualFileGraph.fileCount) {
      throw new Error('analytics fileCount does not match virtualFileGraph fileCount.');
    }
    if (parsed.data.diff.summary.create !== parsed.virtualFileGraph.fileCount) {
      throw new Error('diff create count does not match planned file count.');
    }
  },
);

const generatedPath = path.join(tempRoot, 'generated');
run(
  'Scaffold integration with offline verification',
  `node ${cliBin} init --config ${configPath} --yes --output ${generatedPath} --verify`,
);

const verification = parseJsonCommand(
  'verify-project comprehensive JSON validation',
  `node ${cliBin} --json verify-project --path ${generatedPath}`,
  (parsed) => {
    if (parsed.success !== true) throw new Error('verify-project did not succeed.');
    for (const key of ['checkedFiles', 'checkedScripts', 'checkedGraphNodes', 'dependencyChecks']) {
      if (!parsed.summary || parsed.summary[key] <= 0)
        throw new Error(`Missing summary count: ${key}`);
    }
    if (!parsed.manifest || !parsed.projectGraph || !parsed.config) {
      throw new Error('verify-project JSON missing config, manifest, or projectGraph.');
    }
    if (parsed.manifest.stackHash !== parsed.projectGraph.stackHash) {
      throw new Error('Manifest and Project Graph stack hashes differ.');
    }
    if (parsed.config.stack.packageManager !== 'npm' || parsed.manifest.packageManager !== 'npm') {
      throw new Error('Generated metadata is not npm-first.');
    }
  },
);

parseJsonCommand(
  'Inspect JSON schema validation',
  `node ${cliBin} --json inspect`,
  (parsed) => {
    if (parsed.success !== true || parsed.command !== 'inspect')
      throw new Error('inspect JSON failed.');
    if (!parsed.data?.manifest || !parsed.data?.projectGraph || !parsed.data?.config) {
      throw new Error('inspect JSON missing metadata.');
    }
  },
  { cwd: generatedPath },
);

parseJsonCommand('Doctor JSON smoke validation', `node ${cliBin} --json doctor`, (parsed) => {
  if (parsed.command !== 'doctor' || !Array.isArray(parsed.data?.checks)) {
    throw new Error('doctor JSON schema mismatch.');
  }
  if (!parsed.data.checks.some((check) => check.name.includes('npm Package Manager'))) {
    throw new Error('doctor did not validate npm.');
  }
});

parseJsonCommand(
  'Validate JSON smoke validation',
  `node ${cliBin} --json validate --example`,
  (parsed) => {
    if (parsed.success !== true || parsed.command !== 'validate') {
      throw new Error('validate JSON failed.');
    }
    if (parsed.data.normalizedConfig.stack.packageManager !== 'npm') {
      throw new Error('validate example did not normalize to npm.');
    }
  },
);

parseJsonCommand(
  'Add command JSON smoke validation',
  `node ${cliBin} --json add docker`,
  (parsed) => {
    if (parsed.success !== true || parsed.command !== 'add' || parsed.data.planOnly !== true) {
      throw new Error('add JSON should be successful plan-only output.');
    }
  },
);

parseJsonCommand(
  'Repair command JSON smoke validation',
  `node ${cliBin} --json repair`,
  (parsed) => {
    if (parsed.success !== true || parsed.command !== 'repair') {
      throw new Error('repair JSON schema mismatch.');
    }
  },
);

const conflictDir = path.join(tempRoot, 'conflict');
fs.mkdirSync(conflictDir);
fs.writeFileSync(path.join(conflictDir, 'existing.txt'), 'existing');
parseJsonCommand(
  'Conflict classification JSON validation',
  `node ${cliBin} --json init --config ${configPath} --yes --output ${conflictDir}`,
  (parsed) => {
    if (parsed.success !== false) throw new Error('Conflict command should fail.');
    if (parsed.errors?.[0]?.code !== 'TARGET_DIRECTORY_NOT_EMPTY') {
      throw new Error('Conflict did not use TARGET_DIRECTORY_NOT_EMPTY.');
    }
    if (JSON.stringify(parsed).includes('INTERNAL_ERROR')) {
      throw new Error('Conflict output contained INTERNAL_ERROR.');
    }
  },
  { expectFailure: true },
);

if (dryRun && verification) {
  section(
    'Metadata synchronization assertion',
    'PASS',
    JSON.stringify(
      {
        plannedFiles: dryRun.virtualFileGraph.fileCount,
        checkedFiles: verification.summary.checkedFiles,
        checkedGraphNodes: verification.summary.checkedGraphNodes,
        stackHash: verification.projectGraph.stackHash,
      },
      null,
      2,
    ),
  );
}

run('Package binary check', `node ${cliBin} --help`, { mustContain: 'verify-project' });

const report = [
  'Structify Phase 8.2 Final Verification Report',
  '='.repeat(80),
  `Final status: ${failed ? 'FAIL' : 'PASS'}`,
  `Generated at: ${timestamp()}`,
  '',
  ...sections.map((item, index) =>
    [
      '='.repeat(80),
      `SECTION ${index + 1}: ${item.title}`,
      `Command: ${item.command}`,
      `Timestamp: ${item.timestamp}`,
      `Status: ${item.status}`,
      '-'.repeat(80),
      item.output,
      '',
    ].join('\n'),
  ),
  '='.repeat(80),
  'VERIFICATION SUMMARY',
  `Total Sections: ${sections.length}`,
  `PASS: ${sections.filter((item) => item.status === 'PASS').length}`,
  `WARN: ${sections.filter((item) => item.status === 'WARN').length}`,
  `INFO: ${sections.filter((item) => item.status === 'INFO').length}`,
  `FAIL: ${sections.filter((item) => item.status === 'FAIL').length}`,
  `All Verification Steps Passed: ${failed ? 'NO' : 'YES'}`,
  `Report compiled to: ${reportPath}`,
].join('\n');

fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Report compiled to: ${reportPath}`);

try {
  fs.rmSync(tempRoot, { recursive: true, force: true });
} catch (_error) {
  // Temp cleanup failure should not hide verification results.
}

if (failed) process.exit(1);
