# CLI Guide

This guide describes how to run and use the Structify command-line interface.

## Table of Contents

1. [Overview](#overview)
2. [Global Options](#global-options)
3. [Commands Reference](#commands-reference)
4. [Phase 4 Supported Features](#phase-4-supported-features)

---

## Overview

Structify provides an interactive CLI tool for setting up, inspecting, and verifying modern software architectures.

Execute the tool using `npx`:

```bash
npx structify [command] [options]
```

---

## Global Options

The following flags can be passed to the root program or any subcommand:

- `--verbose`: Prints additional diagnostic information.
- `--debug`: Prints stack traces for unexpected errors.
- `--json`: Outputs machine-readable JSON (supported by `validate` and `doctor`).
- `--no-color`: Disables colored ANSI output.
- `--cwd <path>`: Runs the command relative to the specified working directory.

---

## Commands Reference

### 1. `structify init`

- **Description**: Prepares scaffolding details for a project stack.
- **Options**:
  - `-d, --dry-run`: Runs compilation and shows planned execution steps without writing files.
  - `-c, --config <path>`: Specifies configuration template JSON.
  - `-p, --preset <name>`: Uses predefined stack preset (e.g. `next-postgres-tailwind`).
  - `-y, --yes`: Skips configuration prompts and runs using default options.

### 2. `structify validate`

- **Description**: Validates configuration JSON files or examples against compatibility rules.
- **Options**:
  - `-c, --config <path>`: Validates target JSON file compatibility.
  - `-e, --example`: Validates the built-in demo stack configuration.

### 3. `structify doctor`

- **Description**: Performs a read-only environment check on system libraries (Git, Node, package managers, Docker).

### 4. `structify add <module>`

- **Description**: Incremental module installation interface.

### 5. `structify inspect`

- **Description**: Prints workspace info.

### 6. `structify repair`

- **Description**: Fixes setup configuration alignments.

---

## Phase 4 Supported Features

In Phase 4, commands that perform filesystem edits or install software (`init` without `--dry-run`, `add`, `repair`) operate in informational placeholder mode. Validation and diagnostic commands (`validate`, `doctor`) are fully functional.
