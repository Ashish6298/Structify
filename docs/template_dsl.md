# Template DSL

The Phase 8 Template DSL supports deterministic rendering only. It does not execute arbitrary JavaScript.

Supported syntax:

- Variables: `{{projectName}}`
- Conditionals: `{{#if tools.docker}}...{{/if}}`
- Loops: `{{#each dependencies}}...{{/each}}`
- Partials: `{{> eslintConfig}}`
- Helpers: `{{kebab projectName}}`

The renderer rejects missing variables, unknown helpers, unknown partials, circular includes, unsafe variable paths, and unsafe partial paths.
