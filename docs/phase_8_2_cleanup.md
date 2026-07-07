# Phase 8.2 Cleanup

Phase 8.2 is a cleanup and verification accuracy phase. It does not add frameworks, module features, upgrade workflows, marketplace loading, or Phase 9 behavior.

## npm-First Cleanup

The repository workflow is npm-only. Root verification, CI, docs, generated project next steps, and generated CI examples use npm commands. pnpm remains only inside the optional package-manager adapter compatibility boundary.

Expected dependency check:

```bash
npm ls --workspaces --depth=0 --package-lock=false
```

The output must not show `.pnpm` paths or extraneous pnpm-linked packages.

## Dry-Run Terms

- **Virtual files** are files planned in memory before disk writes.
- **Planned files** are virtual files shown in dry-run output.
- **Generated files** are files actually written to disk.
- **Written files** are generated files recorded by the execution session.

`structify init --dry-run --json` keeps `generatedFiles` empty and exposes planned files through `plannedFiles`, top-level `virtualFileGraph`, and `data.graph`. These fields refer to the same planned graph.

## Conflict Errors

Existing non-empty target directories are classified as `TARGET_DIRECTORY_NOT_EMPTY`, not `INTERNAL_ERROR`.

Suggested resolution: choose an empty output directory, remove existing files, or pass `--force` only when overwrites are intentional.

## Project Graph Verification

Focused Project Graph verification must execute real matching tests. A focused test section that runs zero tests is a failure, even if the test runner exits successfully.

## Strong Verify Project

`structify verify-project` performs offline structural validation. It checks:

- `structify.config.json` normalized config shape.
- `structify.manifest.json` Structify version, package manager, and stack hash.
- `structify.project-graph.json` version, project name, node presence, edge references, summary counts, and stack hash.
- Manifest Project Graph metadata and graph summary consistency.
- `package.json` scripts and dependency sections.
- Required frontend, backend, styling, database, Docker, GitHub Actions, ESLint, and Prettier files for the selected stack.

It does not run `npm install`, `npm run build`, `npm test`, or `npm run lint` by default.
