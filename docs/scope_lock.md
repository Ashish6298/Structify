# Scope Lock - Version 1.0

This document defines the strict boundaries of Structify Version 1.0. It lists MVP items, post-1.0 considerations, and explicitly out-of-scope targets to prevent scope creep.

## In Scope (Version 1.0 MVP)

### 1. Supported Stacks

- **Frontend**: Next.js, React (Vite).
- **Backend**: Express, NestJS.
- **Styling**: Tailwind CSS, Material UI (MUI).
- **Databases**: PostgreSQL, MongoDB.
- **ORMs / Drivers**: Prisma, Mongoose.
- **Package Managers**: npm, pnpm.

### 2. Scaffolding & Tooling

- **Dev Tooling**: ESLint, Prettier, EditorConfig, Husky, Commitlint.
- **Containerization**: Docker (Dockerfile, docker-compose.yml configuration generation).
- **CI/CD**: GitHub Actions (linting, formatting, testing workflow).
- **Git**: Automatic repository initialization and `.gitignore` setup.

### 3. Core CLI & MCP Capabilities

- **Interactive Mode**: Dynamic prompts with validation.
- **Configuration-Driven Generation**: Config via `structify.json`.
- **Preset Configurations**: Save/load presets.
- **Doctor System**: Diagnostics command to check project health.
- **Add-Module Engine**: Incremental setup additions (e.g., adding Docker config or Prisma schema to a project later).
- **Model Context Protocol (MCP)**: AI tool suite to validate, inspect, generate, and repair projects.

---

## Out of Scope (Post-1.0 / Excluded)

The following items are explicitly **excluded** from Version 1.0.

### 1. Frameworks & Stacks

- **Frontend/Fullstack**: Angular, Vue, Svelte, SolidJS, Remix, Nuxt, Qwik.
- **Non-JS Backends**: Laravel (PHP), Django (Python), Spring Boot (Java), Ruby on Rails (Ruby), Go (Fiber/Gin).
- **Cache & Message Queues**: Redis, Memcached, RabbitMQ, Kafka.

### 2. DevOps & Deployments

- **Orchestration**: Kubernetes, Helm, Nomad.
- **Cloud Deployments**: AWS CDK, Terraform configs, Serverless Framework, Vercel/Netlify integration scripts.
- **CI/CD Platforms**: GitLab CI, CircleCI, Bitbucket Pipelines, Jenkins (only GitHub Actions is supported in MVP).

### 3. Application Domain Logic

- **Authentication**: Auth0, Firebase Auth, NextAuth configuration code (beyond standard scaffolding structure).
- **Payments**: Stripe, PayPal integration boilerplate.
- **Architecture Models**: Microservices scaffold patterns (only monorepos and single-page apps / backends are generated).

### 4. Interfaces

- **Graphical User Interfaces (GUIs)**: Desktop apps (Electron, Tauri) or browser-based dashboards. (Structify remains CLI and MCP-only in v1.0).
