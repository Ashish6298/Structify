const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'apps', 'cli', 'dist', 'index.js');

if (!fs.existsSync(cli)) {
  console.error('Built CLI not found. Run npm run build before this verification script.');
  process.exit(1);
}

function runStructify(args, answers, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let answerIndex = 0;
    let lastAnsweredPromptLength = -1;

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      maybeAnswer();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      child.stdin.end();
    }, 120000);

    function maybeAnswer() {
      if (answerIndex >= answers.length) {
        child.stdin.end();
        return;
      }

      if (!isWaitingForAnswer(stdout) || lastAnsweredPromptLength === stdout.length) {
        return;
      }

      lastAnsweredPromptLength = stdout.length;
      child.stdin.write(`${answers[answerIndex]}\n`);
      answerIndex += 1;
    }

    child.on('close', (status) => {
      clearTimeout(timeout);
      resolve({ status, stdout, stderr });
    });
  });
}

function isWaitingForAnswer(output) {
  return /(: |\]: )$/.test(output);
}

function assert(condition, message, detail) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    if (detail) {
      console.error(detail);
    }
    process.exit(1);
  }
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-init-wizard-'));

  try {
    const postgres = await runStructify(
      ['init'],
      [
        'my app',
        'y',
        'fullstack',
        'next',
        'express',
        'tailwind',
        'postgres',
        'prisma',
        'npm',
        'n',
        'y',
        'y',
        'y',
      ],
      tmp,
    );

    assert(postgres.status === 0, 'PostgreSQL wizard run should succeed', postgres.stderr);
    assert(
      postgres.stdout.includes('will be normalized to "my-app"'),
      'project name normalization confirmation should be shown',
      postgres.stdout,
    );
    assert(
      !postgres.stdout.includes('Compatibility Error'),
      'PostgreSQL flow should not show compatibility errors',
      postgres.stdout,
    );
    assert(
      postgres.stdout.includes('Select database mapper/ORM') &&
        postgres.stdout.includes('Prisma (prisma)') &&
        !postgres.stdout.includes('Mongoose (mongoose)'),
      'PostgreSQL ORM step should only show Prisma',
      postgres.stdout,
    );
    assert(
      !/\[Step \d+\/\d+\]/.test(postgres.stdout),
      'wizard should not show changing step denominators',
      postgres.stdout,
    );
    assert(
      postgres.stdout.includes('Project Summary') && postgres.stdout.includes('Generation Summary'),
      'final and success summaries should be shown',
      postgres.stdout,
    );
    assert(fs.existsSync(path.join(tmp, 'my-app', 'package.json')), 'project should be generated');

    const mongo = await runStructify(
      ['init', '--dry-run'],
      ['mongo-app', 'backend-only', 'express', 'mongodb', 'mongoose', 'npm', 'n', 'y', 'y'],
      tmp,
    );
    assert(mongo.status === 0, 'MongoDB dry-run wizard should succeed', mongo.stderr);
    assert(
      !mongo.stdout.includes('Compatibility Error'),
      'MongoDB flow should not show compatibility errors',
      mongo.stdout,
    );
    assert(
      mongo.stdout.includes('Mongoose (mongoose)') && !mongo.stdout.includes('Prisma (prisma)'),
      'MongoDB ORM step should only show Mongoose',
      mongo.stdout,
    );

    const none = await runStructify(
      ['init', '--dry-run'],
      ['none-app', 'frontend-only', 'next', 'tailwind', 'none', 'npm', 'n', 'y', 'y'],
      tmp,
    );
    assert(none.status === 0, 'No-database dry-run wizard should succeed', none.stderr);
    assert(
      !none.stdout.includes('Select database mapper/ORM'),
      'no-database flow should skip ORM prompt',
      none.stdout,
    );

    console.log(`PASS: init wizard UX verification completed in ${tmp}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
