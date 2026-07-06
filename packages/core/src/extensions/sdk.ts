import { NormalizedProjectConfig, PlanStep, ProjectMode, ValidationError } from '../types/index.js';
import { GeneratedTemplateFile } from '../templates/templates.js';
import { DependencyEntry } from '../registry/dependency.js';
import { HookDefinition } from '../hooks/index.js';

export type ExtensionStatus = 'stable' | 'experimental' | 'deprecated' | 'disabled';

export interface ExtensionMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  status?: ExtensionStatus;
}

export interface TemplateTargetRules {
  allowOverwrite?: boolean;
  allowPathTraversal?: false;
  conflictPolicy?: 'error' | 'skip' | 'overwrite';
}

export interface TemplateDefinition extends ExtensionMetadata {
  requiredVariables: string[];
  optionalVariables?: string[];
  targetPath: string;
  targetPathRules?: TemplateTargetRules;
  supportedStacks?: string[];
  supportedModes?: ProjectMode[];
  condition?: (config: NormalizedProjectConfig) => boolean;
  render: (variables: Record<string, string>, config: NormalizedProjectConfig) => string;
  validateRendered?: (content: string) => string[];
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GeneratorDefinition extends ExtensionMetadata {
  supportedStacks: string[];
  supportedModes: ProjectMode[];
  requiredTemplates?: string[];
  dependencyEntries?: DependencyEntry[];
  validateConfig?: (config: NormalizedProjectConfig) => ValidationError[];
  contributePlan?: (config: NormalizedProjectConfig) => PlanStep[];
  generateFiles?: (config: NormalizedProjectConfig) => GeneratedTemplateFile[];
  verify?: (projectPath: string) => Promise<{ success: boolean; errors: string[] }>;
}

export interface ModuleDefinitionSdk extends ExtensionMetadata {
  supportedProjectTypes: ProjectMode[];
  detectionRules: string[];
  requiredTemplates?: string[];
  dependencyEntries?: DependencyEntry[];
  migrationSteps?: PlanStep[];
  conflictPolicy?: 'error' | 'skip' | 'overwrite';
  rollbackStrategy?: string;
  verify?: (projectPath: string) => Promise<{ success: boolean; errors: string[] }>;
}

export interface PluginMetadata extends ExtensionMetadata {
  author: string;
  supportedStructifyVersion: string;
  providedGenerators?: string[];
  providedTemplates?: string[];
  providedModules?: string[];
  providedHooks?: string[];
  providedDoctorChecks?: string[];
  providedValidators?: string[];
}

export interface PluginDefinition {
  metadata: PluginMetadata;
  generators?: GeneratorDefinition[];
  templates?: TemplateDefinition[];
  modules?: ModuleDefinitionSdk[];
  hooks?: HookDefinition[];
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onBeforePlanning?: () => Promise<void> | void;
  onAfterPlanning?: () => Promise<void> | void;
  onBeforeGeneration?: () => Promise<void> | void;
  onAfterGeneration?: () => Promise<void> | void;
  onBeforeTemplateRender?: () => Promise<void> | void;
  onAfterTemplateRender?: () => Promise<void> | void;
  onBeforeRollback?: () => Promise<void> | void;
  onAfterRollback?: () => Promise<void> | void;
}

export function validateTemplateDefinition(template: TemplateDefinition): TemplateValidationResult {
  const errors: string[] = [];
  validateMetadata(template, errors);
  if (template.targetPath.includes('..')) {
    errors.push(`Template "${template.id}" target path cannot contain path traversal.`);
  }
  const duplicateVariables = findDuplicates([
    ...template.requiredVariables,
    ...(template.optionalVariables ?? []),
  ]);
  for (const variable of duplicateVariables) {
    errors.push(`Template "${template.id}" declares duplicate variable "${variable}".`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderTemplateDefinition(
  template: TemplateDefinition,
  variables: Record<string, string>,
  config: NormalizedProjectConfig,
): GeneratedTemplateFile {
  const validation = validateTemplateDefinition(template);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  for (const requiredVariable of template.requiredVariables) {
    if (!(requiredVariable in variables)) {
      throw new Error(`Missing required template variable "${requiredVariable}".`);
    }
  }
  const knownVariables = new Set([
    ...template.requiredVariables,
    ...(template.optionalVariables ?? []),
  ]);
  for (const variable of Object.keys(variables)) {
    if (!knownVariables.has(variable)) {
      throw new Error(`Unknown template variable "${variable}".`);
    }
  }
  if (template.supportedModes && !template.supportedModes.includes(config.mode)) {
    throw new Error(`Template "${template.id}" does not support mode "${config.mode}".`);
  }
  if (template.condition && !template.condition(config)) {
    throw new Error(`Template "${template.id}" condition did not match selected config.`);
  }
  const content = template.render(variables, config);
  const renderedErrors = template.validateRendered?.(content) ?? [];
  if (renderedErrors.length > 0) {
    throw new Error(renderedErrors.join(', '));
  }
  return { path: template.targetPath, content };
}

export function validateGeneratorDefinition(generator: GeneratorDefinition): void {
  const errors: string[] = [];
  validateMetadata(generator, errors);
  if (generator.supportedStacks.length === 0) {
    errors.push(`Generator "${generator.id}" must support at least one stack.`);
  }
  if (generator.supportedModes.length === 0) {
    errors.push(`Generator "${generator.id}" must support at least one project mode.`);
  }
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}

export function validateModuleDefinition(moduleDefinition: ModuleDefinitionSdk): void {
  const errors: string[] = [];
  validateMetadata(moduleDefinition, errors);
  if (moduleDefinition.supportedProjectTypes.length === 0) {
    errors.push(`Module "${moduleDefinition.id}" must support at least one project type.`);
  }
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}

export function validatePluginMetadata(metadata: PluginMetadata): void {
  const errors: string[] = [];
  validateMetadata(metadata, errors);
  if (!metadata.author.trim()) {
    errors.push('Plugin author is required.');
  }
  if (!metadata.supportedStructifyVersion.trim()) {
    errors.push('Plugin supported Structify version range is required.');
  }
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}

function validateMetadata(metadata: ExtensionMetadata, errors: string[]): void {
  if (!metadata.id.trim()) errors.push('Extension id is required.');
  if (!metadata.name.trim()) errors.push(`Extension "${metadata.id}" name is required.`);
  if (!metadata.version.trim()) errors.push(`Extension "${metadata.id}" version is required.`);
  if (!metadata.description.trim()) {
    errors.push(`Extension "${metadata.id}" description is required.`);
  }
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
