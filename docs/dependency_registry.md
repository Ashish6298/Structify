# Dependency Registry

Manages npm package dependencies across workspace target folders.

## Functions

- **Deduplication**: Eliminates duplicate packages matching the same version ranges.
- **Conflict Detection**: Raises warnings when incompatible versions of the same package are requested by different generators.
