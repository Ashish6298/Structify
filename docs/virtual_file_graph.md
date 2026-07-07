# Virtual File Graph

The Virtual File Graph is an in-memory representation of every generated file before disk writes occur.

Each virtual file records target path, content, source generator, source template, conflict policy, dependencies, file type, hash, permissions metadata, and rollback metadata.

The graph validates duplicate paths, content collisions, path traversal, Windows reserved filenames, unsupported path lengths, invalid characters, and missing file dependencies.

## Dry-Run JSON

Dry-run mode does not write files to disk. `generatedFiles` therefore remains empty.

The planned in-memory files are exposed as `plannedFiles`, top-level `virtualFileGraph.files`, and `data.graph.files`. These fields describe the same planned graph. `data.projectGraph`, `dependencyGraph`, `analytics`, and the diff summary are calculated from the same planned files.

Human-readable dry-run output reports planned virtual files separately from generated files.
