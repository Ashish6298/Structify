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
7. Prompts for Package Manager (npm, pnpm).
8. Prints the generated Project Plan.
9. Asks for confirmation before writing to disk.

Phase 8.1 previews the Virtual File Graph, dependency graph, Project Graph, analytics, and diff during dry-run. It uses deterministic composable generators through the built-in extension platform and does not call external framework CLIs. By default it writes package manifests and prints npm next-step install commands.

---

## 2. `structify verify-project`

Structurally validates a generated project without installing dependencies.

```bash
structify verify-project --path ./my-project
```

The validator checks `package.json`, required scripts, `structify.config.json`, `structify.manifest.json`, `structify.project-graph.json`, and generated dependency metadata. Slow checks such as `npm install`, `npm run build`, and `npm test` are reserved for optional workflows and are not part of default validation.

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
structify doctor [path]
```

- Scans the project directory.
- Checks if standard configurations match current stack selections (e.g., checks if ESLint packages are correctly configured, or if Docker is set up properly).
- Suggests fixes and prints problem identifiers.

---

## 7. `structify repair`

Applies fixes to configurations identified by the doctor command.

```bash
structify repair [path] [options]
```

### Options:

- `--issue <id>`: Fixes a specific issue ID identified by the doctor.
- `-y, --yes`: Fixes all auto-repairable issues without prompting.
