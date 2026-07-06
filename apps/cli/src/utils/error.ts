export type CLIErrorCode =
  | 'VALIDATION_ERROR'
  | 'USAGE_ERROR'
  | 'UNSUPPORTED_ERROR'
  | 'MISSING_FILE_ERROR'
  | 'CANCELLED'
  | 'PLANNING_ERROR'
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
