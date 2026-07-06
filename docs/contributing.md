# Contributing Guide

Thank you for contributing to Structify. To maintain the project's quality, please follow the guidelines below.

## Monorepo Development Setup

1. **Prerequisites**:
   - Node.js (v18 or higher)
   - npm

2. **Clone and Install**:

   ```bash
   git clone https://github.com/structify-cli/structify.git
   cd structify
   npm install
   ```

3. **Running CLI Locally**:

   ```bash
   cd apps/cli
   npm run dev
   ```

4. **Running MCP Server Locally**:
   ```bash
   cd apps/mcp-server
   npm run dev
   ```

## Contribution Workflow

### 1. Branch Naming Rules

- Feature branches: `feature/short-description`
- Bugfix branches: `bugfix/short-description`
- Documentation branches: `docs/short-description`

### 2. Commit Message Guidelines

We follow Conventional Commits guidelines:

- `feat: add docker generator support`
- `fix: prevent postgres validation errors on Prisma setup`
- `docs: update architecture guidelines`
- `test: add planning engine validation tests`

### 3. Pull Request Requirements

- Every code addition must include corresponding unit tests.
- Ensure all lint and format checks pass:
  ```bash
  npm run lint
  npm run format:check
  ```
- All tests must pass:
  ```bash
  npm test
  ```
- Ensure no changes break existing generator templates or compatibility rules.
