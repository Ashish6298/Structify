import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  PresetDefinitionV1,
  PresetDefinitionSchemaV1,
  migratePresetToV1,
} from './preset-schema.js';
import { ProjectConfig } from '../types/index.js';

export interface PresetListItem {
  name: string;
  description: string;
  version: string;
  schemaVersion: string;
  origin: 'built-in' | 'repository' | 'global';
  filePath?: string;
  compatibility: 'compatible' | 'incompatible';
}

const BUILTIN_PRESETS_V1: Record<string, PresetDefinitionV1> = {
  'next-postgres-tailwind': {
    meta: {
      name: 'next-postgres-tailwind',
      description: 'Next.js frontend with PostgreSQL database, Prisma ORM, and Tailwind CSS.',
      version: '1.0.0',
      schemaVersion: '1.0',
      author: 'Structify Core',
      tags: ['next', 'postgres', 'tailwind', 'prisma'],
    },
    config: {
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
        database: 'postgres',
        orm: 'prisma',
        packageManager: 'npm',
      },
      tools: {
        docker: true,
        eslint: true,
        prettier: true,
      },
    },
  },
  'vite-react-tailwind': {
    meta: {
      name: 'vite-react-tailwind',
      description: 'Vite React frontend with Tailwind CSS.',
      version: '1.0.0',
      schemaVersion: '1.0',
      author: 'Structify Core',
      tags: ['react', 'vite', 'tailwind'],
    },
    config: {
      version: '1.0',
      mode: 'frontend-only',
      language: 'typescript',
      stack: {
        frontend: 'vite-react',
        backend: 'none',
        styling: 'tailwind',
        database: 'none',
        orm: 'none',
        packageManager: 'npm',
      },
      tools: {
        eslint: true,
        prettier: true,
      },
    },
  },
  'express-mongoose': {
    meta: {
      name: 'express-mongoose',
      description: 'Express.js backend with MongoDB database and Mongoose.',
      version: '1.0.0',
      schemaVersion: '1.0',
      author: 'Structify Core',
      tags: ['express', 'mongodb', 'mongoose'],
    },
    config: {
      version: '1.0',
      mode: 'backend-only',
      language: 'typescript',
      stack: {
        frontend: 'none',
        backend: 'express',
        styling: 'none',
        database: 'mongodb',
        orm: 'mongoose',
        packageManager: 'npm',
      },
      tools: {
        docker: true,
        eslint: true,
        prettier: true,
      },
    },
  },
};

export class PresetManager {
  private cache: Map<
    string,
    {
      preset: PresetDefinitionV1;
      mtime: number;
      origin: 'repository' | 'global' | 'built-in';
      filePath?: string;
    }
  > = new Map();

  constructor(
    private cwd: string = process.cwd(),
    private globalConfigDir: string = path.join(os.homedir(), '.structify', 'presets'),
  ) {
    // Ensure global preset directory exists
    if (!fs.existsSync(this.globalConfigDir)) {
      try {
        fs.mkdirSync(this.globalConfigDir, { recursive: true });
      } catch (e) {
        // Ignore folder creation errors
      }
    }
  }

  public getGlobalDir(): string {
    return this.globalConfigDir;
  }

  public getRepositoryDir(): string {
    return path.join(this.cwd, '.structify', 'presets');
  }

  /**
   * Discovers and retrieves all presets available.
   */
  public async listPresets(): Promise<PresetListItem[]> {
    const list: PresetListItem[] = [];

    // 1. Built-in presets
    Object.keys(BUILTIN_PRESETS_V1).forEach((name) => {
      const p = BUILTIN_PRESETS_V1[name];
      list.push({
        name,
        description: p.meta.description,
        version: p.meta.version,
        schemaVersion: p.meta.schemaVersion,
        origin: 'built-in',
        compatibility: 'compatible',
      });
    });

    // 2. Global presets
    if (fs.existsSync(this.globalConfigDir)) {
      const files = fs.readdirSync(this.globalConfigDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(this.globalConfigDir, file);
        try {
          const preset = this.loadFromFile(filePath);
          // Deduplicate: user overrides built-in
          const idx = list.findIndex((item) => item.name === preset.meta.name);
          const listItem: PresetListItem = {
            name: preset.meta.name,
            description: preset.meta.description,
            version: preset.meta.version,
            schemaVersion: preset.meta.schemaVersion,
            origin: 'global',
            filePath,
            compatibility: 'compatible',
          };
          if (idx !== -1) {
            list[idx] = listItem;
          } else {
            list.push(listItem);
          }
        } catch (e) {
          // Ignore invalid global presets
        }
      }
    }

    // 3. Repository presets
    const repoDir = this.getRepositoryDir();
    if (fs.existsSync(repoDir)) {
      const files = fs.readdirSync(repoDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(repoDir, file);
        try {
          const preset = this.loadFromFile(filePath);
          // Deduplicate: repository overrides user & built-in
          const idx = list.findIndex((item) => item.name === preset.meta.name);
          const listItem: PresetListItem = {
            name: preset.meta.name,
            description: preset.meta.description,
            version: preset.meta.version,
            schemaVersion: preset.meta.schemaVersion,
            origin: 'repository',
            filePath,
            compatibility: 'compatible',
          };
          if (idx !== -1) {
            list[idx] = listItem;
          } else {
            list.push(listItem);
          }
        } catch (e) {
          // Ignore invalid repository presets
        }
      }
    }

    return list;
  }

