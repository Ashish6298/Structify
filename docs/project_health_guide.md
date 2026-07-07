# Project Health Guide

## Overview

The Structify Project Health Engine is the authoritative system that drives four commands:
`structify doctor`, `structify inspect`, `structify repair`, and `structify verify-project`.

All four commands share a single unified health check (`runProjectHealthCheck`) that:

1. Reads the project state (`readProjectState`)
2. Detects drift (`detectProjectDrift`)
3. Detects the technology stack (`detectStack`)
4. Classifies all issues into health categories and statuses

---

## Diagnostic Categories

Each diagnostic belongs to one of the following **categories**:

| Category           | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `environment`      | Node.js version, npm, Git, Docker, memory, disk      |
| `project_metadata` | presence and validity of `.json` metadata files      |
| `config`           | `structify.config.json` shape and required fields    |
| `manifest`         | `structify.manifest.json` hash and version integrity |
| `project_graph`    | `structify.project-graph.json` node consistency      |
| `dependency_graph` | `structify.dependency-graph.json` validity           |
| `package_manager`  | npm, package-lock.json, script drift                 |
| `dependencies`     | required package presence and version matching       |
| `generated_files`  | expected vs actual file set                          |
| `module_health`    | installed module tracking                            |
| `stack_detection`  | detected stack confidence and source                 |

---

## Diagnostic Statuses

| Status        | Meaning                                                        |
| ------------- | -------------------------------------------------------------- |
| `PASS`        | The check passed; no action required                           |
| `INFO`        | Informational only; not a problem                              |
| `WARNING`     | Non-fatal issue that may cause problems                        |
| `ERROR`       | Serious issue that requires resolution                         |
| `FIXABLE`     | Issue that can be automatically resolved by `structify repair` |
| `NOT_FIXABLE` | Issue that requires manual intervention or `--force`           |

---

## Overall Health Status

| Status     | Conditions                                           |
| ---------- | ---------------------------------------------------- |
| `HEALTHY`  | All diagnostics are PASS or INFO                     |
| `DEGRADED` | At least one WARNING or FIXABLE diagnostic           |
| `CRITICAL` | At least one ERROR diagnostic                        |
| `UNKNOWN`  | Not a Structify project; health cannot be determined |

---

## Running a Health Check

```bash
# Show environment + project health
structify doctor

# Full detailed project inspection
structify inspect

# Preview auto-fixable repairs
structify repair --dry-run

# Strict validation (fail on warnings)
structify verify-project --strict
```

All of these commands operate on the same underlying health data. Running `doctor` on a
Structify project shows both the environment section and a project health section.

---

## Repairability

The health engine classifies each issue's repairability:

- **Auto-fixable (FIXABLE)**: `structify repair --apply --yes` can safely address these.
  - Missing metadata files (`structify.config.json`, etc.)
  - Missing safe configuration files
  - Package script drift
  - Missing dependency metadata entries
  - Package manager mismatch

- **Not auto-fixable (NOT_FIXABLE)**: Require manual intervention.
  - Modified source files (user has edited generated code)
  - Missing non-config source files (must be restored from git)
  - Invalid metadata JSON that cannot be regenerated

- **Force-fixable**: Pass `--force` to overwrite modified generated files with template content. A backup is made before overwriting.

---

## Stack Detection

Stack detection runs independently and uses two sources:

1. **Filesystem indicators** — presence of configuration files, source directories, package.json dependencies
2. **Metadata override** — when `structify.config.json` is present, the declared stack is authoritative

Detection confidence:

- `high` — Structify metadata present
- `medium` — 3+ filesystem indicators matched
- `low` — Fewer than 3 indicators; uncertain stack

See [drift_detection.md](./drift_detection.md) for drift details.
