# Future Features & Ecosystem Roadmap

This document outlines potential future features, extensions, and integrations for Structify. These features are excluded from Version 1.0 but represent the long-term project vision.

---

## 1. Additional Frameworks and Libraries

We plan to expand generator capabilities to support:

- **Frontend/Fullstack Frameworks**: Angular, Vue, Svelte, SolidJS, Remix, Nuxt.
- **Non-JS Backend Frameworks**: Laravel (PHP), Django (Python), Spring Boot (Java), Ruby on Rails (Ruby), Gin (Go).
- **Styling Tools**: CSS Modules, Styled Components, Vanilla Extract, Tailwind v4.
- **Additional ORMs**: TypeORM, Drizzle ORM, Kysely.
- **Caching & Queues**: Redis, Memcached, RabbitMQ, BullMQ.

---

## 2. Advanced Scaffolding & Custom Template Engine

- **Custom Scaffolding Registries**: Allow developers to load third-party template packages from private git repositories or npm packages.
- **Interactive CLI Custom Template Creator**: Interactive guide to let developers turn an existing project into a Structify preset config.

---

## 3. DevOps & Cloud Integrations

- **Kubernetes Generators**: Scaffolds deployment configs, services, and ingress setups for local Kubernetes development.
- **Terraform / AWS CDK Generators**: Automatically creates infrastructure-as-code files based on the chosen databases and APIs.
- **Multi-Platform CI/CD**: Support GitLab CI, CircleCI, Bitbucket Pipelines, and Jenkins.

---

## 4. IDE Integrations & GUI Applications

- **VS Code Extension**:
  - Interactive UI panel within VS Code to choose stacks.
  - Sidebar workspace explorer using the Structify Doctor engine to flag configuration issues.
  - Quick-action buttons to apply doctor fixes.
- **Web-Based Dashboard / Desktop Application**:
  - Visual generator tool for scaffolding applications from a desktop app.
