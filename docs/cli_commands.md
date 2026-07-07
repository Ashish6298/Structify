# CLI Commands

This document outlines the proposed command-line commands, arguments, and options designed for the interactive CLI tool in future phases.

---

## 1. `structify init`

Starts an interactive questionnaire to define a new project stack.

```bash
structify init [project-name] [options]
```

### Options:

- `-d, --dry-run`: Prints the generated execution plan detailing what files and commands will run, without modifying the filesystem.
- `-y, --yes`: Skips prompts and generates a project using the default npm-first stack.
- `--preset <preset-name>`: Scaffolds a project instantly using a saved local or global preset.
- `--config <path>`: Loads a JSON Structify configuration and generates from it.
- `--output <path>`: Chooses the target project directory.
- `--json`: Emits the standardized machine-readable result.
- `--force`: Allows supported overwrites with rollback metadata.
- `--install`: Runs dependency installation through the command executor.
- `--skip-install`: Keeps generation file-only.
- `--event-log`: Writes `.structify/events.ndjson` for replayable generation events.
- `--verify`: Runs offline structural project validation after successful generation.

### Flow:

1. Prompts for Project Name.
2. Prompts for Frontend framework (Next.js, React-Vite, none).
3. Prompts for Backend framework (NestJS, Express, none).
4. Prompts for Styling option (Tailwind, Material UI, none) — dynamically disabled if Frontend framework is "none".
5. Prompts for Database (PostgreSQL, MongoDB, none).
6. Prompts for ORM (Prisma, Mongoose) — dynamically configured depending on Database.
7. Uses npm as the package manager for generated commands and next steps.
8. Prints the generated Project Plan.
9. Asks for confirmation before writing to disk.

Phase 8.2 previews the Virtual File Graph, dependency graph, Project Graph, analytics, and diff during dry-run. It uses deterministic composable generators through the built-in extension platform and does not call external framework CLIs. By default it writes package manifests and prints npm next-step install commands.

Dry-run terms:

- Planned files are virtual files calculated in memory.
- Generated files are files actually written to disk.
- In dry-run, `generatedFiles` is empty and `plannedFiles` plus `virtualFileGraph.files` show what would be written.
- Directory conflicts are reported as `TARGET_DIRECTORY_NOT_EMPTY`, not internal errors.

---

## 2. `structify verify-project`

Structurally validates a generated project without installing dependencies.

```bash
structify verify-project --path ./my-project
structify verify-project --path ./my-project --strict
```

The validator uses the Project State Reader and Drift Detector. It checks `package.json`, scripts, dependencies, `structify.config.json`, `structify.manifest.json`, `structify.project-graph.json`, stack hash consistency, manifest and Project Graph metadata consistency, selected stack files, tooling files, and generated dependency metadata. `--strict` treats drift warnings as errors. Slow checks such as `npm install`, `npm run build`, and `npm test` are reserved for optional workflows and are not part of default validation.

---

## 3. `structify add <module>`

Adds a compatible built-in module to an existing Structify project through a patch plan.

```bash
structify add docker --dry-run
structify add docker --yes
structify add docker --json
structify add prisma --database postgres --dry-run
```

The command supports `--path <projectPath>`, `--dry-run`, `--yes`, `--json`, and `--force`. It returns `MODULE_ALREADY_PRESENT`, `MODULE_INCOMPATIBLE`, or `PATCH_CONFLICT` when no patch is applied.

---

## 4. `structify upgrade`

Previews safe metadata/package upgrades.

```bash
structify upgrade --dry-run
structify upgrade --json
```

Complex source upgrades that touch user-modified generated files return `UPGRADE_REQUIRES_REVIEW`.

---

## 5. `structify repair`

Creates and optionally applies safe repair plans.

```bash
structify repair --dry-run
structify repair --apply --yes
structify repair --json
```

Repair can restore missing metadata/config files and package scripts/dependencies when safe. It does not silently overwrite user source edits.

---

## 3. `structify generate`

Scaffolds a project from a configuration file.

```bash
structify generate --config <path-to-json> [options]
```

### Options:

- `-c, --config <path>`: Required. Target `structify.json` configuration file.
- `-o, --output <dir>`: Target directory for generation (defaults to current working directory).
- `-d, --dry-run`: Runs compilation and validation, showing execution steps without writing to disk.

---

## 4. `structify preset`

Manages reusable configuration presets.

```bash
structify preset <action> [options]
```

### Subcommands:

- `list`: Shows all saved configurations.
- `save <name>`: Saves current configuration as a reusable preset under the given name.
- `delete <name>`: Deletes a saved configuration preset.

---

## 5. `structify module`

Adds modules incrementally to an existing Structify project.

```bash
structify module add <module-name> [options]
```

### Supported Modules (MVP):

