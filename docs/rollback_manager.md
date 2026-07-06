# Rollback Manager

Handles execution rollback stacks to restore files in case of errors.

## Characteristics

- **LIFO Stack**: Rollback actions are popped and executed in reverse order.
- **Deterministic**: Standardized actions guarantee the state returns to clean.
