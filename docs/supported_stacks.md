# Supported Stacks & Compatibility Matrix

This document defines the supported technologies for Structify Version 1.0 and outlines the compatibility rules implemented by the Validation Engine.

## Stack Options (Parameter Values)

| Category                | Supported Options (Internal Value)           | Display Name                    |
| :---------------------- | :------------------------------------------- | :------------------------------ |
| **Frontend Frameworks** | `next`, `vite-react`, `none`                 | Next.js, React (Vite)           |
| **Backend Frameworks**  | `express`, `nest`, `none`                    | Express, NestJS                 |
| **Styling Libraries**   | `tailwind`, `mui`, `none`                    | Tailwind CSS, Material UI (MUI) |
| **Databases**           | `postgres`, `mongodb`, `none`                | PostgreSQL, MongoDB             |
| **ORMs / Drivers**      | `prisma`, `mongoose`, `none`                 | Prisma, Mongoose                |
| **Package Managers**    | `npm`                                        | npm                             |
| **Project Modes**       | `frontend-only`, `backend-only`, `fullstack` | Client, API Server, or both     |
| **Languages**           | `typescript`                                 | TypeScript                      |

---

## Generated Project Structures

Phase 6 can generate real starter files for:

- Next.js TypeScript apps with `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `next.config.ts`, and `tsconfig.json`.
- React Vite TypeScript apps with `src/main.tsx`, `src/App.tsx`, `src/index.css`, `index.html`, `vite.config.ts`, and `tsconfig.json`.
- Express TypeScript APIs with `src/index.ts`, `src/app.ts`, health routes, error middleware, env config, and package scripts.
- Nest-style TypeScript APIs with `src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`, `src/app.service.ts`, and package scripts.
- Fullstack Next.js + Express and React Vite + Express starters.
- PostgreSQL + Prisma and MongoDB + Mongoose starter files without running migrations or connecting to a database.
- Tooling files for Tailwind, Material UI, ESLint, Prettier, Docker, GitHub Actions, Husky metadata, lint-staged, and Commitlint.

Dependencies are written into `package.json` through deterministic dependency resolution. Installation is opt-in with `--install`.
Generated commands, Dockerfiles, GitHub Actions workflows, and CLI next steps use npm.

---

## Compatibility Matrix

The Validation Engine evaluates choices to prevent broken, uncompilable, or invalid stack combinations.

### 1. Database and ORM Pairings

- **MongoDB (`mongodb`)**:
  - Must pair with **Mongoose (`mongoose`)**.
  - Invalid configuration: Using MongoDB with Mongoose and choosing PostgreSQL.
- **PostgreSQL (`postgres`)**:
  - Must pair with **Prisma (`prisma`)**.
  - Invalid configuration: Using PostgreSQL with Mongoose.
- **Incompatibilities**:
  - Prisma cannot be paired with MongoDB in the MVP.
  - Mongoose cannot be paired with PostgreSQL.

### 2. Frontend and Styling Libraries

- **Tailwind CSS (`tailwind`)**:
  - Requires a Frontend Framework (`next` or `vite-react`).
  - Cannot be selected in backend-only projects (`express` or `nest` without a frontend setup).
- **Material UI (`mui`)**:
  - Requires a Frontend Framework (`next` or `vite-react`).
  - Cannot be selected in backend-only projects.

### 3. Fullstack Configurations

- Fullstack mode must contain both a frontend framework (not `none`) and a backend framework (not `none`).

---

## Validation Code Reference

During config parsing or prompt checking, the validation engine flags the following error codes:

1. `INVALID_PROJECT_NAME`: If the project name fails npm registry convention validation.
2. `EMPTY_SELECTION`: Both frontend and backend options are set to `none`.
3. `INVALID_MODE_STACK`: Stack configuration doesn't align with the selected project mode (e.g., frontend-only containing a backend framework).
4. `BACKEND_STYLING`: Styling libraries are configured for a backend-only project.
5. `STYLING_REQUIRES_FRONTEND`: A styling library is configured but no frontend framework is selected.
6. `POSTGRES_REQUIRES_PRISMA`: Database is `postgres` but ORM is not `prisma`.
7. `MONGODB_REQUIRES_MONGOOSE`: Database is `mongodb` but ORM is not `mongoose`.
8. `PRISMA_MONGODB_INCOMPATIBLE`: Database is `mongodb` and ORM is `prisma`.
9. `MONGOOSE_REQUIRES_MONGODB`: ORM is `mongoose` but database is not `mongodb`.
10. `ORM_WITHOUT_DATABASE`: An ORM is selected but the database is set to `none`.
