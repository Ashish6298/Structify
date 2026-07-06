import os from 'os';
import path from 'path';
import fs from 'fs';
import { getSystemMetrics, SystemMetrics } from './utils/system.js';

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
  detectedPackageManager: 'npm' | 'pnpm' | 'none';
  system: SystemMetrics;
  startTime: [number, number];
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
  const targetCwd = options.cwd ? path.resolve(options.cwd) : process.cwd();

  let detectedPackageManager: 'npm' | 'pnpm' | 'none' = 'none';
  try {
    if (fs.existsSync(path.join(targetCwd, 'pnpm-lock.yaml'))) {
      detectedPackageManager = 'pnpm';
    } else if (fs.existsSync(path.join(targetCwd, 'package-lock.json'))) {
      detectedPackageManager = 'npm';
    }
  } catch (_e) {
    // Fail silently
  }

  return {
    packageName: 'structify-cli',
    packageVersion: '1.0.0',
    cwd: targetCwd,
    homeDir: os.homedir(),
    tmpDir: os.tmpdir(),
    args,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    debug: !!options.debug,
    verbose: !!options.verbose,
    json: !!options.json,
    noColor: !!options.noColor || process.env.NO_COLOR === 'true',
    isCI: process.env.CI === 'true',
    isTTY: process.stdout.isTTY ?? false,
    processId: process.pid,
    timestamp: new Date().toISOString(),
    detectedPackageManager,
    system: getSystemMetrics(),
    startTime: process.hrtime(),
  };
}
