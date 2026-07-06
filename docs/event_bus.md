# Event Bus

Phase 7 introduces a typed Event Bus in `@structify/core`. Internals emit lifecycle events without coupling to terminal output.

Events include generation, planning, template rendering, file writes, dependency resolution, commands, rollback, plugins, hooks, and diagnostics. Every event includes an ID, timestamp, session ID, severity, source, payload, and optional correlation ID.

CLI output remains quiet by default. JSON output includes event summaries only when `--verbose` or `--debug` is used.

Phase 8 can persist events with `structify init --event-log`, writing newline-delimited JSON to `.structify/events.ndjson`.