  /**
   * Resolves a preset by name checking paths in precedence order.
   */
  public async getPreset(name: string): Promise<PresetDefinitionV1> {
    // 1. Check Repository
    const repoPath = path.join(this.getRepositoryDir(), `${name}.json`);
    if (fs.existsSync(repoPath)) {
      return this.loadFromFileCached(repoPath, 'repository');
    }

    // 2. Check Global User
    const globalPath = path.join(this.globalConfigDir, `${name}.json`);
    if (fs.existsSync(globalPath)) {
      return this.loadFromFileCached(globalPath, 'global');
    }

    // 3. Check Built-in
    if (BUILTIN_PRESETS_V1[name]) {
      return BUILTIN_PRESETS_V1[name];
    }

    throw new Error(`PRESET_NOT_FOUND: Preset "${name}" was not found.`);
  }

  /**
   * Loads preset directly from standalone file path.
   */
  public loadStandalonePreset(filePath: string): PresetDefinitionV1 {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PRESET_NOT_FOUND: Standalone preset file not found at: ${filePath}`);
    }
    return this.loadFromFile(filePath);
  }

  /**
   * Save a preset definition to global user config folder.
   */
  public saveUserPreset(preset: PresetDefinitionV1): void {
    PresetDefinitionSchemaV1.parse(preset);
    const dest = path.join(this.globalConfigDir, `${preset.meta.name}.json`);
    fs.writeFileSync(dest, JSON.stringify(preset, null, 2), 'utf8');
  }

  /**
   * Remove user preset safely.
   */
  public deleteUserPreset(name: string): void {
    if (BUILTIN_PRESETS_V1[name]) {
      throw new Error(`PRESET_CONFLICT: Built-in preset "${name}" cannot be deleted.`);
    }
    const dest = path.join(this.globalConfigDir, `${name}.json`);
    const repoDest = path.join(this.getRepositoryDir(), `${name}.json`);

    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    } else if (fs.existsSync(repoDest)) {
      fs.unlinkSync(repoDest);
    } else {
      throw new Error(`PRESET_NOT_FOUND: Editable preset "${name}" was not found.`);
    }
  }

  /**
   * Merges settings deterministically: defaults -> preset -> config file -> CLI overrides.
   */
  public static mergeConfiguration(
    defaults: Partial<ProjectConfig>,
    preset: Partial<ProjectConfig>,
    config: Partial<ProjectConfig>,
    cli: Partial<ProjectConfig>,
  ): ProjectConfig {
    const mergeObjects = (
      target: Record<string, unknown>,
      source: Record<string, unknown>,
    ): Record<string, unknown> => {
      const output = { ...target };
      if (source && typeof source === 'object') {
        Object.keys(source).forEach((key) => {
          const val = source[key];
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            output[key] = mergeObjects(
              (target[key] || {}) as Record<string, unknown>,
              val as Record<string, unknown>,
            );
          } else {
            output[key] = val;
          }
        });
      }
      return output;
    };

    let merged = mergeObjects(
      defaults as Record<string, unknown>,
      preset as Record<string, unknown>,
    );
    merged = mergeObjects(merged, config as Record<string, unknown>);
    merged = mergeObjects(merged, cli as Record<string, unknown>);

    return merged as unknown as ProjectConfig;
  }

  private loadFromFile(filePath: string): PresetDefinitionV1 {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      return migratePresetToV1(parsed);
    } catch (e) {
      const err = e as Error;
      throw new Error(
        `PRESET_SCHEMA_INVALID: Failed to parse preset at ${path.basename(filePath)}: ${err.message}`,
      );
    }
  }

  private loadFromFileCached(
    filePath: string,
    origin: 'repository' | 'global',
  ): PresetDefinitionV1 {
    const stat = fs.statSync(filePath);
    const mtime = stat.mtimeMs;
    const cached = this.cache.get(filePath);

    if (cached && cached.mtime === mtime) {
      return cached.preset;
    }

    const preset = this.loadFromFile(filePath);
    this.cache.set(filePath, { preset, mtime, origin, filePath });
    return preset;
  }
}
