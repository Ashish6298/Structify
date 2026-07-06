# Template Inheritance

Phase 8 adds template inheritance for base templates, child templates, named slots, block overrides, includes, partials, and composition validation.

Templates can extend a parent and override named slots without duplicating the entire file. The engine validates missing parents, circular inheritance, invalid slot overrides, unresolved includes, unsafe target paths, and path conflicts before rendering.

Example:

```text
base: {{#slot body}}default{{/slot}}
child block body: Hello {{projectName}}
```

Rendering the child with `{ "projectName": "demo" }` produces `Hello demo`.
