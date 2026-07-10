import { portfolioTemplate } from './portfolio.js';
import { saasLandingTemplate } from './saas-landing.js';
import { adminDashboardTemplate } from './admin-dashboard.js';
import { agencyBusinessTemplate } from './agency-business.js';
import { blogContentTemplate } from './blog-content.js';
import { PredefinedTemplateDefinition } from '../types.js';

export const frontendTemplates: PredefinedTemplateDefinition[] = [
  portfolioTemplate,
  saasLandingTemplate,
  adminDashboardTemplate,
  agencyBusinessTemplate,
  blogContentTemplate,
];

export * from './portfolio.js';
export * from './saas-landing.js';
export * from './admin-dashboard.js';
export * from './agency-business.js';
export * from './blog-content.js';
