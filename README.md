# Structify

Structify is a professional, open-source developer productivity platform and command-line interface (CLI) designed to eliminate repetitive project setup. It provides a single interactive command capable of generating production-ready, standardized application architectures tailored to a developer's chosen technology stack.

## The Problem

Every time developers start a new project, they spend hours or days executing repetitive setup tasks:

- Creating folder structures manually.
- Installing and configuring package managers.
- Writing boilerplate configuration files for linters (ESLint), formatters (Prettier), compilers (TypeScript), and editor settings (EditorConfig).
- Setting up databases, ORMs, and schemas.
- Configuring containerization (Docker) and CI/CD pipelines (GitHub Actions).
- Installing testing frameworks and scaffolding core directories.

Existing scaffolding generators are often restricted to a single technology stack (e.g., `create-next-app` or `nest new`) or generate minimal, unconfigured templates that require significant manual work to become production-ready.

## The Solution

Structify automates the entire project initialization process while remaining:

- **Transparent**: Produces a clear execution plan prior to running any operations.
- **Predictable**: Follows deterministic rules with full dry-run support.
- **Safe**: Implements a transactional file-system wrapper that backs up existing configurations and supports automatic rollbacks upon failure.
- **Framework-Agnostic**: Dynamically adapts templates, configurations, and scripts based on the combination of selected tools.

## Key Design Principles

1. **Minimal Effort, Premium Output**: Setup a complete production-grade workspace in seconds with standard directory conventions, linting, formatting, containerization, and configuration.
2. **Deterministic & Safe**: No hidden side-effects. Safe file execution with automated rolling backups.
3. **Opinionated but Extensible**: Provides optimized default configurations while allowing deep customization via user-defined presets, configuration files, and custom templates.
4. **Loosely Coupled & Modular**: Every core engine is isolated, making it easy to swap generators, add styling options, or introduce new databases.
5. **AI-Ready Integration**: Built-in Model Context Protocol (MCP) server allows AI assistants to interactively scaffold, inspect, and repair projects.

## Project Structure

Structify is managed as a monorepo containing:

- `apps/cli`: The main interactive Command Line Interface.
- `apps/mcp-server`: Model Context Protocol server exposing Structify tools to AI agents.
- `packages/core`: Core business logic, including the planning engine, validation logic, and file-system abstraction.
- `packages/generators`: Generator engines for different frameworks.
- `packages/templates`: Base structure files and config configurations.
- `docs/`: In-depth architecture blueprints, design guides, and schemas.

Refer to the [Architecture Guide](docs/architecture_guide.md) to understand the system design.
