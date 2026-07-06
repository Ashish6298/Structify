# Model Context Protocol (MCP) Documentation

This document describes how Structify integrates with the Model Context Protocol (MCP) to allow AI coding assistants (like Gemini, Claude, or ChatGPT) to programmatically trigger project creation, inspection, and maintenance tasks.

---

## MCP Architecture & Shared Core

To prevent duplicating business logic, both the **CLI Layer** (`apps/cli`) and the **MCP Server** (`apps/mcp-server`) depend on the shared core (`packages/core`).

```mermaid
graph TD
    CLI[CLI Application] --> Core[packages/core]
    MCP[MCP Server] --> Core

    subgraph core[Shared Core Engine]
        Val[Validation Engine]
        Plan[Planning Engine]
        Doc[Doctor Engine]
    end
```

By packaging validation rules, template generation, and repair routines in the core module, the MCP server serves as a lightweight JSON-RPC interface wrapper.

---

## Planned MCP Tools

The `apps/mcp-server` will expose the following JSON-RPC tool endpoints:

### 1. `validate_stack`

- **Description**: Evaluates if a given combination of technologies is supported and compatible.
- **Arguments**:
  - `frontend`: Frontend framework (e.g., "nextjs").
  - `backend`: Backend framework (e.g., "nestjs").
  - `database`: Database engine (e.g., "postgresql").
  - `styling`: Styling library (e.g., "tailwind").
  - `orm`: ORM framework (e.g., "prisma").
- **Response**: A compatibility report listing errors, warnings, or confirming a valid configuration.

### 2. `create_execution_plan`

- **Description**: Generates a JSON list of steps Structify will perform to scaffold the project without writing them to disk.
- **Arguments**:
  - Same as `validate_stack`.
  - `projectName`: Folder name for the project.
- **Response**: A structural plan detailing directories, files to write, package configurations, and initial setup scripts.

### 3. `generate_project`

- **Description**: Directly triggers project scaffolding at a specified directory path.
- **Arguments**:
  - `targetPath`: Absolute path on the filesystem.
  - `config`: Stack Configuration settings or a preset name.
- **Response**: Scaffolding status and verification results.

### 4. `inspect_project`

- **Description**: Identifies the stack elements used in an existing directory.
- **Arguments**:
  - `projectPath`: Path to check.
- **Response**: Detected technologies, package managers, and directory structures.

### 5. `run_doctor`

- **Description**: Run configuration diagnostics on an existing repository.
- **Arguments**:
  - `projectPath`: Path to check.
- **Response**: Detailed issues report including lint misalignments, missing dockerfiles, or package errors.

### 6. `apply_repair`

- **Description**: Automatically fixes configuration issues found by the doctor tool.
- **Arguments**:
  - `projectPath`: Path to apply fixes.
  - `issueIds`: Array of specific diagnostics to resolve.
- **Response**: Repair log and updated status.
