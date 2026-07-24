import { PredefinedTemplateDefinition } from '../types.js';
import {
  createFullstackArchitecturePlan,
  DEFAULT_FULLSTACK_WORKSPACE,
  FullstackFeatureId,
} from '../../../generation/fullstack-architecture.js';
import {
  NormalizedProjectConfig,
  FrontendOption,
  BackendOption,
  DatabaseOption,
  OrmOption,
} from '../../../types/index.js';

export const projectManagementPlatformTemplate: PredefinedTemplateDefinition = {
  metadata: {
    id: 'project-management-platform',
    name: 'Project Management Platform',
    category: 'fullstack',
    description:
      'Configurable responsive workspace foundation with Kanban, sprint, backlog, calendar, timeline, roles & workspaces.',
    supportedFrameworks: ['next', 'vite-react'],
    supportedStyling: ['tailwind', 'mui', 'none'],
    defaultFramework: 'next',
    defaultStyling: 'tailwind',
    generatedFiles: [
      'src/features',
      'src/shared/api',
      'src/server/application',
      'src/server/routes',
      'src/server/infrastructure/database',
      'docs/pm-architecture.md',
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
      'Kanban board renders',
      'API module boundaries generated',
    ],
    sections: [
      'Workspaces & teams',
      'Projects & milestones',
      'Kanban board & sprints',
      'Backlog & backlog views',
      'Authentication & settings',
      'Comments & activity logs',
      'Attachments & files',
    ],
    components: [
      'PM Shell',
      'Kanban column',
      'Task card',
      'Project selector',
      'API client',
      'Project service',
      'Task service',
      'Repository boundary',
    ],
    layoutType: 'Responsive Kanban workspace with modular fullstack architecture',
    successSummary:
      'Generated Project Management Platform starter with the selected technology stack.',
    quickTips: [
      'Connect team notification hooks or email settings post-generation.',
      'Implement database repositories behind the generated application-service boundaries.',
    ],
  },
  fullstackDefinition: {
    files: ({ frontend, backend, database, orm, projectName }) => {
      const mockConfig: NormalizedProjectConfig = {
        projectName,
        version: '1.0',
        mode: 'fullstack',
        language: 'typescript',
        stack: {
          frontend: frontend as FrontendOption,
          backend: backend as BackendOption,
          styling: 'tailwind' as const,
          database: database as DatabaseOption,
          orm: orm as OrmOption,
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
        'users',
        'organizations',
        'teams',
        'roles',
        'permissions',
        'files',
        'documents',
        'comments',
        'activity-logs',
        'attachments',
        'dashboards',
        'reports',
        'tags',
        'labels',
        'projects',
        'milestones',
        'epics',
        'sprints',
        'tasks',
        'subtasks',
        'board',
      ];

      const plan = createFullstackArchitecturePlan(
        mockConfig,
        [],
        featuresList,
        DEFAULT_FULLSTACK_WORKSPACE,
      );

      return (plan.files ?? []).map((file) => {
        let rawPath = file.path;
        if (rawPath.startsWith('frontend/app/')) {
          rawPath = rawPath.replace('frontend/app/', 'app/');
        } else if (rawPath.startsWith('frontend/src/')) {
          rawPath = rawPath.replace('frontend/src/', 'src/');
        } else if (rawPath.startsWith('packages/shared/src/')) {
          rawPath = rawPath.replace('packages/shared/src/', 'src/shared/');
        } else if (rawPath.startsWith('backend/src/')) {
          rawPath = rawPath.replace('backend/src/', 'src/server/');
        }
        return {
          path: rawPath,
          content: file.content,
        };
      });
    },
  },
};
