# Phase 8 Enterprise Template Engine

Phase 8 introduces an additive generation layer that keeps existing Structify commands stable while routing new project generation concepts through deterministic, typed primitives.

## Core Systems

- `EnterpriseTemplateEngine` renders templates from a strongly typed context with variables, conditionals, loops, helpers, inheritance, environment filters, and file transforms.
- `BlueprintSystem` models complete project architectures and supports inheritance with selective overrides.
- `GeneratorFramework` registers artifact generators with metadata for inputs, outputs, dependencies, compatibility, and validation rules.
- `TypedPromptEngine` resolves schema-driven questions, conditional defaults, validation, and reusable prompt definitions.
- `ProjectVariableSystem` resolves global, project, module, generator, environment, computed, derived, user, runtime, and secret variables using deterministic precedence.
- `TemplateValidator` blocks generation before rendering when variables, template references, inheritance, metadata, or generator outputs are invalid.
- `LifecycleHookRunner` exposes generation hooks that execute inside the generation pipeline before validation, rendering, writing, install, rollback, verification, cleanup, module generation, and workspace generation stages.
- `OutputPlanningEngine` builds dry-run plans with folders, generated files, overwrites, skips, dependencies, rollback checkpoints, verification tasks, and deterministic hashes.
- `FileConflictResolver` classifies existing files as identical, safely mergeable, user modified, generated modified, conflicting, deprecated, obsolete, orphaned, or new.
- `CodeMergeEngine` performs structured merges for JSON, package metadata, TypeScript imports/exports, and environment files before falling back to append-safe text merging.
- `WorkspaceGenerator`, `ComponentGeneratorFramework`, and `DocumentationGenerator` provide reusable generators for monorepos, component schemas, and post-generation docs.
- `TemplateRegistryDiscovery` discovers template registry entries from user/local directories and records checksums, source, compatibility, dependencies, author metadata, and integrity state.
- `GenerationAnalyticsEngine` records file counts, skipped/overwritten/merged files, conflicts, rollback checkpoints, dependencies, warnings, validation results, verification results, and deterministic hashes.

## CLI Commands

The following Phase 8 commands are available alongside existing commands:

- `structify generate`
- `structify blueprint`
- `structify templates`
- `structify generators`
- `structify validate-template`
- `structify explain-template`
- `structify preview`
- `structify plan`
- `structify render`

All commands use the existing CLI context, JSON output mode, verbose mode, CI-safe deterministic output, and dry-run planning where applicable.

## Verification

Run `npm run verify:phase-8` to execute linting, formatting checks, type checking, builds, focused Phase 8 engine tests, CLI smoke tests, and integration scaffolding checks.
