# Presets and Configuration Files

Structify supports configuration-driven project generation. This document describes the schema for the config file (`structify.json`) and user presets.

---

## Configuration Schema (`structify.json`)

The following is the JSON Schema definition for `structify.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "StructifyConfig",
  "type": "object",
  "properties": {
    "projectName": {
      "type": "string",
      "pattern": "^[a-z0-9-_]+$"
    },
    "version": {
      "type": "string",
      "enum": ["1.0"]
    },
    "stack": {
      "type": "object",
      "properties": {
        "frontend": {
          "type": "string",
          "enum": ["nextjs", "react-vite", "none"]
        },
        "backend": {
          "type": "string",
          "enum": ["nestjs", "express", "none"]
        },
        "styling": {
          "type": "string",
          "enum": ["tailwind", "mui", "none"]
        },
        "database": {
          "type": "string",
          "enum": ["postgresql", "mongodb", "none"]
        },
        "orm": {
          "type": "string",
          "enum": ["prisma", "mongoose", "none"]
        },
        "packageManager": {
          "type": "string",
          "enum": ["npm"]
        }
      },
      "required": ["frontend", "backend", "database", "packageManager"]
    },
    "features": {
      "type": "object",
      "properties": {
        "docker": { "type": "boolean" },
        "githubActions": { "type": "boolean" },
        "git": { "type": "boolean" },
        "linting": { "type": "boolean" }
      },
      "additionalProperties": false
    }
  },
  "required": ["projectName", "version", "stack"]
}
```

---

## Example Config File

Below is a complete, valid `structify.json` config file for a Next.js full-stack project using Prisma and PostgreSQL with npm:

```json
{
  "projectName": "my-cool-app",
  "version": "1.0",
  "stack": {
    "frontend": "nextjs",
    "backend": "none",
    "styling": "tailwind",
    "database": "postgresql",
    "orm": "prisma",
    "packageManager": "npm"
  },
  "features": {
    "docker": true,
    "githubActions": true,
    "git": true,
    "linting": true
  }
}
```

---

## Presets Management

Presets are structured config files containing metadata, configuration, and extensibility sections.

### Precedence / Discovery Order

Structify searches for presets in the following priority order:

1. **Repository Presets**: `.structify/presets/*.json` in the current workspace.
2. **Global Presets**: `~/.structify/presets/*.json` (OS-appropriate config path).
3. **Built-in Presets**: Bundled natively within Structify.

Local repository presets override global presets, and global presets override built-in ones.

### File Format: `v1.0` Schema Layout

```json
{
  "meta": {
    "name": "next-postgres-tailwind",
    "description": "Next.js frontend with PostgreSQL database, Prisma ORM, and Tailwind CSS.",
    "version": "1.0.0",
    "schemaVersion": "1.0",
    "author": "user",
    "tags": ["next", "postgres", "tailwind"]
  },
  "config": {
    "version": "1.0",
    "mode": "frontend-only",
    "stack": {
      "frontend": "next",
      "backend": "none",
      "styling": "tailwind",
      "database": "postgres",
      "orm": "prisma",
      "packageManager": "npm"
    },
    "tools": {
      "docker": true,
      "eslint": true,
      "prettier": true
    }
  }
}
```

### Merging Sequence

When initiating project generation, settings are merged deterministically in the following priority order:

1. **Structify Defaults** (baseline settings)
2. **Preset Values** (referenced via `--preset` or `--preset-file`)
3. **Config File** (supplied via `--config`)
4. **CLI Flags / Prompts** (highest priority command-line overrides)

### CLI Command Options

- `structify preset list`: Lists all available presets with their origin and schema version.
- `structify preset show <name>`: Displays the preset details.
- `structify preset path`: Queries the preset directory path.
- `structify preset validate <filePath>`: Audits a preset JSON file.
- `structify preset create <name>`: Creates a default preset template file.
- `structify preset export <name> <dest>`: Exports a preset config.
- `structify preset import <src>`: Installs a preset from an external path.
- `structify preset remove <name>`: Deletes a user preset safely.
- `structify preset rename <old> <new>`: Renames a user preset.
- `structify preset copy <src> <dest>`: Copies a preset definition.
- `structify preset edit <name>`: Opens the preset in the terminal's default editor.
- `structify preset info <name>`: Queries compatibility data.
