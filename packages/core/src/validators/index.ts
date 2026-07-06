import {
  ProjectConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types/index.js';
import { normalizeConfig } from '../normalization/index.js';

export function validateStack(configInput: ProjectConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Normalize config first
  const { config, errors: normErrors } = normalizeConfig(configInput);
  if (normErrors.length > 0) {
    return {
      valid: false,
      errors: normErrors,
      warnings: [],
    };
  }

  if (!config) {
    return {
      valid: false,
      errors: [{ code: 'NOMINAL_ERROR', message: 'Failed to normalize configuration.' }],
      warnings: [],
    };
  }

  const { frontend, backend, styling, database, orm } = config.stack;
  const mode = config.mode;

  // 2. Mode sanity rules
  if (frontend === 'none' && backend === 'none') {
    errors.push({
      code: 'EMPTY_SELECTION',
      message: 'At least one of frontend or backend must be selected.',
    });
  }

  if (mode === 'frontend-only' && backend !== 'none') {
    errors.push({
      code: 'INVALID_MODE_STACK',
      message: 'Frontend-only mode cannot include a backend stack.',
    });
  }

  if (mode === 'backend-only' && frontend !== 'none') {
    errors.push({
      code: 'INVALID_MODE_STACK',
      message: 'Backend-only mode cannot include a frontend stack.',
    });
  }

  if (mode === 'fullstack' && (frontend === 'none' || backend === 'none')) {
    errors.push({
      code: 'INVALID_MODE_STACK',
      message: 'Fullstack mode requires both frontend and backend stacks.',
    });
  }

  // 3. Styling rules
  if (mode === 'backend-only' && styling !== 'none') {
    errors.push({
      code: 'BACKEND_STYLING',
      message: 'Backend-only projects cannot include styling libraries.',
    });
  }

  if (styling !== 'none' && frontend === 'none') {
    errors.push({
      code: 'STYLING_REQUIRES_FRONTEND',
      message: `${styling === 'tailwind' ? 'Tailwind CSS' : 'Material UI'} requires a frontend framework.`,
    });
  }

  // 4. Database & ORM pairings
  if (database === 'postgres' && orm !== 'prisma') {
    errors.push({
      code: 'POSTGRES_REQUIRES_PRISMA',
      message: 'PostgreSQL requires Prisma in the MVP.',
    });
  }

  if (database === 'mongodb' && orm !== 'mongoose') {
    errors.push({
      code: 'MONGODB_REQUIRES_MONGOOSE',
      message: 'MongoDB requires Mongoose in the MVP.',
    });
  }

  if (orm === 'prisma' && database === 'mongodb') {
    errors.push({
      code: 'PRISMA_MONGODB_INCOMPATIBLE',
      message: 'Prisma cannot be paired with MongoDB in the MVP.',
    });
  }

  if (orm === 'mongoose' && database !== 'mongodb') {
    errors.push({
      code: 'MONGOOSE_REQUIRES_MONGODB',
      message: 'Mongoose can only be paired with MongoDB.',
    });
  }

  if (database === 'none' && orm !== 'none') {
    errors.push({
      code: 'ORM_WITHOUT_DATABASE',
      message: 'An ORM cannot be selected when no database is configured.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedConfig: errors.length === 0 ? config : undefined,
  };
}
