import { Registry, RegistryItem } from './base.js';
import { dependencyRegistry } from './dependency.js';

export * from './base.js';
export * from './dependency.js';

export interface GeneratorItem extends RegistryItem {
  supportedStacks: string[];
  generatedFiles: string[];
}

export interface TemplateItem extends RegistryItem {
  targetPathPattern: string;
  requiredVariables: string[];
  optionalVariables?: string[];
  supportedStacks?: string[];
  supportedModes?: string[];
}

export interface PluginItem extends RegistryItem {
  author: string;
  supportedStructifyVersion: string;
  providedGenerators?: string[];
  providedTemplates?: string[];
  providedModules?: string[];
}

export interface ModuleItem extends RegistryItem {
  packageDependencies?: string[];
}

export interface PackageManagerItem extends RegistryItem {
  installCommand: string;
}

export interface FileOperationItem extends RegistryItem {
  operationType: string;
}

export interface CommandExecutorItem extends RegistryItem {
  executorType: string;
}

export interface ValidationProviderItem extends RegistryItem {
  validationType: string;
}

// Global registry instances
export const generatorRegistry = new Registry<GeneratorItem>();
export const templateRegistry = new Registry<TemplateItem>();
export const pluginRegistry = new Registry<PluginItem>();
export const moduleRegistry = new Registry<ModuleItem>();
export const packageManagerRegistry = new Registry<PackageManagerItem>();
export const fileOperationRegistry = new Registry<FileOperationItem>();
export const commandExecutorRegistry = new Registry<CommandExecutorItem>();
export const validationProviderRegistry = new Registry<ValidationProviderItem>();

export function registerBuiltIns(): void {
  generatorRegistry.clear();
  templateRegistry.clear();
  pluginRegistry.clear();
  moduleRegistry.clear();
  packageManagerRegistry.clear();
  fileOperationRegistry.clear();
  commandExecutorRegistry.clear();
  validationProviderRegistry.clear();
  dependencyRegistry.clear();

  generatorRegistry.register({
    id: 'gen-next',
    name: 'Next.js Generator',
    description: 'Scaffolds Next.js frontend application layer',
    version: '1.0.0',
    supportedStacks: ['next'],
    generatedFiles: ['package.json', 'next.config.js', 'src/app/page.tsx'],
    status: 'stable',
  });

  generatorRegistry.register({
    id: 'gen-express',
    name: 'Express Generator',
    description: 'Scaffolds Express backend server layer',
    version: '1.0.0',
    supportedStacks: ['express'],
    generatedFiles: ['package.json', 'src/index.ts'],
    status: 'stable',
  });

  templateRegistry.register({
    id: 'tmpl-next-config',
    name: 'Next.js Config template',
    description: 'Configuration file for Next.js app',
    version: '1.0.0',
    targetPathPattern: 'next.config.js',
    requiredVariables: ['projectName'],
  });

  pluginRegistry.register({
    id: 'plug-builtin',
    name: 'Built-in Features Plugin',
    description: 'Provides built-in generators and templates for Structify',
    version: '1.0.0',
    author: 'Structify Team',
    supportedStructifyVersion: '>=1.0.0',
    providedGenerators: ['gen-next', 'gen-express'],
    providedTemplates: ['tmpl-next-config'],
  });

  moduleRegistry.register({
    id: 'mod-tailwind',
    name: 'Tailwind CSS Module',
    description: 'Tailwind CSS styling library',
    version: '1.0.0',
    packageDependencies: ['tailwindcss', 'postcss', 'autoprefixer'],
  });

  packageManagerRegistry.register({
    id: 'pm-npm',
    name: 'npm',
    description: 'npm package manager',
    version: '1.0.0',
    installCommand: 'npm install',
  });

  fileOperationRegistry.register({
    id: 'fop-create-dir',
    name: 'Create Directory',
    description: 'Creates a directory recursively',
    version: '1.0.0',
    operationType: 'createDirectory',
  });

  commandExecutorRegistry.register({
    id: 'cmd-dryrun',
    name: 'Dry Run Executor',
    description: 'Command executor that prints actions without executing them',
    version: '1.0.0',
    executorType: 'dryrun',
  });

  validationProviderRegistry.register({
    id: 'val-stack',
    name: 'Stack Compatibility Validator',
    description: 'Validates stack compatibility matrices',
    version: '1.0.0',
    validationType: 'compatibility',
  });

  dependencyRegistry.register({
    packageName: 'next',
    versionRange: '^14.0.0',
    dependencyType: 'prod',
    supportedPackageManagers: ['npm'],
    installScope: 'workspace',
    targetWorkspace: 'frontend',
    reason: 'Next.js framework dependency',
  });

  dependencyRegistry.register({
    packageName: 'react',
    versionRange: '^18.2.0',
    dependencyType: 'prod',
    supportedPackageManagers: ['npm'],
    installScope: 'workspace',
    targetWorkspace: 'frontend',
    reason: 'React frontend framework dependency',
  });

  dependencyRegistry.register({
    packageName: 'express',
    versionRange: '^4.18.2',
    dependencyType: 'prod',
    supportedPackageManagers: ['npm'],
    installScope: 'workspace',
    targetWorkspace: 'backend',
    reason: 'Express server framework dependency',
  });

  dependencyRegistry.register({
    packageName: 'tailwindcss',
    versionRange: '^3.4.0',
    dependencyType: 'dev',
    supportedPackageManagers: ['npm'],
    installScope: 'workspace',
    targetWorkspace: 'frontend',
    reason: 'Tailwind CSS styling library',
  });
}

// Automatically register built-in components
registerBuiltIns();
