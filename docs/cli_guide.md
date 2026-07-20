# CLI Guide

This guide describes how to run and use the Structify command-line interface.

## Table of Contents

1. [Overview](#overview)
2. [Global Options](#global-options)
3. [Commands Reference](#commands-reference)
4. [Current Command Behavior](#current-command-behavior)

---

## Overview

Structify provides an interactive CLI tool for setting up, inspecting, and verifying modern software architectures.

Execute the tool using `npx`:

```bash
npx structify [command] [options]
```

---

## Global Options

The following flags can be passed to the root program or any subcommand:

- `--verbose`: Prints additional diagnostic information.
- `--debug`: Prints stack traces for unexpected errors.
- `--json`: Outputs machine-readable JSON for supported commands.
- `--no-color`: Disables colored ANSI output.
- `--cwd <path>`: Runs the command relative to the specified working directory.

---

## Commands Reference

### 1. `structify init`

- **Description**: Generates deterministic npm-first starter files for a validated project stack.
- **Options**:
  - `-d, --dry-run`: Runs compilation and shows planned execution steps without writing files.
  - `-c, --config <path>`: Specifies configuration template JSON.
  - `-p, --preset <name>`: Uses predefined stack preset (e.g. `next-postgres-tailwind`).
  - `-y, --yes`: Skips configuration prompts and runs using default options.
  - `--output <path>`: Chooses the target project directory.
  - `--verify`: Runs offline structural validation after generation.

Interactive `init` can generate predefined frontend templates for Portfolio Website, SaaS Landing Page, Admin Dashboard, Agency / Business Website, and Blog / Content Website. It can also generate predefined backend templates for Express REST API, NestJS REST API, Fastify API, Hono API, and Node.js Authentication API. Fullstack predefined templates remain Coming Soon. The frontend templates generate rich starter UIs with reusable section components, UI primitives, layout wrappers, and data files:

- Next.js: `app/page.tsx`, `app/globals.css`, `components/sections/*`, `components/ui/*`, `components/layout/*`, and `data/template-data.ts`.
- Vite React: `src/App.tsx`, `src/index.css`, `src/components/sections/*`, `src/components/ui/*`, `src/components/layout/*`, and `src/data/template-data.ts`.
- Tailwind CSS templates include Tailwind directives and visible utility-class styling.
- Material UI templates use MUI components from `@mui/material`.
- None styling templates use semantic React markup with a small generated stylesheet.

Backend predefined templates generate TypeScript API starters with framework-specific routing, controllers or modules, services, middleware, configuration, `.env.example`, ESLint, Prettier, health endpoints, README files, and npm scripts for development, build, lint, and start.

### 2. `structify generate`

- **Description**: Compatibility alias for `init`. Runs the exact same scaffolding engine and accepts all `init` options.
- **Options**: Same options as `structify init` (e.g. `-c, --config <path>`, `-p, --preset <name>`, `-y, --yes`, `-d, --dry-run`).

### 3. `structify preset`

- **Description**: Lists and shows configuration presets.
- **Subcommands / Actions**:
  - `preset list`: Lists the names of all built-in configuration presets.
  - `preset show <name>`: Displays the JSON configuration structure for a preset. Throws `PRESET_NOT_FOUND` if unknown.
  - `preset path`: Prints the location path of preset configurations.

### 4. `structify validate`

- **Description**: Validates configuration JSON files or examples against compatibility rules.
- **Options**:
  - `-c, --config <path>`: Validates target JSON file compatibility.
  - `-e, --example`: Validates the built-in demo stack configuration.

### 5. `structify doctor`

- **Description**: Performs a read-only environment check on Node.js, npm, Git, Docker, and workspace access.

### 6. `structify add <module>`

- **Description**: Plan-only module interface. It does not write files in this release.

### 7. `structify inspect`

- **Description**: Prints Structify project metadata, manifest, Project Graph, package scripts, and event timeline when present.

### 8. `structify repair`

- **Description**: Inspect-only repair surface. It does not write files in this release.

---

## Current Command Behavior

`init`, `generate`, `preset`, `validate`, `doctor`, `inspect`, and `verify-project` are implemented. `add` and `repair` intentionally return plan-only or inspect-only responses until later workflows are implemented.

Generated projects default to npm. Dry-run mode writes no files and reports planned files through `plannedFiles`, `virtualFileGraph`, and `data.graph`.
`generate` command routes directly to the same underlying creation logic as `init`.
`preset` command provides built-in profile listing and inspect functionality; dynamic preset loading from external configuration paths belongs to Phase 6.
