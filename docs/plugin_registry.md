# Plugin Registry

Phase 7 formalizes built-in plugin lifecycle contracts. Plugins declare metadata, supported Structify version range, provided generators, templates, modules, hooks, doctor checks, validators, and optional lifecycle methods.

Only internal built-in plugins are loaded in Phase 7. External npm package loading is intentionally deferred, but the Plugin SDK and manager validate metadata, prevent duplicate IDs, register contributions, and emit plugin lifecycle events.

Defines the structure for third-party and built-in extension packages.

## Metadata

- `providedGenerators`: Generators exposed by this plugin
- `providedTemplates`: Blueprints exposed by this plugin
- `providedModules`: Incremental modules included
