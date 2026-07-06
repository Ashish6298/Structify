# Template Registry

The Phase 7 Template SDK lets templates declare metadata, required variables, optional variables, target path rules, conditions, conflict policy, render strategy, supported stacks, supported project modes, and post-render validation.

Template validation catches missing variables, duplicate variables, unknown variables, unsupported modes, conditional mismatches, and path traversal attempts before files are written.

The Template Registry manages reusable file blueprints.

## Metadata

- `id`: Blueprint unique ID (e.g. `tmpl-next-config`)
- `targetPathPattern`: Result filename/pattern
- `requiredVariables`: Mandatory keys for interpolation
- `optionalVariables`: Optional keys for customization
