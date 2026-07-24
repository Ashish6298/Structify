import { PredefinedTemplateDefinition } from '../types.js';
import { ecommercePlatformTemplate } from './ecommerce-platform.js';
import { projectManagementPlatformTemplate } from './project-management-platform.js';

export const fullstackTemplates: PredefinedTemplateDefinition[] = [
  ecommercePlatformTemplate,
  projectManagementPlatformTemplate,
];

export * from './ecommerce-platform.js';
export * from './project-management-platform.js';
