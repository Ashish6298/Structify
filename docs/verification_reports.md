# Verification Reports

Phase 8 verification reports distinguish full-suite checks from focused checks.

Full test-suite sections run `npm test` and represent total repository coverage. Focused verification sections run filtered Vitest commands for targeted subsystems such as Template DSL or the Virtual File Graph. Skipped tests shown by filtered commands are expected and do not indicate reduced coverage.
