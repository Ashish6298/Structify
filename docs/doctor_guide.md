# Doctor Command Guide

## Overview

`structify doctor` performs a comprehensive audit of your environment and, if you're inside
a Structify project, also runs a full project health check.

---

## Usage

```bash
structify doctor [options]

Options:
  --path <path>   Project path to diagnose (defaults to current directory)
  --json          Output machine-readable JSON
  --no-color      Disable ANSI color codes
  -v, --verbose   Include verbose diagnostic output
  --help          Show help
```

---

## What Doctor Checks

### Environment Checks

| Check                      | Description                     |
| -------------------------- | ------------------------------- |
| Node.js Version            | Must be >= v18; LTS recommended |
| Workspace Directory Access | Read/Write permissions on cwd   |
| Git CLI Client             | git on PATH                     |
| Git user.name              | Global git user configured      |
| npm Package Manager        | npm available globally          |
| Internet & Registry Access | Can reach registry.npmjs.org    |
| System Memory              | >= 4 GB recommended             |
| Disk Space                 | >= 5 GB free recommended        |
| CPU Information            | Informational                   |
| Terminal UTF-8             | Character rendering capability  |
| Docker Engine              | Docker daemon availability      |
| package.json               | Present in working directory    |

### Project Health Checks (if Structify project)

When doctor detects a Structify project (`structify.config.json` present), it additionally runs:

- **Stack Detection** — identifies frontend, backend, database, ORM, styling
- **Metadata Integrity** — validates `.json` metadata files are present and parseable
- **Config Validity** — checks `structify.config.json` shape
- **Manifest Integrity** — checks hash consistency
- **Project Graph Health** — validates node count and orphans
- **Dependency Graph** — optional file validity
- **Package Manager** — npm vs metadata expectation
- **npm Scripts** — actual vs expected scripts
- **Dependencies** — actual vs expected dependency presence
- **Generated Files** — missing or modified files
- **Module Health** — installed module tracking

---

## Diagnostic Status Legend

| Status      | Meaning                                |
| ----------- | -------------------------------------- |
| `[PASS]`    | Check passed                           |
| `[INFO]`    | Informational only                     |
| `[WARN]`    | Non-fatal warning                      |
| `[FAIL]`    | Error requiring resolution             |
| `[FIXABLE]` | Auto-repairable via `structify repair` |
| `[MANUAL]`  | Requires manual intervention           |

---

## JSON Output

```bash
structify doctor --json
```

JSON output includes:

- `success` — true if no FAIL checks
- `environmentChecks` — array of env check results
- `projectHealthReport` — full health report (if Structify project)
- `healthSummary` — counts per status
- `overallStatus` — HEALTHY | DEGRADED | CRITICAL | UNKNOWN
- `detectedStack` — detected technology stack
- `repairability` — auto-fixable vs not-fixable issue lists

---

## Examples

```bash
# Run in current directory
structify doctor

# Check a specific project
structify doctor --path ./my-project

# Machine-readable output
structify doctor --json

# No color for CI pipelines
structify doctor --no-color
```

---

## Next Steps

If doctor reports FIXABLE issues, run:

```bash
structify repair --dry-run     # Preview repairs
structify repair --apply --yes  # Apply repairs
```

If doctor reports NOT_FIXABLE issues, restore missing source files from version control.
