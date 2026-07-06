# Phase 6 Generation Guide

Phase 6 turns Structify into a real project generator. `structify init` validates a stack configuration, builds an execution graph, creates a `GenerationSession`, and executes deterministic internal templates into the selected target directory.

## Behavior

- Generation is offline-friendly by default. Structify writes `package.json` with dependencies and prints install commands instead of installing packages.
- `--install` allows the package-manager install step to run through the command executor. `--skip-install` keeps generation file-only even when install flags are present.
- `--dry-run` validates and previews the execution graph without creating files or folders.
- `--json` returns a standardized result with success, duration, warnings, errors, generated files, skipped files, executed commands, rollback actions, project path, and next steps.
- `--output <path>` chooses the project directory. Relative paths are resolved from the CLI context cwd.
- Existing non-empty target directories fail by default. `--force` allows supported overwrites, and overwritten files are recorded with rollback metadata.

## Safety

Structify does not call external framework initializers in Phase 6. It does not run database migrations, connect to databases, or delete pre-existing user files. If a step fails after files are written, rollback removes files created by the current session and restores overwritten files where possible.

## Supported Templates

- Next.js TypeScript: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `next.config.ts`, `tsconfig.json`.
- React Vite TypeScript: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `index.html`, `vite.config.ts`, `tsconfig.json`.
- Express TypeScript: `src/index.ts`, `src/app.ts`, health route, error middleware, env config.
- Nest-style TypeScript: `src/main.ts`, module, controller, service, TypeScript config.
- Tooling: Tailwind, Material UI, ESLint, Prettier, Docker, GitHub Actions, Husky metadata, lint-staged, Commitlint.
- Databases: PostgreSQL + Prisma starter files and MongoDB + Mongoose starter files.

## Limits

Phase 6 intentionally avoids framework CLIs such as `create-next-app`, `create vite`, and `nest new`. Dependency installation is optional. Database migrations and hook installation are deferred to later phases.
