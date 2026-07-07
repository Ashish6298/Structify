# Structify Manifest

Generated Phase 7 projects include `structify.manifest.json`.

The manifest records Structify version, generated timestamp, project ID, template version, generator versions, plugin versions, stack hash, template hash, platform information, package manager, normalized configuration, dependency diagnostics, analytics, and the path and summary for `structify.project-graph.json`.

`structify inspect` reads this manifest first, then falls back to `structify.config.json` and known generated files for older projects.

`structify verify-project` checks that manifest metadata agrees with `structify.config.json` and `structify.project-graph.json`.
