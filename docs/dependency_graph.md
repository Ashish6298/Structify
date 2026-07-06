# Dependency Graph

Phase 8 represents dependencies as a graph with package name, version, type, target, package manager, and peer metadata.

The resolver detects duplicate dependency versions, peer dependency gaps, dev/runtime grouping, workspace target differences, and npm install plan output. npm remains the default install plan target.
