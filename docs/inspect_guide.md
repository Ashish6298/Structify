# Inspect Command Guide

## Overview

`structify inspect` provides a detailed view of the current project's health, detected
technology stack, drift report, module status, and recommended next actions. It uses the
unified Project Health Engine to present a consistent view.

---

## Usage

```bash
structify inspect [options]

Options:
  --path <path>   Project path to inspect (defaults to current directory)
  --json          Output machine-readable JSON
  --no-color      Disable ANSI color codes
  --help          Show help
```

---

## What Inspect Shows

### Human Output

| Field              | Description                                           |
| ------------------ | ----------------------------------------------------- |
| Overall Status     | HEALTHY / DEGRADED / CRITICAL / UNKNOWN               |
| Health Summary     | Counts of PASS / WARN / ERROR / FIXABLE / NOT_FIXABLE |
| Package Manager    | npm or unknown                                        |
| Detected Stack     | Frontend / Backend / Database                         |
| Detection Source   | metadata / filesystem / mixed                         |
| Files              | Total project files found                             |
| Drift              | yes / no                                              |
| Installed Modules  | Built-in modules added via `structify add`            |
| Available Modules  | Modules not yet installed                             |
| Upgrade Status     | UPGRADE_PLAN_READY / UPGRADE_REQUIRES_REVIEW          |
| Repair Suggestions | Count and prompt                                      |

### JSON Output Fields

```json
{
  "success": true,
  "command": "inspect",
  "data": {
    "projectPath": "...",
    "isStructifyProject": true,
    "overallStatus": "HEALTHY",
    "healthSummary": {
      "total": 12,
      "pass": 9,
      "info": 2,
      "warnings": 1,
      "errors": 0,
      "fixable": 0,
      "notFixable": 0
    },
    "detectedStack": {
      "frontend": "next",
      "backend": "none",
      "database": "none",
      "orm": "none",
      "styling": "none",
      "packageManager": "npm",
      "docker": false,
      "githubActions": false,
      "eslint": false,
      "prettier": false,
      "confidence": "high",
      "detectionSource": "metadata"
    },
    "state": { "..." },
    "driftReport": { "hasDrift": false, "..." },
    "moduleReport": {
      "installedModules": [],
      "availableCompatibleModules": ["docker", "github-actions", "eslint", "prettier", "tailwind", "prisma", "mongoose"]
    },
    "upgradeReport": { "code": "UPGRADE_PLAN_READY", "..." },
    "repairSuggestions": [],
    "fixableIssues": [],
    "notFixableIssues": [],
    "metadataHealth": "ok",
    "packageHealth": "ok",
    "dependencyHealth": "ok",
    "graphHealth": "ok",
    "supportedNextActions": ["add", "upgrade --dry-run", "repair --dry-run", "verify-project --strict"]
  }
}
```

---

## Examples

```bash
# Inspect current directory
structify inspect

# Inspect a specific project
structify inspect --path ./my-project

# Machine-readable output
structify inspect --json
```

---

## Related Commands

- `structify doctor` — Environment + project health checks
- `structify repair --dry-run` — Preview available repairs
- `structify verify-project --strict` — Strict structural validation
- `structify add <module>` — Add a built-in module
