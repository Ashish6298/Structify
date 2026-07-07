# Project Graph

Generated projects include `structify.project-graph.json`.

The graph records:

- Project name and Structify graph version.
- Stack hash derived from the normalized stack.
- Nodes for the app root, packages, pages, layouts, API endpoints, services, database clients, models, config files, scripts, and tooling.
- Edges that describe relationships such as `contains`, `imports`, `uses`, `configures`, and `runs`.
- Summary counts by node type.

`structify.manifest.json` stores the graph path and graph summary. `structify verify-project` checks that the graph version, project name, stack hash, edge references, summary counts, file-backed nodes, and manifest graph summary are consistent.

Focused Project Graph verification is run by `npm run verify:phase-8-2`. The report fails if the focused filter runs zero matching tests.
