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
          "enum": ["npm", "pnpm"]
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

Presets are stored under the user's home configuration directory (e.g., `~/.config/structify/presets/`) or globally. A preset is a simple reusable stack configuration template:

### File Format: `~/.config/structify/presets/nextjs-postgres-tailwind.json`

```json
{
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
