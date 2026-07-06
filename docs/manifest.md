# Structify Manifest

Generated Phase 7 projects include `structify.manifest.json`.

The manifest records Structify version, generated timestamp, project ID, template version, generator versions, plugin versions, stack hash, template hash, platform information, package manager, and normalized configuration.

`structify inspect` reads this manifest first, then falls back to `structify.config.json` and known generated files for older projects.