- `docker`: Adds Dockerfile and docker-compose configurations.
- `github-actions`: Scaffolds a lint/test GitHub workflow.
- `prisma`: Initializes Prisma schema and configuration folders.
- `eslint`: Adds standard linting configurations to a project that skipped them initially.

---

## 6. `structify doctor`

Diagnoses health and configuration alignment for projects built with Structify.

```bash
structify doctor [--path <path>] [--json]
```

Runs a comprehensive two-section audit:

**Section 1: Environment Checks** — Node.js version, npm, Git, Docker, memory, disk space, registry access.

**Section 2: Project Health Checks** (when inside a Structify project):

- Stack detection (frontend/backend/database/ORM/styling)
- Metadata file integrity (`structify.*.json`)
- Config shape validation
- Manifest hash consistency
- Project graph node validation
- Package manager verification
- npm script drift detection
- Dependency presence check
- Generated file integrity
- Module installation status

**Status codes**: `PASS`, `INFO`, `WARNING`, `ERROR`, `FIXABLE`, `NOT_FIXABLE`

**Overall project status**: `HEALTHY`, `DEGRADED`, `CRITICAL`, `UNKNOWN`

**Options**:

- `--path <path>`: Project path to diagnose (default: current directory)
- `--json`: Machine-readable structured output with full health report
- `--no-color`: Disable ANSI color codes

See [doctor_guide.md](./doctor_guide.md) for full documentation.

---

## 7. `structify repair`

Uses the unified Project Health Engine to identify auto-fixable issues and safely restore them.

```bash
structify repair [--path <path>] [--dry-run] [--apply] [--yes] [--force] [--json]
```

**What it can fix**:

- Missing metadata files (`structify.*.json`)
- Missing safe configuration files
- Drifted npm scripts
- Missing dependency entries
- Stale manifest metadata

**Options**:

- `-d, --dry-run`: Preview repair plan (no files changed) — default
- `--apply`: Apply safe repairs
- `-y, --yes`: Apply without confirmation (use with `--apply`)
- `--force`: Allow overwriting user-modified generated files with backup
- `--path <path>`: Project path to repair
- `--json`: Machine-readable output with `code`, `fixableCount`, `notFixableCount`, `healthSummary`

**Repair codes**: `REPAIR_PLAN_READY`, `REPAIR_APPLIED`, `REPAIR_NOT_SAFE`, `NO_REPAIR_NEEDED`

See [repair_guide.md](./repair_guide.md) for full documentation.

---

## 8. Phase 8 Generation Commands

Phase 8 adds deterministic enterprise template and generator commands without changing existing command behavior.

```bash
structify generate <project-name> [options]
structify blueprint [list|show] [blueprint-id] [--json]
structify templates [list|discover] [--path <path>] [--json]
structify generators [--json]
structify validate-template [--config <path>] [--json]
structify explain-template [template-id] [--json]
structify preview [--config <path>] [--output <path>] [--json]
structify plan [--config <path>] [--output <path>] [--json]
structify render [--config <path>] [--template <id>] [--json]
```

The commands share the global CLI options: `--json`, `--verbose`, `--debug`, `--cwd`, and `--no-color`.
`preview` and `plan` use the Phase 8 output planning engine and never write files.

---

## 9. Phase 9-12 Enterprise Platform Commands

Phase 9-12 adds opt-in enterprise generation, registry, graph, diagnostics, merge explanation, profiling, migration, snapshot, and cache commands.

```bash
structify registry [action] [target] [--json] [--dry-run]
structify install [action] [target] [--json] [--dry-run]
structify uninstall [action] [target] [--json] [--dry-run]
structify update [action] [target] [--json] [--dry-run]
structify search [action] [target] [--json] [--query <query>]
structify publish [action] [target] [--json] [--dry-run]
structify validate-workspace [action] [target] [--json]
structify diagnose [action] [target] [--json] [--profile]
structify explain-generation [action] [target] [--json]
structify explain-merge [action] [target] [--json]
structify explain-blueprint [action] [target] [--json]
structify explain-hook [action] [target] [--json]
structify graph [action] [target] [--json]
structify dependency-graph [action] [target] [--json]
structify template-graph [action] [target] [--json]
structify blueprint-graph [action] [target] [--json]
structify plugin-graph [action] [target] [--json]
structify workspace-report [action] [target] [--json]
structify export-report [action] [target] [--json]
structify profile [action] [target] [--json]
structify benchmark [action] [target] [--json]
structify clean-cache [action] [target] [--json] [--dry-run]
structify warm-cache [action] [target] [--json] [--dry-run]
structify migration [action] [target] [--json] [--dry-run]
structify rollback [action] [target] [--json] [--dry-run]
structify snapshot [action] [target] [--json] [--dry-run]
structify restore [action] [target] [--json] [--dry-run]
```

These commands are additive report and planning surfaces by default. Existing commands keep their previous behavior.
