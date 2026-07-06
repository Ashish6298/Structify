# Hook System

Hooks let built-in extensions and future plugins run ordered async logic at lifecycle points.

Supported points include config normalization, validation, planning, generation, template rendering, file writing, dependency resolution, command planning, rollback, inspect, and repair. Hooks are sorted by priority, can cancel blocking workflows, and emit Event Bus activity.

Phase 7 uses hooks internally and keeps third-party package loading deferred.
