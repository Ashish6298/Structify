# Diff Engine

The Project Diff Engine compares the Virtual File Graph against the target filesystem before writing.

Diff entries are categorized as create, overwrite, skip, conflict, unchanged, delete-not-needed, or backup-required. `structify init --dry-run` displays a concise diff summary, and `--json` includes the structured diff object.
