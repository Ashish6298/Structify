import os from 'os';
import { createHash } from 'crypto';
import { NormalizedProjectConfig } from '../types/index.js';

export interface StructifyManifest {
  manifestVersion: string;
  structifyVersion: string;
  projectId: string;
  generatedAt: string;
  templateVersion: string;
  generatorVersions: Record<string, string>;
  pluginVersions: Record<string, string>;
  stackHash: string;
  templateHash: string;
  platform: {
    os: string;
    arch: string;
    node: string;
  };
  packageManager: string;
  config: NormalizedProjectConfig;
}

export function createStructifyManifest(options: {
  config: NormalizedProjectConfig;
  templatePaths: string[];
  generatorVersions?: Record<string, string>;
  pluginVersions?: Record<string, string>;
  now?: Date;
}): StructifyManifest {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const stackHash = hashStable(options.config.stack);
  const templateHash = hashStable([...options.templatePaths].sort());
  return {
    manifestVersion: '1.0.0',
    structifyVersion: '1.0.0',
    projectId: `proj-${hashStable(`${options.config.projectName}:${generatedAt}`).slice(0, 12)}`,
    generatedAt,
    templateVersion: '1.0.0',
    generatorVersions: options.generatorVersions ?? {
      'gen-phase7-deterministic': '1.0.0',
    },
    pluginVersions: options.pluginVersions ?? {
      'structify-builtins': '1.0.0',
    },
    stackHash,
    templateHash,
    platform: {
      os: os.platform(),
      arch: os.arch(),
      node: process.version,
    },
    packageManager: options.config.stack.packageManager,
    config: options.config,
  };
}

export function hashStable(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
