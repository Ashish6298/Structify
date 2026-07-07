# Project Roadmap

This document outlines the sequential phases of the Structify implementation plan.

## Phase 1: Architecture, Scope Lock, and Foundation Design (Complete)

- **Objective**: Define the high-level design, product requirements, system interactions, and compatibility matrices.
- **Deliverables**: Product vision documents, architecture blueprints, coding guidelines, testing strategies, and supported stack matrices.
- **Dependencies**: None.
- **Success Criteria**: All planning documents finalized, approved, and free from early execution code.

## Phase 2: Monorepo Scaffolding & Core Architecture

- **Objective**: Initialize the repository workspace and build core packages.
- **Deliverables**:
  - Root monorepo workspace configuration (`package.json`, TypeScript configs, ESLint configs).
  - Empty package folders under `packages/` and placeholder applications under `apps/`.
  - Core validation types and the schema validation models (`packages/core`).
- **Dependencies**: Completion of Phase 1.
- **Success Criteria**: Monorepo successfully boots and lints empty configurations.

## Phase 3: File System Layer & Execution Engine

- **Objective**: Build the transactional file writer and execution planner.
- **Deliverables**:
  - File System wrapper with atomic writes, dry-run mode, and backup utility.
  - Rollback controller capable of reverting changed files if an installation step fails.
  - Step execution framework (`CreateFolder`, `WriteFile`, `RunCommand`).
- **Dependencies**: Phase 2.
- **Success Criteria**: Unit tests prove file backups are created and restored correctly upon command execution failure.

## Phase 4: CLI Core & Prompt System

- **Objective**: Develop the interactive CLI command flow.
- **Deliverables**:
  - Command routing (`init`, `generate`, `preset`).
  - Interactive prompts for project mode, framework, database, styling, ORM, and npm defaults.
  - Integration of dynamic validation checks during the questionnaire.
- **Dependencies**: Phase 3.
- **Success Criteria**: Running the CLI command shows prompts and stops invalid stack choices from being chosen.

## Phase 5: Generator Engines & Initial Stacks

- **Objective**: Implement scaffolding templates and generation rules for the MVP stacks.
- **Deliverables**:
  - npm-first scaffolding templates for Next.js, React (Vite), Express, and NestJS.
  - Config templates for Tailwind CSS, Material UI, ESLint, Prettier, and Docker.
  - Setup rules for Prisma and Mongoose.
- **Dependencies**: Phase 4.
- **Success Criteria**: CLI successfully scaffolds a working, compiling React + Tailwind or NextJS + Prisma project.

## Phase 6: Presets & Config-driven Generation

- **Objective**: Enable non-interactive project generation using files.
- **Deliverables**:
  - Structify configuration parser (`structify.json`).
  - Config-driven generation through `structify init --config <path>`.
- **Dependencies**: Phase 5.
- **Success Criteria**: Executing the generator with a `structify.json` file configures the project identical to the interactive prompt flow.

## Phase 7: Doctor & Repair System

- **Objective**: Build diagnostics tool to check existing project configurations.
- **Deliverables**:
  - Stack Detection Engine to inspect existing directories.
  - `structify doctor` diagnostics tool.
  - Plan-only `structify add` surface.
  - Inspect-only `structify repair` surface.
- **Dependencies**: Phase 6.
- **Success Criteria**: Doctor correctly flags missing configs or wrong dependencies and repair fixes them.

## Phase 8: Model Context Protocol (MCP) Server

- **Objective**: Enable AI coding assistants to use Structify tools directly.
- **Deliverables**:
  - `apps/mcp-server` implementing the Model Context Protocol.
  - Exposed read-only tools for stack listing, validation, planning, diff preview, inspection, generators, templates, plugins, modules, events, and doctor data.
  - Integration documentation.
- **Dependencies**: Phase 7.
- **Success Criteria**: MCP-compliant client can discover, trigger, and verify output of Structify tools.

## Phase 9: Testing, Optimization, and Release

- **Objective**: Complete upgrade, repair, and module-addition workflows after the Phase 8.2 stabilization baseline.
- **Deliverables**:
  - Platform testing suite (Windows, macOS, Linux).
  - Production packaging and publication preparation.
- **Dependencies**: Phase 8.
- **Success Criteria**: 100% pass rate on integration suites across all targeted operating systems.
