# Safe File Operation Manager

High-level filesystem operations abstraction protecting user workspaces.

## Features

- **Dry-run mode**: Preview file output logs without modifying directories.
- **Conflict Policies**: Handles pre-existing files safely (`overwrite`, `skip`, or `error`).
- **Backup & Restore**: Saves snapshots of modified files for automatic rollback.
