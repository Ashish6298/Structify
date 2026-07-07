import fs from 'fs';
import path from 'path';
import { ProjectConfig, Result } from '@structify/core';
import { StructifyCLIError } from './error.js';

export interface ConfigLoader {
  supportedExtensions: string[];
  load: (filePath: string) => Promise<ProjectConfig>;
}

export class JsonConfigLoader implements ConfigLoader {
  supportedExtensions = ['.json'];

  async load(filePath: string): Promise<ProjectConfig> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new StructifyCLIError(
        'VALIDATION_ERROR',
        `Failed to read or parse configuration file: ${message}`,
      );
    }
  }
}

// Extensible Loader Subsystem
export class ConfigurationLoaderManager {
  private loaders: ConfigLoader[] = [];

  constructor() {
    this.loaders.push(new JsonConfigLoader());
  }

  registerLoader(loader: ConfigLoader) {
    this.loaders.push(loader);
  }

  async loadAndValidate(filePath: string, cwd: string): Promise<Result<ProjectConfig>> {
    const ext = path.extname(filePath).toLowerCase();
    const loader = this.loaders.find((l) => l.supportedExtensions.includes(ext));

    if (!loader) {
      return {
        success: false,
        error: `Unsupported file extension "${ext}". Planned loaders: JSON, YAML, TOML.`,
      };
    }

    const resolvedPath = path.resolve(cwd, filePath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    try {
      const config = await loader.load(resolvedPath);
      return { success: true, data: config };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}
