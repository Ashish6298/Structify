import { ProjectConfig, NormalizedProjectConfig, ValidationError } from '../types/index.js';

export function validateProjectName(name: string): string[] {
  const errors: string[] = [];

  if (!name || name.trim() === '') {
    errors.push('Project name cannot be empty.');
    return errors;
  }

  if (name.length > 214) {
    errors.push('Project name cannot exceed 214 characters.');
  }

  if (name.startsWith('.') || name.startsWith('_')) {
    errors.push('Project name cannot start with a dot or underscore.');
  }

  if (/[A-Z]/.test(name)) {
    errors.push('Project name cannot contain uppercase letters.');
  }

  if (/\s/.test(name)) {
    errors.push('Project name cannot contain spaces.');
  }

  // URL friendly characters only (alphanumeric, -, _, .)
  if (!/^[a-z0-9-_.]+$/.test(name)) {
    errors.push(
      'Project name can only contain lowercase letters, numbers, hyphens, underscores, and dots.',
    );
  }

  return errors;
}

export function normalizeConfig(input: ProjectConfig): {
  config?: NormalizedProjectConfig;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  // Project name check
  const nameErrors = validateProjectName(input.projectName);
  for (const err of nameErrors) {
    errors.push({
      code: 'INVALID_PROJECT_NAME',
      field: 'projectName',
      message: err,
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  // Deduce Mode if not specified
  const frontend = input.stack?.frontend ?? 'none';
  const backend = input.stack?.backend ?? 'none';

  let mode = input.mode;
  if (!mode) {
    if (frontend !== 'none' && backend !== 'none') {
      mode = 'fullstack';
    } else if (frontend !== 'none') {
      mode = 'frontend-only';
    } else if (backend !== 'none') {
      mode = 'backend-only';
    } else {
      // Default fallback
      mode = 'fullstack';
    }
  }

  const normalized: NormalizedProjectConfig = {
    projectName: input.projectName.trim(),
    version: input.version || '1.0',
    mode,
    language: 'typescript',
    stack: {
      frontend,
      backend,
      styling: input.stack?.styling ?? 'none',
      database: input.stack?.database ?? 'none',
      orm: input.stack?.orm ?? 'none',
      packageManager: input.stack?.packageManager ?? 'npm',
    },
    tools: {
      docker: input.tools?.docker ?? false,
      eslint: input.tools?.eslint ?? true,
      prettier: input.tools?.prettier ?? true,
      githubActions: input.tools?.githubActions ?? false,
      git: input.tools?.git ?? true,
      editorconfig: input.tools?.editorconfig ?? true,
      husky: input.tools?.husky ?? false,
      lintStaged: input.tools?.lintStaged ?? false,
      commitlint: input.tools?.commitlint ?? false,
    },
  };

  return {
    config: normalized,
    errors: [],
  };
}
