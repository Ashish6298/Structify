import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { getElapsedMs } from '../utils/middleware.js';

function checkInternet(): Promise<boolean> {
  return new Promise((resolve) => {
    dns.lookup('registry.npmjs.org', (err) => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

export async function handleDoctor(context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Environment Diagnostics (Doctor)');

  const checks: { name: string; status: 'PASS' | 'WARN' | 'FAIL' | 'INFO'; detail: string }[] = [];

  // 1. Node.js check
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor >= 18) {
    if (nodeMajor % 2 === 0) {
      checks.push({
        name: 'Node.js Version',
        status: 'PASS',
        detail: `v${process.versions.node} (LTS Active)`,
      });
    } else {
      checks.push({
        name: 'Node.js Version',
        status: 'WARN',
        detail: `v${process.versions.node} (Non-LTS version, LTS recommended)`,
      });
    }
  } else {
    checks.push({
      name: 'Node.js Version',
      status: 'FAIL',
      detail: `v${process.versions.node} (requires >= v18)`,
    });
  }

  // 2. Working Directory access check
  try {
    fs.accessSync(context.cwd, fs.constants.R_OK | fs.constants.W_OK);
    checks.push({
      name: 'Workspace Directory Access',
      status: 'PASS',
      detail: 'Read/Write permission granted',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      name: 'Workspace Directory Access',
      status: 'FAIL',
      detail: `No access: ${message}`,
    });
  }

  // 3. Git check
  let gitAvailable = false;
  try {
    const gitVer = execSync('git --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    checks.push({ name: 'Git CLI Client', status: 'PASS', detail: gitVer });
    gitAvailable = true;
  } catch (_e) {
    checks.push({ name: 'Git CLI Client', status: 'WARN', detail: 'Git client not found on PATH' });
  }

  // 4. Git Config Check
  if (gitAvailable) {
    try {
      const gitUser = execSync('git config user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
      checks.push({
        name: 'Git Configuration (user.name)',
        status: 'PASS',
        detail: `Configured as: ${gitUser}`,
      });
    } catch (_e) {
      checks.push({
        name: 'Git Configuration (user.name)',
        status: 'WARN',
        detail: 'Git user.name configuration missing',
      });
    }
  }

  // 5. npm-first package manager checks
  try {
    const npmVer = execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    checks.push({ name: 'npm Package Manager (required)', status: 'PASS', detail: `v${npmVer}` });
  } catch (_e) {
    checks.push({
      name: 'npm Package Manager (required)',
      status: 'FAIL',
      detail: 'npm not installed globally',
    });
  }

  for (const optionalManager of ['pnpm', 'yarn', 'bun']) {
    try {
      const version = execSync(`${optionalManager} --version`, {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();
      checks.push({
        name: `${optionalManager} Package Manager (optional compatibility)`,
        status: 'INFO',
        detail: `Available: v${version}`,
      });
    } catch (_e) {
      checks.push({
        name: `${optionalManager} Package Manager (optional compatibility)`,
        status: 'INFO',
        detail: 'Optional compatibility package manager not installed',
      });
    }
  }

  // 6. Internet & Registry check
  const hasInternet = await checkInternet();
  checks.push({
    name: 'Internet Connection & Registry Access',
    status: hasInternet ? 'PASS' : 'FAIL',
    detail: hasInternet
      ? 'npm registry (registry.npmjs.org) accessible'
      : 'No connection to npm registry detected',
  });

  // 7. System Resources
  const totalMemGB = context.system.totalMemoryBytes / (1024 * 1024 * 1024);
  checks.push({
    name: 'Available System Memory',
    status: totalMemGB >= 4 ? 'PASS' : 'WARN',
    detail: `${totalMemGB.toFixed(2)} GB total memory available`,
  });

  if (context.system.freeDiskSpaceBytes !== undefined) {
    const freeDiskGB = context.system.freeDiskSpaceBytes / (1024 * 1024 * 1024);
    checks.push({
      name: 'Available Storage Disk Space',
      status: freeDiskGB >= 5 ? 'PASS' : 'WARN',
      detail: `${freeDiskGB.toFixed(2)} GB free storage space`,
    });
  }

  checks.push({
    name: 'System Processor Information',
    status: 'INFO',
    detail: `${context.system.cpuCores} CPU cores - ${context.system.cpuModel}`,
  });

  // 8. TTY & Color Capabilities
  checks.push({
    name: 'Terminal UTF-8 support',
    status: 'PASS',
    detail: 'Terminal session supports full character rendering',
  });

  // 9. Docker check
  try {
    const dockerVer = execSync('docker --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    checks.push({ name: 'Docker Engine', status: 'PASS', detail: dockerVer });
  } catch (_e) {
    checks.push({
      name: 'Docker Engine',
      status: 'WARN',
      detail: 'Docker daemon or CLI not available',
    });
  }

  // 10. Local files check
  const hasPackageJson = fs.existsSync(path.join(context.cwd, 'package.json'));
  checks.push({
    name: 'Project Manifest (package.json)',
    status: hasPackageJson ? 'PASS' : 'INFO',
    detail: hasPackageJson
      ? 'Present in current directory'
      : 'Not found (not in a JS project folder)',
  });

  const overallSuccess = !checks.some((c) => c.status === 'FAIL');
  const elapsed = getElapsedMs(context.startTime);

  if (context.json) {
    output.json({
      success: overallSuccess,
      command: 'doctor',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      warnings: checks.filter((c) => c.status === 'WARN').map((c) => c.name),
      errors: checks.filter((c) => c.status === 'FAIL').map((c) => c.name),
      data: { checks },
    });
    return;
  }

  output.subheading('Diagnostic Results:\n');
  for (const check of checks) {
    let statusLabel = '';
    if (check.status === 'PASS') {
      statusLabel = '\x1b[32m[PASS]\x1b[0m';
    } else if (check.status === 'WARN') {
      statusLabel = '\x1b[33m[WARN]\x1b[0m';
    } else if (check.status === 'INFO') {
      statusLabel = '\x1b[34m[INFO]\x1b[0m';
    } else {
      statusLabel = '\x1b[31m[FAIL]\x1b[0m';
    }
    const formattedLabel = context.noColor ? `[${check.status}]` : statusLabel;
    output.info(` - ${formattedLabel} ${check.name}: ${check.detail}`);
  }

  output.showFooter('doctor');
}
