# Execution Graph

A Directed Acyclic Graph (DAG) system representing the steps of project scaffolding.

## Logic

- **Cycle Detection**: Validates dependencies recursively to ensure no deadlock cycles exist.
- **Topological Sorting**: Formulates a linear execution sequence where every dependency is satisfied before dependent steps run.
