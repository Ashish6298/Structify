# Generator Registry

The Generator Registry contains the declarations of future project scaffolders.

## Contracts

Each generator item contains:

- `id`: Unique identifier (e.g. `gen-next`)
- `name`: Human-readable name
- `description`: Scope of the generator
- `version`: Version string
- `supportedStacks`: Matching technologies (e.g. `['next']`)
- `generatedFiles`: Expected files list
- `status`: Deployment state (`stable`, `experimental`, `deprecated`, `disabled`)

> [!NOTE]
> Phase 5.5 only registers generator placeholders. Actual filesystem generation is deferred to Phase 6.
