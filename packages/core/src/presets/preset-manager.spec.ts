import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PresetManager } from './preset-manager.js';
import { migratePresetToV1, PresetDefinitionSchemaV1 } from './preset-schema.js';

describe('Preset Schema and Migrations', () => {
  it('validates a correct v1.0 preset definition', () => {
    const valid = {
      meta: {
        name: 'test-preset',
        description: 'Test description',
        version: '1.0.0',
        schemaVersion: '1.0',
      },
      config: {
        version: '1.0',
        mode: 'frontend-only',
        stack: {
          frontend: 'next',
          packageManager: 'npm',
        },
      },
    };
    const parsed = PresetDefinitionSchemaV1.parse(valid);
    expect(parsed.meta.name).toBe('test-preset');
  });

  it('rejects unknown fields in strict mode', () => {
    const invalid = {
      meta: {
        name: 'test-preset',
        description: 'Test description',
        version: '1.0.0',
        schemaVersion: '1.0',
      },
      config: {
        version: '1.0',
        mode: 'frontend-only',
      },
      unknownField: 'should fail',
    };
    expect(() => PresetDefinitionSchemaV1.parse(invalid)).toThrow();
  });

  it('migrates a v0.1 flat preset format to v1.0 schema format', () => {
    const legacy = {
      name: 'legacy-preset',
      description: 'Legacy desc',
      schemaVersion: '0.1',
      config: {
        mode: 'backend-only',
        stack: {
          backend: 'express',
        },
      },
    };
    const migrated = migratePresetToV1(legacy);
    expect(migrated.meta.schemaVersion).toBe('1.0');
    expect(migrated.meta.name).toBe('legacy-preset');
    expect(migrated.config.mode).toBe('backend-only');
    expect(migrated.config.version).toBe('1.0');
  });
});

describe('PresetManager Lifecycle and Merging', () => {
  let tempCwd: string;
  let tempGlobalDir: string;
  let manager: PresetManager;

  beforeEach(() => {
    tempCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-repo-'));
    tempGlobalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-global-'));
    manager = new PresetManager(tempCwd, tempGlobalDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempCwd, { recursive: true, force: true });
      fs.rmSync(tempGlobalDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup failures
    }
  });

  it('lists default built-in presets', async () => {
    const list = await manager.listPresets();
    expect(list.some((p) => p.name === 'next-postgres-tailwind')).toBe(true);
    expect(list.some((p) => p.name === 'vite-react-tailwind')).toBe(true);
  });

  it('discovers repository presets over global/built-in presets', async () => {
    // Write global preset
    const globalPreset = {
      meta: {
        name: 'next-postgres-tailwind',
        description: 'Global version',
        version: '1.0.0',
        schemaVersion: '1.0',
      },
      config: { version: '1.0', mode: 'fullstack', stack: { frontend: 'next' } },
    };
    fs.mkdirSync(tempGlobalDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempGlobalDir, 'next-postgres-tailwind.json'),
      JSON.stringify(globalPreset),
      'utf8',
    );

    // Write repository preset
    const repoDir = path.join(tempCwd, '.structify', 'presets');
    fs.mkdirSync(repoDir, { recursive: true });
    const repoPreset = {
      meta: {
        name: 'next-postgres-tailwind',
        description: 'Repo version',
        version: '1.0.0',
        schemaVersion: '1.0',
      },
      config: { version: '1.0', mode: 'frontend-only', stack: { frontend: 'next' } },
    };
    fs.writeFileSync(
      path.join(repoDir, 'next-postgres-tailwind.json'),
      JSON.stringify(repoPreset),
      'utf8',
    );

    const resolved = await manager.getPreset('next-postgres-tailwind');
    expect(resolved.meta.description).toBe('Repo version');
    expect(resolved.config.mode).toBe('frontend-only');
  });

  it('supports configuration merging order', () => {
    const defaults = {
      version: '1.0',
      mode: 'frontend-only' as const,
      stack: { packageManager: 'npm' as const },
    };
    const preset = {
      mode: 'fullstack' as const,
      stack: { frontend: 'next' as const },
    };
    const configFile = { stack: { backend: 'express' as const } };
    const cliOverride = {
      stack: { packageManager: 'npm' as const },
      projectName: 'cli-project',
    };

    const merged = PresetManager.mergeConfiguration(
      defaults as unknown as Record<string, unknown>,
      preset as unknown as Record<string, unknown>,
      configFile as unknown as Record<string, unknown>,
      cliOverride as unknown as Record<string, unknown>,
    );
    expect(merged.mode).toBe('fullstack');
    expect(merged.stack.frontend).toBe('next');
    expect(merged.stack.backend).toBe('express');
    expect(merged.projectName).toBe('cli-project');
  });
});
