# Architecture View Model

`packages/core/src/architecture` transforms `ProjectAnalysis` into a UI-friendly representation without knowing anything about HTML, CSS, the CLI, or rendering frameworks.

## Public API

```ts
createArchitectureView(analysis, mode?)
filterArchitecturalView(analysis)
filterCompleteView(analysis)
sortNodes(nodes)
groupSections(analysis, mode?)
```

## Modes

### `architectural`

Shows only meaningful application files derived from the intelligence engine.

### `complete`

Shows the complete analyzed project except ignored or generated content.

## Output model

### `ArchitectureViewModel`

- `title`
- `generatedAt`
- `projectType`
- `mode`
- `sections`
- `statistics`
- `source`

### `ArchitectureSection`

Each section represents one logical application area:

- Frontend
- Backend
- Shared
- Database
- Assets
- Public
- Configuration

Each section includes:

- `folders`
- `architecturalFiles`
- `childNodes`
- `counts`
- `importance`

### `ArchitectureViewNode`

Every node is rendering-ready and exposes:

- `id`
- `name`
- `path`
- `kind`
- `type`
- `importance`
- `children`
- `collapsed`
- `category`

## Design rules

- The subsystem consumes only `ProjectAnalysis`.
- It does not perform filesystem scans.
- It is safe to reuse from CLI, web UI, VS Code, and MCP surfaces.
- Nodes default to `collapsed: true` so renderers can expand intentionally.

## Extension path

The shape is intentionally renderer-neutral so later layers can add:

- relationship overlays
- dependency overlays
- AI annotations
- timeline metadata
- click-to-open affordances

## First renderer

Structify's first interactive renderer is the Architecture Explorer HTML output used by `structify graph`. It consumes this view-model layer instead of scanning the filesystem again.
