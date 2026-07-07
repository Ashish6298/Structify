# Repair Command Guide

## Overview

`structify repair` uses the unified Project Health Engine to identify auto-fixable issues
and safely restore them. It operates on dry-run mode by default and requires explicit
confirmation to apply changes.

---

## Usage

```bash
structify repair [options]

Options:
  -d, --dry-run   Preview repair plan without writing files (default behavior)
  --apply         Apply safe repairs
  -y, --yes       Apply without interactive confirmation (use with --apply)
  --force         Allow overwriting user-modified generated files (creates backup)
  --path <path>   Project path to repair (defaults to current directory)
  --json          Output machine-readable JSON
  --help          Show help
```

---

## What Repair Can Fix

### Auto-Fixable Issues (FIXABLE)

| Issue                                            | Repair Action                              |
| ------------------------------------------------ | ------------------------------------------ |
| Missing metadata file (`structify.*.json`)       | Restore from generation plan               |
| Missing safe config file (`.editorconfig`, etc.) | Restore from generation plan               |
| Drifted npm scripts                              | Merge expected scripts into `package.json` |
| Missing dependencies                             | Merge expected deps into `package.json`    |
| Stale manifest metadata                          | Refresh `structify.manifest.json`          |

### Force-Only Repairs

These require `--force`:

| Issue                                | Repair Action                   |
| ------------------------------------ | ------------------------------- |
| User-modified generated source files | Overwrite with template content |

> **Note**: When `--force` is used, the original file content is preserved in memory for
> rollback purposes before being overwritten.

### Not Repairable

| Issue                                                  | Required Action             |
| ------------------------------------------------------ | --------------------------- |
| Missing non-config source files (`app/page.tsx`, etc.) | Restore from source control |
| Corrupted metadata JSON with no generation plan        | Restore from source control |

---

## Dry-Run Mode (Default)

When run without `--apply`, repair shows a **preview** of all operations that would be
applied, including the operation type, target path, and description.

```bash
structify repair
structify repair --dry-run
```

---

## Applying Repairs

To actually apply repairs:

```bash
# Apply safe auto-fixable repairs
structify repair --apply --yes

# Apply with JSON output
structify repair --apply --yes --json

# Force-overwrite user-modified files
structify repair --apply --yes --force
```

---

## Rollback

If any repair operation fails during a multi-operation apply, all previously applied
operations are automatically rolled back. The rollback engine restores the original
content of each modified file or removes newly created files.

---

## JSON Output

```bash
structify repair --json
structify repair --apply --yes --json
```

JSON output includes:

- `success` — true if repair applied successfully
- `code` — `REPAIR_PLAN_READY | REPAIR_APPLIED | REPAIR_NOT_SAFE | NO_REPAIR_NEEDED`
- `fixableCount` — number of auto-fixable issues
- `notFixableCount` — number of issues requiring manual attention
- `healthSummary` — counts per diagnostic status
- `repair.plan.operations` — list of planned operations
- `result.appliedOperations` — list of applied operation IDs
- `result.rollbackResults` — rollback outcomes (if any)

---

## Examples

```bash
# Preview what repair would do
structify repair --dry-run

# Apply repairs silently
structify repair --apply --yes

# Force-overwrite modified generated files
structify repair --apply --yes --force

# Repair a specific project path
structify repair --path ./my-project --dry-run
```

---

## Related Commands

- `structify doctor` — Full environment + project health check
- `structify inspect` — Detailed project state inspection
- `structify verify-project` — Structural validation
- `structify upgrade` — Safe metadata upgrade operations
