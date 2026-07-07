# Verify-Project Command Guide

## Overview

`structify verify-project` runs a structural validation of a generated Structify project.
It checks file presence, script integrity, project graph consistency, dependency declarations,
and project drift. It uses the unified Project Health Engine.

---

## Usage

```bash
structify verify-project [options]

Options:
  --path <path>   Project path to validate (defaults to current directory)
  --strict        Treat drift warnings and fixable issues as validation errors
  --json          Output machine-readable JSON
  --help          Show help
```

---

## What Verify-Project Checks

| Check                                      | Strict Failure        |
| ------------------------------------------ | --------------------- |
| `structify.config.json` presence and shape | Yes                   |
| `structify.manifest.json` presence         | Yes                   |
| `structify.project-graph.json` presence    | Yes                   |
| `package.json` presence                    | Yes                   |
| `README.md` presence                       | Yes                   |
| Expected generated files present           | Yes                   |
| npm scripts match expected config          | Yes                   |
| Dependencies match expected config         | Yes                   |
| Project graph node count                   | Warning (strict: yes) |
| Generated files unmodified                 | Warning (strict: yes) |
| Stale manifest hashes                      | Warning (strict: yes) |

---

## Non-Strict Mode (Default)

In non-strict mode, `verify-project` passes if:

- All ERROR diagnostics are clear
- All required files are present
- All required scripts and dependencies are present

Warnings and FIXABLE issues are reported but do not cause a non-zero exit code.

---

## Strict Mode

In strict mode (`--strict`), any WARNING or FIXABLE diagnostic causes a failure:

- Modified generated files → STRICT failure
- Missing graph nodes → STRICT failure
- Stale manifest hashes → STRICT failure
- FIXABLE drift → STRICT failure

```bash
structify verify-project --strict
```

---

## Exit Codes

| Exit Code | Meaning                                                                |
| --------- | ---------------------------------------------------------------------- |
| `0`       | Validation passed                                                      |
| `1`       | Validation failed (errors in non-strict; errors or warnings in strict) |

---

## JSON Output

```bash
structify verify-project --json
structify verify-project --strict --json
```

JSON output includes:

- `success` — true if validation passed
- `strict` — whether strict mode was enabled
- `overallStatus` — HEALTHY / DEGRADED / CRITICAL
- `healthSummary` — counts per diagnostic status
- `summary` — checked files, scripts, graph nodes, dependency checks, warning/error counts
- `state` — full project state
- `drift` — full drift report
- `detectedStack` — detected technology stack
- `repairability` — auto-fixable vs not-fixable split
- `healthDiagnostics` — full list of health diagnostics
- Standard validation fields: `checkedFiles`, `checkedScripts`, `checkedGraphNodes`, etc.

---

## Examples

```bash
# Non-strict validation
structify verify-project

# Strict validation (fail on warnings)
structify verify-project --strict

# Validate a specific project
structify verify-project --path ./my-project

# JSON output for CI
structify verify-project --strict --json
```

---

## CI Pipeline Usage

```yaml
# GitHub Actions example
- name: Verify generated project
  run: structify verify-project --strict --json
```

---

## Related Commands

- `structify doctor` — Environment + project health audit
- `structify inspect` — Full project state details
- `structify repair --dry-run` — Preview available repairs
