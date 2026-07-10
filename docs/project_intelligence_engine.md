# Project Intelligence Engine

`packages/core/src/intelligence` is Structify's canonical project analysis layer.

It scans a project once, normalizes the result into `ProjectAnalysis`, and gives later subsystems a stable source of truth instead of letting each feature walk the filesystem independently.

## Public API

```ts
analyzeProject(projectPath, options?)
```

Returns a `ProjectAnalysis` object with:

- `project`
- `architecture`
- `dependencies`
- `modules`
- `metadata`
- `framework`
- `packageManager`
- `files`
- `tree`
- `relationships`

## Core models

### `ArchitecturalFile`

Every discovered file or directory is normalized into:

- `id`
- `name`
- `path`
- `category`
- `type`
- `importance`
- `parent`
- `children`
- `metadata`

### `ProjectNode`

The project is also represented as a tree:

- `id`
- `name`
- `path`
- `children`
- `kind`

This tree is intended to back later graph, search, timeline, AI, and click-to-open features.

## Ignore rules

Ignore logic is centralized in `ignore.ts` and exported as:

- `isIgnored()`
- `isArchitectural()`
- `isGenerated()`
- `isConfiguration()`
- `isAsset()`

Future subsystems should reuse these functions instead of maintaining separate path heuristics.

## Analysis flow

1. Resolve the project root.
2. Recursively scan non-ignored files and folders.
3. Build `ProjectNode` tree entries and `ArchitecturalFile` records.
4. Detect package manager, framework signals, metadata, modules, and architecture buckets.
5. Return a deterministic `ProjectAnalysis`.

## Scope

The engine supports:

- Structify-generated projects
- Existing non-Structify projects
- workspace layouts
- normalized architectural categorization

It intentionally excludes:

- network lookups
- dependency upgrade advice
- HTML generation
- CLI concerns

## Future use

This engine is intended to be the foundation for:

- architecture view models
- `structify graph`
- dependency intelligence
- inspect and doctor enrichment
- MCP and editor integrations
