# Phase 8.1 Hardening

Phase 8.1 is a platform hardening phase. It does not add frameworks. It moves Structify toward composable generators, stronger dependency resolution, structural project metadata, offline validation, and output snapshots.

## Composable Generators

Generation is planned as independent generator contributions. The base TypeScript generator contributes shared metadata and root files. Frontend, backend, React/Vite, Next, Express, Nest, Tailwind, MUI, Prisma, Mongoose, Docker, GitHub Actions, ESLint, and Prettier contribute their own capabilities, files, and dependencies.

Templates remain deterministic render units. Stack decisions, file inclusion, dependency selection, and feature activation belong to generators.

## Dependency Resolver

The dependency graph records runtime, dev, peer, and optional dependencies. Each dependency includes source metadata showing which generator contributed it and why. Resolution is deterministic, npm-first, and reports structured diagnostics for version conflicts, peer dependency gaps, and type conflicts.

## Project Graph

Generated projects include `structify.project-graph.json`. The graph models apps, packages, pages, layouts, API endpoints, services, database clients, models, config files, scripts, and tooling. It is designed for future inspect, repair, add-module, and upgrade workflows.

## Service Container

Generation sessions now use a typed service container for internal services such as event bus, hook manager, dependency registry, file operation manager, and rollback manager. The container supports singleton, scoped, and factory lifetimes.

## Structural Validation

Use:

```bash
npm run build
node apps/cli/dist/index.js verify-project --path ./my-project
```

`structify init --verify` runs the same offline structural validation after generation. It checks required files, `package.json`, scripts, manifest, Project Graph, and generated dependency metadata. It does not run `npm install` by default.

## Snapshots And Analytics

Snapshot tests cover supported MVP combinations and compare folder trees, package scripts, manifest metadata, Project Graph summaries, and important generated files. Generation analytics track file count, generator count, dependency count, plugin count, event count, duration, and memory use for verbose JSON and manifest-oriented workflows.

## Verification

Run:

```bash
npm run verify:phase-8-1
```

The command writes `phase-8-1-verification-report.txt` and includes full tests plus focused hardening checks.
