export type CLIErrorCode =
  | 'VALIDATION_ERROR'
  | 'USAGE_ERROR'
  | 'UNSUPPORTED_ERROR'
  | 'MISSING_FILE_ERROR'
  | 'CANCELLED'
  | 'PLANNING_ERROR'
  | 'TARGET_DIRECTORY_NOT_EMPTY'
  | 'CONFLICT_ERROR'
  | 'MODULE_ALREADY_PRESENT'
  | 'MODULE_INCOMPATIBLE'
  | 'PATCH_CONFLICT'
  | 'UPGRADE_REQUIRES_REVIEW'
  | 'PRESET_NOT_FOUND'
  | 'PRESET_SCHEMA_INVALID'
  | 'PRESET_VERSION_UNSUPPORTED'
  | 'PRESET_IMPORT_FAILED'
  | 'PRESET_EXPORT_FAILED'
  | 'PRESET_MIGRATION_REQUIRED'
  | 'PRESET_CONFLICT'
  // Phase 7: Project Health System
  | 'PROJECT_NOT_FOUND'
  | 'METADATA_MISSING'
  | 'MANIFEST_INVALID'
  | 'PROJECT_GRAPH_INVALID'
  | 'DEPENDENCY_GRAPH_INVALID'
  | 'STACK_DETECTION_FAILED'
  | 'DRIFT_DETECTED'
  | 'REPAIR_NOT_SAFE'
  | 'REPAIR_PLAN_READY'
  | 'REPAIR_APPLIED'
  | 'INTERNAL_ERROR';

export class StructifyCLIError extends Error {
  constructor(
    public code: CLIErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'StructifyCLIError';
    Object.setPrototypeOf(this, StructifyCLIError.prototype);
  }
}
