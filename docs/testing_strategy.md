# Testing Strategy

To ensure Structify runs reliably across different stacks and environments, we implement a tiered testing methodology.

---

## 1. Unit Testing

- **Target Subsystems**: Validation Engine, Planning Engine, Preset Manager, Configuration Manager.
- **Framework**: Vitest or Jest.
- **Approach**:
  - Mock all disk I/O operations using a virtual file system (e.g. `memfs`) to avoid executing disk writes.
  - Test all positive and negative stack options in the Validation Engine (e.g., verifying that Mongoose + PostgreSQL correctly returns validation errors).
  - Verify that the Planning Engine outputs correct, ordered steps.

---

## 2. Integration Testing

- **Target Subsystems**: File System Layer, Execution Engine, Generator Engines.
- **Approach**:
  - Run tests on temporary, isolated test directories created during execution.
  - Assert that files are created with correct configurations.
  - Test the backup and rollback routines: intentionally force a failure in the middle of a generation plan and assert that the directory reverts to its exact pre-test state.

---

## 3. End-to-End (E2E) Testing

- **Target Subsystems**: CLI Layer, MCP Server.
- **Approach**:
  - Emulate user CLI inputs and assert outputs.
  - Boot the MCP Server and issue JSON-RPC calls using an MCP client, asserting tool outputs match expectations.
  - Run generated projects (for example, executing `npm run build` or `npm run lint` on the generated scaffold) to confirm that the generated project compiles correctly without warnings or errors.

---

## 4. Cross-Platform & Environment Matrix

Because developers use different systems, the CI/CD pipeline runs tests against:

- **Operating Systems**:
  - Windows (PowerShell Core, cmd)
  - macOS
  - Ubuntu/Linux
- **Node.js Versions**:
  - Node.js LTS (v18)
  - Node.js Current (v20+)
- **Package Managers**:
  - npm
