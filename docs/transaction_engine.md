# Transaction Engine

The Transaction Engine applies virtual file operations with commit and rollback semantics.

It tracks created files, created directories, backups, overwritten files, skipped files, failed operations, commit state, and rollback state. Rollback removes generated files and restores backups. It never deletes pre-existing user files that were not created by the transaction.
