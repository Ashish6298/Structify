import { describe, it, expect, vi } from 'vitest';
import {
  getTemplateSections,
  formatTemplateProjectSummary,
  formatTemplateSuccessSummary,
} from './commands/init.js';
import { validateStack, PREDEFINED_TEMPLATES, getPredefinedTemplateFiles } from '@structify/core';

vi.mock('./utils/prompts.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./utils/prompts.js')>();
  return {
    ...original,
    promptSetupTypeSelection: vi.fn(),
    promptTemplateCategory: vi.fn(),
    promptTemplateSelection: vi.fn(),
    promptStylingSelection: vi.fn(),
    promptProjectNameInput: vi.fn(),
  };
});

describe('Predefined Templates Flow', () => {
  it('should expose five predefined templates with correct metadata', () => {
    const frontendTemplates = PREDEFINED_TEMPLATES.filter(
      (template) => template.category === 'frontend',
    );
    expect(frontendTemplates).toHaveLength(5);
    const ids = frontendTemplates.map((t) => t.id);
    expect(ids).toContain('portfolio-website');
    expect(ids).toContain('saas-landing');
    expect(ids).toContain('admin-dashboard');
    expect(ids).toContain('agency-business');
    expect(ids).toContain('blog-content');

    for (const t of frontendTemplates) {
      expect(t.category).toBe('frontend');
      expect(t.description).toBeDefined();
      expect(t.supportedFrameworks).toContain('next');
      expect(t.supportedStyling).toContain('tailwind');
      expect(t.sections?.length).toBeGreaterThan(0);
      expect(t.components?.length).toBeGreaterThan(0);
      expect(t.layoutType).toBeDefined();
      expect(t.successSummary).toContain('Generated');
    }
  });

  it('should generate professional folder structure for each Next template', () => {
    for (const t of PREDEFINED_TEMPLATES.filter((template) => template.category === 'frontend')) {
      const files = getPredefinedTemplateFiles(t.id, 'next', 'tailwind', 'test-app');
      expect(files.length).toBeGreaterThan(1);
      const paths = files.map((f) => f.path);

      expect(paths).toContain('data/template-data.ts');
      expect(paths).toContain('app/page.tsx');
      expect(paths).toContain('app/globals.css');
      expect(paths.some((path) => path.startsWith('components/sections/'))).toBe(true);
      expect(paths.some((path) => path.startsWith('components/ui/'))).toBe(true);
      expect(paths.some((path) => path.startsWith('components/layout/'))).toBe(true);
    }
  });

  it('should generate professional folder structure for each Vite template', () => {
    for (const t of PREDEFINED_TEMPLATES.filter((template) => template.category === 'frontend')) {
      const files = getPredefinedTemplateFiles(t.id, 'vite-react', 'tailwind', 'test-app');
      const paths = files.map((f) => f.path);

      expect(paths).toContain('src/data/template-data.ts');
      expect(paths).toContain('src/App.tsx');
      expect(paths).toContain('src/index.css');
      expect(paths.some((path) => path.startsWith('src/components/sections/'))).toBe(true);
      expect(paths.some((path) => path.startsWith('src/components/ui/'))).toBe(true);
      expect(paths.some((path) => path.startsWith('src/components/layout/'))).toBe(true);
    }
  });

  it('should generate different content depending on templateId', () => {
    const portfolioFiles = getPredefinedTemplateFiles(
      'portfolio-website',
      'next',
      'tailwind',
      'my-portfolio',
    );
    const saasFiles = getPredefinedTemplateFiles('saas-landing', 'next', 'tailwind', 'my-saas');

    const portData = portfolioFiles.find((f) => f.path.includes('template-data.ts'))?.content || '';
    expect(portData).toContain('my-portfolio');
    expect(portfolioFiles.find((f) => f.path.includes('page.tsx'))?.content).not.toBe(
      saasFiles.find((f) => f.path.includes('page.tsx'))?.content,
    );
    expect(portfolioFiles.find((f) => f.path.includes('PortfolioSections.tsx'))?.content).toContain(
      'export function ProjectsSection()',
    );
    expect(saasFiles.find((f) => f.path.includes('SaasSections.tsx'))?.content).toContain(
      'export function WorkflowSection()',
    );
  });

  it('should wire Tailwind styling so predefined templates are not plain HTML', () => {
    for (const t of PREDEFINED_TEMPLATES.filter((template) => template.category === 'frontend')) {
      const files = getPredefinedTemplateFiles(t.id, 'next', 'tailwind', 'styled-app');
      const css = files.find((f) => f.path === 'app/globals.css')?.content || '';
      const config = files.find((f) => f.path === 'tailwind.config.js')?.content || '';
      const page = files.find((f) => f.path === 'app/page.tsx')?.content || '';
      const sections = files.find((f) => f.path.includes('/sections/'))?.content || '';

      expect(css).toContain('@tailwind base');
      expect(css).toContain('@tailwind components');
      expect(css).toContain('@tailwind utilities');
      expect(config).toContain('./components/**/*.{js,ts,jsx,tsx}');
      expect(page).toContain('components/layout');
      expect(page).toContain('components/sections');
      expect(sections).toMatch(/className="[^"]*(grid|rounded|bg-|text-|shadow|px-|py-)/);
    }
  });

  it('should generate MUI components for Material UI styling', () => {
    for (const t of PREDEFINED_TEMPLATES.filter((template) => template.category === 'frontend')) {
      const files = getPredefinedTemplateFiles(t.id, 'next', 'mui', 'mui-app');
      const card = files.find((f) => f.path.includes('/ui/'))?.content || '';
      const sections = files.find((f) => f.path.includes('/sections/'))?.content || '';

      expect(card).toContain('@mui/material');
      expect(sections).toContain('@mui/material');
      expect(files.some((f) => f.path === 'app/globals.css')).toBe(false);
    }
  });

  it('should generate clean CSS-backed layouts when styling is None', () => {
    for (const t of PREDEFINED_TEMPLATES.filter((template) => template.category === 'frontend')) {
      const files = getPredefinedTemplateFiles(t.id, 'next', 'none', 'plain-app');
      const css = files.find((f) => f.path === 'app/globals.css')?.content || '';
      const card = files.find((f) => f.path.includes('/ui/'))?.content || '';

      expect(css).toContain('.template-section');
      expect(css).not.toContain('@tailwind');
      expect(card).toContain('template-card');
    }
  });

  it('should produce valid project configs', () => {
    for (const t of PREDEFINED_TEMPLATES.filter((template) => template.category === 'frontend')) {
      const config = {
        projectName: 'test-app',
        version: '1.0',
        mode: 'frontend-only' as const,
        templateId: t.id,
        stack: {
          frontend: 'next' as const,
          styling: 'tailwind' as const,
          backend: 'none' as const,
          database: 'none' as const,
          orm: 'none' as const,
          packageManager: 'npm' as const,
        },
        tools: {
          docker: false,
          eslint: true,
          prettier: true,
        },
      };

      const val = validateStack(config);
      expect(val.valid).toBe(true);
      expect(val.normalizedConfig?.templateId).toBe(t.id);
    }
  });

  it('should expose backend templates with generation-ready metadata', () => {
    const backendTemplates = PREDEFINED_TEMPLATES.filter(
      (template) => template.category === 'backend',
    );
    expect(backendTemplates).toHaveLength(5);
    expect(backendTemplates.map((template) => template.id)).toEqual([
      'express-rest-api',
      'nestjs-rest-api',
      'fastify-api',
      'hono-api',
      'node-auth-api',
    ]);

    for (const template of backendTemplates) {
      const files = getPredefinedTemplateFiles(
        template.id,
        template.defaultFramework,
        'none',
        'backend-api',
      );
      expect(files.map((file) => file.path)).toContain('package.json');
      expect(files.map((file) => file.path)).toContain('src/index.ts');
      expect(template.supportedStyling).toEqual(['none']);
      expect(template.sections?.length).toBeGreaterThan(0);
    }
  });

  it('should format template project summary review correctly', () => {
    const config = {
      projectName: 'test-app',
      version: '1.0',
      mode: 'frontend-only' as const,
      language: 'typescript' as const,
      stack: {
        frontend: 'next' as const,
        styling: 'tailwind' as const,
        backend: 'none' as const,
        database: 'none' as const,
        orm: 'none' as const,
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
      templateId: 'saas-landing',
    };

    const targetDir = '/mock/path';
    const sections = getTemplateSections('saas-landing');
    const summary = formatTemplateProjectSummary(
      config,
      targetDir,
      false,
      'SaaS Landing Page',
      sections,
    );

    const summaryStr = summary.join('\n');
    expect(summaryStr).toContain('Template Review');
    expect(summaryStr).toContain('Predefined Template');
    expect(summaryStr).toContain('SaaS Landing Page');
    expect(summaryStr).toContain('Hero section');
  });

  it('should format template success summary correctly', () => {
    const config = {
      projectName: 'test-app',
      version: '1.0',
      mode: 'frontend-only' as const,
      language: 'typescript' as const,
      stack: {
        frontend: 'next' as const,
        styling: 'tailwind' as const,
        backend: 'none' as const,
        database: 'none' as const,
        orm: 'none' as const,
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
      templateId: 'saas-landing',
    };

    const targetDir = '/mock/path';
    const sections = getTemplateSections('saas-landing');
    const summary = formatTemplateSuccessSummary(
      config,
      targetDir,
      10,
      1500,
      'SaaS Landing Page',
      sections,
    );

    const summaryStr = summary.join('\n');
    expect(summaryStr).toContain('Project Created Successfully');
    expect(summaryStr).toContain('SaaS Landing Page');
    expect(summaryStr).toContain('1.5s');
  });
});
