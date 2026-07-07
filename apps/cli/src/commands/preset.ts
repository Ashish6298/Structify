import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError, CLIErrorCode } from '../utils/error.js';
import { getElapsedMs } from '../utils/middleware.js';
import { PresetManager, PresetDefinitionV1, migratePresetToV1 } from '@structify/core';

export async function handlePreset(
  action: string,
  presetName: string | undefined,
  extraArg: string | undefined,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  const elapsed = getElapsedMs(context.startTime);
  const manager = new PresetManager(context.cwd);

  const formatError = (e: unknown): { code: CLIErrorCode; message: string } => {
    const err = e as Error;
    const msg = err.message || String(err);
    if (msg.includes('PRESET_NOT_FOUND')) {
      return { code: 'PRESET_NOT_FOUND', message: msg };
    }
    if (msg.includes('PRESET_SCHEMA_INVALID')) {
      return { code: 'PRESET_SCHEMA_INVALID', message: msg };
    }
    if (msg.includes('PRESET_VERSION_UNSUPPORTED')) {
      return { code: 'PRESET_VERSION_UNSUPPORTED', message: msg };
    }
    if (msg.includes('PRESET_CONFLICT')) {
      return { code: 'PRESET_CONFLICT', message: msg };
    }
    return { code: 'INTERNAL_ERROR', message: msg };
  };

  try {
    if (action === 'list') {
      const presets = await manager.listPresets();
      if (context.json) {
        output.json({
          success: true,
          command: 'preset list',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: { presets },
        });
        return;
      }

      output.heading('Structify Configuration Presets');
      presets.forEach((p) => {
        output.info(`- ${p.name} [${p.origin}] (v${p.version})`);
        output.info(`  Description: ${p.description}`);
      });
      output.showFooter('preset list');
      return;
    }

    if (action === 'show') {
      if (!presetName) {
        throw new StructifyCLIError('USAGE_ERROR', 'Preset name is required.');
      }
      const preset = await manager.getPreset(presetName);
      if (context.json) {
        output.json({
          success: true,
          command: 'preset show',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: preset,
        });
        return;
      }

      output.heading(`Preset: ${preset.meta.name}`);
      output.info(`Version: ${preset.meta.version}`);
      output.info(`Author: ${preset.meta.author || 'Unknown'}`);
      output.info(`Description: ${preset.meta.description}`);
      output.divider();
      output.info(JSON.stringify(preset.config, null, 2));
      output.showFooter('preset show');
      return;
    }

    if (action === 'path') {
      const globalDir = manager.getGlobalDir();
      if (context.json) {
        output.json({
          success: true,
          command: 'preset path',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: { path: globalDir },
        });
        return;
      }

      output.info(`Global Presets Path: ${globalDir}`);
      output.showFooter('preset path');
      return;
    }

    if (action === 'validate') {
      if (!presetName) {
        throw new StructifyCLIError(
          'USAGE_ERROR',
          'File path or preset name is required to validate.',
        );
      }
      let preset: PresetDefinitionV1;
      let filePath = presetName;

      if (fs.existsSync(presetName)) {
        preset = manager.loadStandalonePreset(presetName);
      } else {
        const found = (await manager.listPresets()).find((p) => p.name === presetName);
        if (!found || !found.filePath) {
          throw new Error(`PRESET_NOT_FOUND: Preset file not found for name: ${presetName}`);
        }
        filePath = found.filePath;
        preset = await manager.getPreset(presetName);
      }

      if (context.json) {
        output.json({
          success: true,
          command: 'preset validate',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: {
            valid: true,
            filePath,
            preset,
          },
        });
        return;
      }

      output.success(`Preset file ${path.basename(filePath)} is valid.`);
      output.showFooter('preset validate');
      return;
    }

    if (action === 'create') {
      if (!presetName) {
        throw new StructifyCLIError('USAGE_ERROR', 'Preset name is required.');
      }
      const templatePreset: PresetDefinitionV1 = {
        meta: {
          name: presetName,
          description: 'A custom user-defined config preset.',
          version: '1.0.0',
          schemaVersion: '1.0',
          author: 'user',
          creationTimestamp: new Date().toISOString(),
          updateTimestamp: new Date().toISOString(),
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
      };

      manager.saveUserPreset(templatePreset);

      if (context.json) {
        output.json({
          success: true,
          command: 'preset create',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: {
            name: presetName,
            filePath: path.join(manager.getGlobalDir(), `${presetName}.json`),
          },
        });
        return;
      }

      output.success(`User preset "${presetName}" created successfully.`);
      output.showFooter('preset create');
      return;
    }

    if (action === 'export') {
      if (!presetName || !extraArg) {
        throw new StructifyCLIError(
          'USAGE_ERROR',
          'Usage: structify preset export <presetName> <destFilePath>',
        );
      }
      const preset = await manager.getPreset(presetName);
      const dest = path.resolve(context.cwd, extraArg);
      fs.writeFileSync(dest, JSON.stringify(preset, null, 2), 'utf8');

      if (context.json) {
        output.json({
          success: true,
          command: 'preset export',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: {
            exported: presetName,
            destination: dest,
          },
        });
        return;
      }

      output.success(`Preset "${presetName}" successfully exported to: ${dest}`);
      output.showFooter('preset export');
      return;
    }

    if (action === 'import') {
      if (!presetName) {
        throw new StructifyCLIError(
          'USAGE_ERROR',
          'Usage: structify preset import <sourceFilePath>',
        );
      }
      const src = path.resolve(context.cwd, presetName);
      if (!fs.existsSync(src)) {
        throw new StructifyCLIError('PRESET_IMPORT_FAILED', `Import source file not found: ${src}`);
      }

      let preset: PresetDefinitionV1;
      try {
        const content = fs.readFileSync(src, 'utf8');
        preset = migratePresetToV1(JSON.parse(content));
      } catch (e) {
        const err = e as Error;
        throw new StructifyCLIError(
          'PRESET_SCHEMA_INVALID',
          `Preset schema validation failed during import: ${err.message}`,
        );
      }

      manager.saveUserPreset(preset);

      if (context.json) {
        output.json({
          success: true,
          command: 'preset import',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: {
            imported: preset.meta.name,
            filePath: path.join(manager.getGlobalDir(), `${preset.meta.name}.json`),
          },
        });
        return;
      }

      output.success(`Preset "${preset.meta.name}" successfully imported.`);
      output.showFooter('preset import');
      return;
    }

    if (action === 'remove') {
      if (!presetName) {
        throw new StructifyCLIError('USAGE_ERROR', 'Preset name is required.');
      }
      manager.deleteUserPreset(presetName);

      if (context.json) {
        output.json({
          success: true,
          command: 'preset remove',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: { removed: presetName },
        });
        return;
      }

      output.success(`Preset "${presetName}" removed successfully.`);
      output.showFooter('preset remove');
      return;
    }

    if (action === 'rename') {
      if (!presetName || !extraArg) {
        throw new StructifyCLIError(
          'USAGE_ERROR',
          'Usage: structify preset rename <oldName> <newName>',
        );
      }
      const presets = await manager.listPresets();
      const found = presets.find((p) => p.name === presetName);
      if (!found || found.origin === 'built-in' || !found.filePath) {
        throw new StructifyCLIError(
          'PRESET_CONFLICT',
          `Preset "${presetName}" is built-in or cannot be renamed.`,
        );
      }

      const preset = await manager.getPreset(presetName);
      preset.meta.name = extraArg;
      preset.meta.updateTimestamp = new Date().toISOString();

      manager.saveUserPreset(preset);
      fs.unlinkSync(found.filePath);

      if (context.json) {
        output.json({
          success: true,
          command: 'preset rename',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: { oldName: presetName, newName: extraArg },
        });
        return;
      }

      output.success(`Preset "${presetName}" successfully renamed to "${extraArg}".`);
      output.showFooter('preset rename');
      return;
    }

    if (action === 'copy') {
      if (!presetName || !extraArg) {
        throw new StructifyCLIError(
          'USAGE_ERROR',
          'Usage: structify preset copy <srcName> <destName>',
        );
      }
      const preset = await manager.getPreset(presetName);
      preset.meta.name = extraArg;
      preset.meta.creationTimestamp = new Date().toISOString();
      preset.meta.updateTimestamp = new Date().toISOString();

      manager.saveUserPreset(preset);

      if (context.json) {
        output.json({
          success: true,
          command: 'preset copy',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: { source: presetName, destination: extraArg },
        });
        return;
      }

      output.success(`Preset "${presetName}" successfully copied to "${extraArg}".`);
      output.showFooter('preset copy');
      return;
    }

    if (action === 'edit') {
      if (!presetName) {
        throw new StructifyCLIError('USAGE_ERROR', 'Preset name is required.');
      }
      const presets = await manager.listPresets();
      const found = presets.find((p) => p.name === presetName);
      if (!found || found.origin === 'built-in' || !found.filePath) {
        throw new StructifyCLIError(
          'PRESET_CONFLICT',
          `Preset "${presetName}" is built-in and cannot be edited.`,
        );
      }

      const editor = process.env.EDITOR || 'code';
      if (context.json) {
        output.json({
          success: true,
          command: 'preset edit',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: { filePath: found.filePath, editor },
        });
        return;
      }

      output.info(`File path: ${found.filePath}`);
      output.info(`Opening with editor: ${editor}...`);

      exec(`${editor} "${found.filePath}"`, (err) => {
        if (err) {
          output.warn(`Failed to open editor automatically. Please edit manually.`);
        }
      });
      return;
    }

    if (action === 'info') {
      if (!presetName) {
        throw new StructifyCLIError('USAGE_ERROR', 'Preset name is required.');
      }
      const presets = await manager.listPresets();
      const found = presets.find((p) => p.name === presetName);
      if (!found) {
        throw new StructifyCLIError('PRESET_NOT_FOUND', `Preset "${presetName}" was not found.`);
      }

      const preset = await manager.getPreset(presetName);

      if (context.json) {
        output.json({
          success: true,
          command: 'preset info',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          warnings: [],
          errors: [],
          data: {
            meta: preset.meta,
            origin: found.origin,
            filePath: found.filePath || 'built-in',
            compatibility: found.compatibility,
            stackSummary: preset.config.stack,
          },
        });
        return;
      }

      output.heading(`Preset Info: ${presetName}`);
      output.info(`Origin: ${found.origin}`);
      output.info(`File Path: ${found.filePath || 'Internal built-in'}`);
      output.info(`Compatibility: ${found.compatibility}`);
      output.divider();
      output.info(`Frontend: ${preset.config.stack.frontend || 'none'}`);
      output.info(`Backend: ${preset.config.stack.backend || 'none'}`);
      output.info(`Styling: ${preset.config.stack.styling || 'none'}`);
      output.info(`Database: ${preset.config.stack.database || 'none'}`);
      output.info(`ORM: ${preset.config.stack.orm || 'none'}`);
      output.showFooter('preset info');
      return;
    }

    throw new StructifyCLIError('USAGE_ERROR', `Unknown action "${action}" for preset command.`);
  } catch (e) {
    const formatted = formatError(e);
    throw new StructifyCLIError(formatted.code, formatted.message);
  }
}
