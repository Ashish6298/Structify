# Coding Standards

This document establishes the styling conventions, folder organizations, and testing expectations for all future phases of Structify.

## Language and Core Tooling

- **Language**: TypeScript (Strict Mode enabled).
- **Target Runtime**: Node.js (CommonJS or ES Modules compatible).
- **Formatting**: Prettier with standard configurations.
- **Linting**: ESLint with custom configurations matching the monorepo rules.

---

## Directory Organization & Layout Rules

1. **Keep Packages Isolated**: Code inside `packages/core` must not import code from `apps/cli` or `apps/mcp-server`.
2. **Clear File Naming**:
   - Use `camelCase` for variables, functions, and file names (except React components/classes which use `PascalCase`).
   - Suffix engine-specific files with their subsystem name (e.g., `validationEngine.ts`, `fileSystemLayer.ts`).
3. **Template Storage**: Generator templates must reside in a dedicated `templates/` folder and be read dynamically, rather than hardcoding boilerplates inside TypeScript strings.

---

## Error Handling Conventions

1. **No Silent Failures**: Every error must either be handled with user notification (e.g., stopping execution and starting rollback) or logged clearly to the Diagnostics Log.
2. **Custom Error Classes**: Use structured error objects extending a base `StructifyError`:
   - `ValidationError` for configuration mismatch.
   - `FileSystemError` for permission or write issues.
   - `ExecutionError` for external script failures (e.g., `npm install` failing).
3. **Rollback Safety**: Any write operation that throws an error must automatically trigger a rollback routine in the File System Layer.

---

## Testing Expectations

1. **Unit Testing**:
   - Every logic block (planning steps, validation rules) must have >=90% test coverage.
   - Mock all file system operations using an in-memory file system wrapper during unit testing to avoid writing to disk.
2. **Integration Testing**:
   - Test full generator runs using a temporary directory path inside the workspace.
   - Verify that all generated project structures compile and successfully pass their own lint tests.
3. **Cross-Platform Verification**:
   - All tests must pass on Windows (PowerShell/CMD), macOS, and Linux shells.
   - Avoid hardcoded paths (`/` vs `\`). Always use the Node.js `path` module.
