import os from 'os';
import path from 'path';
import fs from 'fs';
import { getSystemMetrics, SystemMetrics } from './utils/system.js';
import { getCliVersion } from './utils/version.js';

export interface CLIContext {
  packageName: string;
  packageVersion: string;
  cwd: string;
  homeDir: string;
  tmpDir: string;
  args: string[];
  nodeVersion: string;
  platform: string;
  arch: string;
  debug: boolean;
  verbose: boolean;
  json: boolean;
  noColor: boolean;
  isCI: boolean;
  isTTY: boolean;
  processId: number;
  timestamp: string;
  detectedPackageManager: 'npm' | 'none';
  system: SystemMetrics;
  startTime: [number, number];
  commandName?: string;
}

export function createCLIContext(
  args: string[],
  options: {
    verbose?: boolean;
    debug?: boolean;
    json?: boolean;
    noColor?: boolean;
    cwd?: string;
  },
): CLIContext {
  const argList = args || [];
  const manualNoColor = argList.includes('--no-color');
  const manualVerbose = argList.includes('--verbose');
  const manualDebug = argList.includes('--debug');
  const manualJson = argList.includes('--json');
  
  let manualCwd: string | undefined;
  const cwdIdx = argList.indexOf('--cwd');
  if (cwdIdx !== -1 && cwdIdx + 1 < argList.length) {
    manualCwd = argList[cwdIdx + 1];
  }

  const targetCwd = options.cwd ? path.resolve(options.cwd) : (manualCwd ? path.resolve(manualCwd) : process.cwd());

  let detectedPackageManager: 'npm' | 'none' = 'none';
  try {
    if (fs.existsSync(path.join(targetCwd, 'package-lock.json'))) {
      detectedPackageManager = 'npm';
    }
  } catch (_e) {
    // Fail silently
  }

  return {
    packageName: 'structify-tool',
    packageVersion: getCliVersion(),
    cwd: targetCwd,
    homeDir: os.homedir(),
    tmpDir: os.tmpdir(),
    args,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    debug: !!options.debug || manualDebug,
    verbose: !!options.verbose || manualVerbose,
    json: !!options.json || manualJson,
    noColor: !!options.noColor || manualNoColor || process.env.NO_COLOR === 'true',
    isCI: process.env.CI === 'true',
    isTTY: process.stdout.isTTY ?? false,
    processId: process.pid,
    timestamp: new Date().toISOString(),
    detectedPackageManager,
    system: getSystemMetrics(),
    startTime: process.hrtime(),
  };
}
