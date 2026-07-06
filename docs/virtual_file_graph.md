# Virtual File Graph

The Virtual File Graph is an in-memory representation of every generated file before disk writes occur.

Each virtual file records target path, content, source generator, source template, conflict policy, dependencies, file type, hash, permissions metadata, and rollback metadata.

The graph validates duplicate paths, content collisions, path traversal, Windows reserved filenames, unsupported path lengths, invalid characters, and missing file dependencies.
