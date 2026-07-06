# Plugin Sandbox

Phase 8 defines the plugin sandbox boundary.

Sandboxed plugins receive a restricted API for reading config, emitting events, adding diagnostics, and contributing virtual files. They do not receive raw filesystem access, raw process access, or unrestricted command execution.

External npm plugin loading remains deferred.
