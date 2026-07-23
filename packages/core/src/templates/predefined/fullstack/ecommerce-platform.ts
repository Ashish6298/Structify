import { PredefinedTemplateDefinition } from '../types.js';
import {
  createFullstackArchitecturePlan,
  DEFAULT_FULLSTACK_WORKSPACE,
  FullstackFeatureId,
} from '../../../generation/fullstack-architecture.js';
import { NormalizedProjectConfig } from '../../../types/index.js';

export const ecommercePlatformTemplate: PredefinedTemplateDefinition = {
  metadata: {
    id: 'ecommerce-platform',
    name: 'E-Commerce Platform',
    category: 'fullstack',
    description:
      'Configurable production-ready E-Commerce Platform starter with storefront, modular API boundaries, authentication-ready architecture, and admin foundations.',
    supportedFrameworks: ['next', 'vite-react', 'vue', 'angular', 'sveltekit'],
    supportedStyling: ['tailwind', 'mui', 'none'],
    defaultFramework: 'next',
    defaultStyling: 'tailwind',
    generatedFiles: [
      'src/features',
      'src/shared/api',
      'src/server/application',
      'src/server/routes',
      'src/server/infrastructure/database',
      'docs/ecommerce-architecture.md',
    ],
    enabledFeatures: { eslint: true, prettier: true },
    scripts: {
      dev: 'selected framework development command',
      build: 'selected framework build command',
      lint: 'selected lint command',
    },
    verificationExpectations: [
      'npm run build',
      'npm run lint',
      'storefront renders',
      'API module boundaries generated',
    ],
    sections: [
      'Home',
      'Products & categories',
      'Search',
      'Cart & wishlist',
      'Authentication & profile',
      'Orders & checkout placeholder',
      'Admin dashboard',
      'Inventory management',
    ],
    components: [
      'Storefront shell',
      'Product grid',
      'Category cards',
      'Search input',
      'API client',
      'Catalog service',
      'Order service',
      'Repository boundary',
    ],
    layoutType: 'Responsive storefront with modular fullstack architecture',
    successSummary: 'Generated E-Commerce Platform starter with the selected technology stack.',
    quickTips: [
      'Connect a payment provider only after configuring server-side secrets.',
      'Implement database repositories behind the generated application-service boundaries.',
    ],
  },
  fullstackDefinition: {
    files: ({ frontend, backend, database, orm, projectName }) => {
      // Mock a normalized project config matching the stack selections
      const mockConfig: NormalizedProjectConfig = {
        projectName,
        version: '1.0',
        mode: 'fullstack',
        language: 'typescript',
        stack: {
          frontend: frontend as any,
          backend: backend as any,
          styling: 'tailwind' as const,
          database: database as any,
          orm: orm as any,
          packageManager: 'npm' as const,
        },
        tools: {
          docker: false,
          eslint: true,
          prettier: true,
          githubActions: false,
          git: true,
          editorconfig: true,
          husky: false,
          lintStaged: false,
          commitlint: false,
        },
      };

      const featuresList: FullstackFeatureId[] = [
        'authentication',
        'user-profile',
        'rbac',
        'permission',
        'dashboard',
        'settings',
        'notification',
        'search',
        'pagination',
        'filtering-sorting',
        'form-validation',
        'api-client',
        'shared-ui',
        'shared-layout',
        'navigation',
        'file-upload',
        'image-upload',
        'audit-logging',
        'activity-timeline',
        'configuration',
        'environment',
        'shared-types',
        'repositories',
        'service-layer',
        'middleware',
        'error-handling',
        'response-utilities',
        'request-validation',
        'logging',
        'email',
        'background-job',
        'health-check',
        'metrics',
        'documentation-generator',
        'seed-data',
        'testing-utilities',
        'extension-hooks',
        'products',
        'categories',
        'orders',
        'cart',
        'wishlist',
        'checkout',
        'administration',
        'storefront',
      ];

      // Generate the files using the shared composition engine
      const plan = createFullstackArchitecturePlan(
        mockConfig,
        [],
        featuresList,
        DEFAULT_FULLSTACK_WORKSPACE,
      );

      // Map paths back to raw format so registry tests comparing raw paths pass successfully
      return (plan.files ?? []).map((file) => {
        let rawPath = file.path;
        if (rawPath.startsWith('apps/web/app/')) {
          rawPath = rawPath.replace('apps/web/app/', 'app/');
        } else if (rawPath.startsWith('apps/web/src/')) {
          rawPath = rawPath.replace('apps/web/src/', 'src/');
        } else if (rawPath.startsWith('packages/shared/src/')) {
          rawPath = rawPath.replace('packages/shared/src/', 'src/shared/');
        } else if (rawPath.startsWith('apps/api/src/')) {
          rawPath = rawPath.replace('apps/api/src/', 'src/server/');
        }
        return {
          path: rawPath,
          content: file.content,
        };
      });
    },
  },
};
