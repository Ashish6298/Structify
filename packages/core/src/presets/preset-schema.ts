import { z } from 'zod';
import { ProjectConfigSchema } from '../schemas/index.js';

// Schema version 1.0 detailed schema
export const PresetMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  version: z.string(),
  author: z.string().optional(),
  schemaVersion: z.string(),
  tags: z.array(z.string()).optional(),
  supportedOperatingSystems: z.array(z.string()).optional(),
  supportedPackageManagers: z.array(z.string()).optional(),
  supportedLanguages: z.array(z.string()).optional(),
  supportedProjectModes: z.array(z.string()).optional(),
  supportedStacks: z.array(z.string()).optional(),
  creationTimestamp: z.string().optional(),
  updateTimestamp: z.string().optional(),
  compatibility: z.string().optional(),
});

export const PresetDefinitionSchemaV1 = z
  .object({
    meta: PresetMetadataSchema,
    config: ProjectConfigSchema.omit({ projectName: true }),
    ext: z.record(z.unknown()).optional(), // Extensible metadata
  })
  .strict(); // Reject unknown fields

export type PresetDefinitionV1 = z.infer<typeof PresetDefinitionSchemaV1>;

// Migration Utility
export function migratePresetToV1(rawPreset: Record<string, unknown>): PresetDefinitionV1 {
  const schemaVersion =
    (rawPreset.meta as Record<string, unknown> | undefined)?.schemaVersion ||
    rawPreset.schemaVersion ||
    '0.1';

  if (schemaVersion === '1.0') {
    // Validate directly
    return PresetDefinitionSchemaV1.parse(rawPreset);
  }

  if (schemaVersion === '0.1') {
    // Migrate legacy flat preset format to v1.0
    const name = (rawPreset.name as string) || 'unnamed-preset';
    const description = (rawPreset.description as string) || 'Legacy preset migrated to v1.0';
    const config = (rawPreset.config as Record<string, unknown>) || {};

    const migrated: PresetDefinitionV1 = {
      meta: {
        name,
        description,
        version: '1.0.0',
        schemaVersion: '1.0',
        author: 'system',
        creationTimestamp: new Date().toISOString(),
        updateTimestamp: new Date().toISOString(),
      },
      config: {
        version: (config.version as string) || '1.0',
        mode: config.mode as 'frontend-only' | 'backend-only' | 'fullstack' | undefined,
        language: config.language as 'typescript' | undefined,
        stack: (config.stack || {}) as Record<string, unknown>,
        tools: (config.tools || {}) as Record<string, unknown>,
      },
    };

    return PresetDefinitionSchemaV1.parse(migrated);
  }

  throw new Error(
    `PRESET_VERSION_UNSUPPORTED: Preset schema version "${schemaVersion}" is unsupported.`,
  );
}
