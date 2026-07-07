# Verification Reports

Phase 8 verification reports distinguish full-suite checks from focused checks.

Full test-suite sections run `npm test` and represent total repository coverage. Focused verification sections run filtered Vitest commands for targeted subsystems such as Project Graph. Skipped tests shown by filtered commands are acceptable only when at least one matching test actually runs.

## Phase 8.2 Focused Verification

Focused verification sections must run at least one matching test. A filtered command that exits successfully but skips every test is reported as a failure in `npm run verify:phase-8-2`.

The Phase 8.2 report also records npm dependency status with `npm ls --workspaces --depth=0 --package-lock=false`. `.pnpm` paths or extraneous package noise fail the report unless the report includes an explicit documented exception.

## Expected Negative Paths

Some verification sections intentionally run commands that should fail, such as scaffolding into a non-empty target directory or adding an incompatible module. These sections must be labeled as `PASS (Expected Failure Verified)` or `VERIFIED NEGATIVE PATH`. The report records the expected error code, actual error code, rollback requirement, rollback execution status, and why the section passed.
