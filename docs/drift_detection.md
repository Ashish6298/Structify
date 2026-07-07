# Drift Detection

## What is Drift?

**Drift** occurs when a Structify project's actual state diverges from the state that Structify's
template engine would generate for the same configuration. Drift is detected by comparing the
current filesystem against the expected output of `createComposableGenerationPlan(config)`.

---

## What Constitutes Drift?

| Drift Type                   | Code                           | Severity | Fixable?             |
| ---------------------------- | ------------------------------ | -------- | -------------------- |
| Missing generated file       | `GENERATED_FILE_MISSING`       | ERROR    | Depends on file type |
| User-modified generated file | `GENERATED_FILE_MODIFIED`      | WARNING  | Not auto-fixable     |
| npm script changed           | `PACKAGE_SCRIPT_DRIFT`         | ERROR    | Yes (repair)         |
| Dependency missing           | `DEPENDENCY_MISSING`           | ERROR    | Yes (repair)         |
| Metadata file deleted        | `METADATA_FILE_MISSING`        | ERROR    | Yes (repair)         |
| Package manager changed      | `PACKAGE_MANAGER_DRIFT`        | ERROR    | Requires manual fix  |
| Stack hash stale             | `STACK_HASH_STALE`             | ERROR    | Yes (upgrade/repair) |
| Template hash stale          | `TEMPLATE_HASH_STALE`          | WARNING  | Yes (repair)         |
| Missing graph nodes          | `PROJECT_GRAPH_MISSING_NODES`  | WARNING  | Yes (repair)         |
| Orphaned graph nodes         | `PROJECT_GRAPH_ORPHANED_NODES` | WARNING  | Yes (repair)         |

---

## Detection Logic

### File Drift

Structify computes the expected file list from `createComposableGenerationPlan(config)`.
It then:

1. Checks for **missing files** — expected but not on disk
2. Checks for **modified files** — expected file content hash ≠ actual file hash
3. Identifies **unknown files** — on disk but not in the expected set

Note: `structify.manifest.json` is treated as "mutable managed metadata" — modification is
expected and is not flagged as drift.

### Hash Integrity

The manifest contains:

- `stackHash`: SHA-256 of the normalized stack configuration
- `templateHash`: SHA-256 of the ordered list of expected template file paths

If either hash is stale (config was modified outside Structify), drift is detected.

### Script and Dependency Drift

The expected `package.json` (from the generation plan) is compared against the actual file.
Any missing scripts or dependency version mismatches are flagged as `PACKAGE_SCRIPT_DRIFT`
or `DEPENDENCY_MISSING`.

---

## Fixable vs Non-Fixable Drift

### Auto-Fixable (FIXABLE)

`structify repair --apply --yes` can restore:

- Missing metadata files (`structify.*.json`)
- Missing safe configuration files (`.editorconfig`, `eslint.config.js`, etc.)
- Drifted npm scripts
- Missing dependency entries in `package.json`
- Stale manifest metadata

### Not Auto-Fixable (NOT_FIXABLE)

These require manual action:

- **Modified source files** (e.g., `src/app.ts` edited by a developer). Use `structify repair --force --apply --yes` to restore from template (backs up current content).
- **Missing non-config source files** (e.g., `app/page.tsx`) — must be restored from git.
- **Corrupted metadata JSON** — must be regenerated from source control.

---

## Viewing Drift

```bash
# Human-readable drift summary
structify inspect

# JSON drift report
structify inspect --json

# Strict validation (fail on warnings)
structify verify-project --strict --json
```

All commands share the same underlying `detectProjectDrift(state)` call.
