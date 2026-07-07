# Phase 9 Evolution Engine

Phase 9 lets Structify safely evolve existing Structify-generated projects.

## Project State Reader

The Project State Reader reads `structify.config.json`, `structify.manifest.json`, `structify.project-graph.json`, `package.json`, event logs, and the filesystem. It returns normalized state with stack metadata, npm package manager metadata, generator/template/plugin/module versions, scripts, dependencies, generated files, missing files, modified files, unknown files, and diagnostics.

## Drift Detection

The Drift Detector compares metadata and generated expectations against the actual project. It reports missing generated files, modified generated files, missing metadata, package script drift, dependency drift, npm metadata drift, stale stack/template hashes, missing graph nodes, orphaned graph nodes, and unsupported manual edits.

## Patch Engine

The Patch Engine plans changes before writing. Patch plans include create/update file operations, JSON merges, dependency/script merges, conflicts, dependency changes, affected files, and a migration graph. Applying a patch records backups and rolls back created or changed files if a later operation fails.

## Module Addition

`structify add <module>` supports built-in modules:

- `docker`
- `github-actions`
- `eslint`
- `prettier`
- `tailwind`
- `prisma`
- `mongoose`

Supported options:

```bash
structify add docker --dry-run
structify add docker --yes
structify add docker --json
structify add prisma --database postgres --dry-run
```

Already-installed modules return `MODULE_ALREADY_PRESENT`. Incompatible modules return `MODULE_INCOMPATIBLE`. Patch conflicts return `PATCH_CONFLICT`.

## Upgrade Preview

`structify upgrade --dry-run` reads current metadata and returns an upgrade plan with migration graph nodes. Safe metadata/package upgrades can be applied with `--yes`. Source-file upgrades that touch modified generated files return `UPGRADE_REQUIRES_REVIEW`.

## Repair

`structify repair --dry-run` creates a repair plan from drift detection. `structify repair --apply --yes` applies safe repairs for missing metadata/config files, missing package scripts, npm package metadata, and generated graph metadata. It does not overwrite modified user source files unless a future force-safe path is proven.

## Strict Verification

`structify verify-project --strict` uses state reading and drift detection. Drift warnings become validation failures in strict mode.

## Operation History

Successful module additions update `structify.manifest.json` with module versions and operation history: operation ID, type, timestamp, Structify version, modules added, files changed, dependencies changed, result, and rollback availability.

## Expected Negative Paths

Verification reports label intentional rejection checks as `PASS (Expected Failure Verified)` or `VERIFIED NEGATIVE PATH`. These sections show expected error code, actual error code, rollback requirement, rollback execution, and the reason the negative path passed.
