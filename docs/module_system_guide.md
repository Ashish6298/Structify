# Module System Guide

The Phase 7 Module SDK defines future `structify add` modules. Modules declare metadata, supported project types, detection rules, required templates, dependencies, migration steps, conflict policy, rollback strategy, and verification logic.

`structify add` remains planning-only in Phase 7, but it now reads built-in module metadata and shows the future execution plan surface.

Details on adding functional modules (e.g., Auth, DBs, Docker, GitHub Workflows) incrementally into an existing workspace.

## Table of Contents

1. [Overview and Concept](#concept)
2. [Supported Modules](#supported)
3. [Stack Verification Before Addition](#validation)
4. [Rollback Support for Module Errors](#rollback)
