```text
📦 structify-monorepo
├── 📁 apps
│   ├── 📁 cli
│   │   ├── 📁 src
│   │   │   ├── 📁 commands
│   │   │   │   ├── 📄 add.ts
│   │   │   │   ├── 📄 doctor.ts
│   │   │   │   ├── 📄 graph.spec.ts
│   │   │   │   ├── 📄 graph.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 init.ts
│   │   │   │   ├── 📄 inspect.ts
│   │   │   │   ├── 📄 phase8.ts
│   │   │   │   ├── 📄 phase912.ts
│   │   │   │   ├── 📄 preset.spec.ts
│   │   │   │   ├── 📄 preset.ts
│   │   │   │   ├── 📄 repair.ts
│   │   │   │   ├── 📄 upgrade.ts
│   │   │   │   ├── 📄 validate.ts
│   │   │   │   └── 📄 verify-project.ts
│   │   │   ├── 📁 fixtures
│   │   │   │   ├── ⚙️ invalid-config.json
│   │   │   │   └── ⚙️ valid-config.json
│   │   │   ├── 📁 utils
│   │   │   │   ├── 📄 error.ts
│   │   │   │   ├── 📄 loader.ts
│   │   │   │   ├── 📄 middleware.ts
│   │   │   │   ├── 📄 output.ts
│   │   │   │   ├── 📄 prompts.ts
│   │   │   │   ├── 📄 system.ts
│   │   │   │   └── 📄 version.ts
│   │   │   ├── 📄 context.ts
│   │   │   ├── 📄 index.spec.ts
│   │   │   ├── 📄 index.ts
│   │   │   ├── 📄 integration.spec.ts
│   │   │   ├── 📄 lifecycle.spec.ts
│   │   │   ├── 📄 phase-8-2-final.spec.ts
│   │   │   └── 📄 phase9.spec.ts
│   │   ├── 📚 CHANGELOG.md
│   │   ├── ⚙️ LICENSE
│   │   ├── ⚙️ package.json
│   │   ├── ⚙️ README.md
│   │   ├── ⚙️ tsconfig.json
│   │   └── ⚙️ tsup.config.ts
│   └── 📁 mcp-server
│       ├── 📁 src
│       │   ├── 📄 index.ts
│       │   ├── 📄 integration.spec.ts
│       │   ├── 📄 tools.spec.ts
│       │   └── 📄 tools.ts
│       ├── ⚙️ package.json
│       ├── ⚙️ tsconfig.json
│       └── ⚙️ tsup.config.ts
├── 📁 packages
│   ├── 📁 core
│   │   ├── 📁 src
│   │   │   ├── 📁 adapters
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 os.ts
│   │   │   │   └── 📄 package-manager.ts
│   │   │   ├── 📁 architecture
│   │   │   │   ├── 📄 explorer.spec.ts
│   │   │   │   ├── 📄 explorer.ts
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 tree.spec.ts
│   │   │   │   ├── 📄 tree.ts
│   │   │   │   ├── 📄 tree.ts.new
│   │   │   │   ├── 📄 types.ts
│   │   │   │   └── 📄 view.ts
│   │   │   ├── 📁 constants
│   │   │   │   ├── 📄 index.ts
│   │   │   │   └── 📄 matrix.ts
│   │   │   ├── 📁 events
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 execution
│   │   │   │   ├── 📄 engine.spec.ts
│   │   │   │   ├── 📄 engine.ts
│   │   │   │   ├── 📄 executor.ts
│   │   │   │   ├── 📄 graph.ts
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 rollback-final.spec.ts
│   │   │   │   ├── 📄 rollback.ts
│   │   │   │   └── 📄 session.ts
│   │   │   ├── 📁 extensions
│   │   │   │   ├── 📄 builtins.ts
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 manager.ts
│   │   │   │   └── 📄 sdk.ts
│   │   │   ├── 📁 filesystem
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 safe-ops.spec.ts
│   │   │   │   └── 📄 safe-ops.ts
│   │   │   ├── 📁 generation
│   │   │   │   ├── 📁 __snapshots__
│   │   │   │   ├── 📄 composable.spec.ts
│   │   │   │   ├── 📄 composable.ts
│   │   │   │   ├── 📄 enterprise-platform.spec.ts
│   │   │   │   ├── 📄 enterprise-platform.ts
│   │   │   │   ├── 📄 enterprise.spec.ts
│   │   │   │   └── 📄 enterprise.ts
│   │   │   ├── 📁 hooks
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 intelligence
│   │   │   │   ├── 📄 engine.ts
│   │   │   │   ├── 📄 ignore.ts
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   └── 📄 types.ts
│   │   │   ├── 📁 manifest
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 normalization
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 planning
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 platform
│   │   │   │   ├── 📄 dependency-graph.ts
│   │   │   │   ├── 📄 diff-engine.ts
│   │   │   │   ├── 📄 event-log.ts
│   │   │   │   ├── 📄 generator-composition.ts
│   │   │   │   ├── 📄 health-engine.spec.ts
│   │   │   │   ├── 📄 health-engine.ts
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 phase9.spec.ts
│   │   │   │   ├── 📄 phase9.ts
│   │   │   │   ├── 📄 plugin-sandbox.ts
│   │   │   │   ├── 📄 project-graph.spec.ts
│   │   │   │   ├── 📄 project-graph.ts
│   │   │   │   ├── 📄 project-validator.spec.ts
│   │   │   │   ├── 📄 project-validator.ts
│   │   │   │   ├── 📄 service-container.ts
│   │   │   │   ├── 📄 stack-detector.ts
│   │   │   │   ├── 📄 transaction-engine.ts
│   │   │   │   └── 📄 virtual-file-graph.ts
│   │   │   ├── 📁 presets
│   │   │   │   ├── 📄 preset-manager.spec.ts
│   │   │   │   ├── 📄 preset-manager.ts
│   │   │   │   └── 📄 preset-schema.ts
│   │   │   ├── 📁 registry
│   │   │   │   ├── 📄 base.ts
│   │   │   │   ├── 📄 dependency.ts
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 schemas
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 templates
│   │   │   │   ├── 📄 dsl.ts
│   │   │   │   ├── 📄 engine.spec.ts
│   │   │   │   ├── 📄 engine.ts
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 inheritance.ts
│   │   │   │   └── 📄 templates.ts
│   │   │   ├── 📁 types
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 validators
│   │   │   │   ├── 📄 index.spec.ts
│   │   │   │   └── 📄 index.ts
│   │   │   └── 📄 index.ts
│   │   ├── ⚙️ package.json
│   │   ├── ⚙️ tsconfig.json
│   │   └── ⚙️ tsup.config.ts
│   └── 📁 logger
│       ├── 📁 src
│       │   └── 📄 index.ts
│       ├── ⚙️ package.json
│       ├── ⚙️ tsconfig.json
│       └── ⚙️ tsup.config.ts
├── 📁 scripts
│   ├── 📄 verify-init-wizard-ux.js
│   ├── 📄 verify-phase-1-3.js
│   ├── 📄 verify-phase-4-final.js
│   ├── 📄 verify-phase-4.js
│   ├── 📄 verify-phase-5-5.js
│   ├── 📄 verify-phase-5.js
│   ├── 📄 verify-phase-6-final.js
│   ├── 📄 verify-phase-6.js
│   ├── 📄 verify-phase-7-final.js
│   ├── 📄 verify-phase-7.js
│   ├── 📄 verify-phase-8-1.js
│   ├── 📄 verify-phase-8-2-final.js
│   ├── 📄 verify-phase-8-2.js
│   ├── 📄 verify-phase-8.js
│   ├── 📄 verify-phase-9-12.js
│   └── 📄 verify-phase-9.js
├── ⚙️ .editorconfig
├── ⚙️ .gitignore
├── ⚙️ .prettierrc
├── 📚 CHANGELOG.md
├── ⚙️ eslint.config.js
├── ⚙️ LICENSE
├── ⚙️ package.json
├── ⚙️ README.md
├── 📄 structify-remaining-roadmap-analysis.txt
├── 📄 structify-roadmap-implementation-audit.txt
├── 📄 structify-v1-final-release-audit.txt
├── 📄 structify-v1-release-blocker-fix-report.txt
├── ⚙️ test-express-config.json
├── 📄 tmp_inspect_view.js
├── ⚙️ tsconfig.json
├── ⚙️ turbo.json
└── ⚙️ vitest.config.ts

```
