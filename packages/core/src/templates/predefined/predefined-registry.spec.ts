import { describe, it, expect } from 'vitest';
import { registry, PREDEFINED_TEMPLATES, getPredefinedTemplateFiles } from './index.js';
import fs from 'fs';
import path from 'path';

describe('Predefined Templates Modular Registry', () => {
  it('should register all 5 frontend templates', () => {
    expect(PREDEFINED_TEMPLATES).toHaveLength(5);
    const ids = PREDEFINED_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('portfolio-website');
    expect(ids).toContain('saas-landing');
    expect(ids).toContain('admin-dashboard');
    expect(ids).toContain('agency-business');
    expect(ids).toContain('blog-content');
  });

  it('should look up templates by ID', () => {
    const portfolio = registry.getTemplate('portfolio-website');
    expect(portfolio).toBeDefined();
    expect(portfolio?.metadata.name).toBe('Portfolio Website');
    expect(portfolio?.visualDefinition.kind).toBe('portfolio');
  });

  it('should filter templates by category', () => {
    const frontends = registry.filterTemplates({ category: 'frontend' });
    expect(frontends).toHaveLength(5);

    const backends = registry.filterTemplates({ category: 'backend' });
    expect(backends).toHaveLength(0);

    const fullstacks = registry.filterTemplates({ category: 'fullstack' });
    expect(fullstacks).toHaveLength(0);
  });

  it('should handle invalid or missing template IDs safely', () => {
    const invalid = registry.getTemplate('invalid-id');
    expect(invalid).toBeUndefined();
  });

  it('should include sections and descriptions in metadata', () => {
    for (const t of PREDEFINED_TEMPLATES) {
      expect(t.description).toBeDefined();
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.sections).toBeDefined();
      expect(t.sections!.length).toBeGreaterThan(0);
    }
  });

  it('should not have a monolithic predefined.ts file and each template should exist in its own module', () => {
    const predefinedMonolithPath = path.resolve(process.cwd(), 'src/templates/predefined.ts');
    expect(fs.existsSync(predefinedMonolithPath)).toBe(false);

    const frontendDir = path.resolve(process.cwd(), 'src/templates/predefined/frontend');
    const files = fs.readdirSync(frontendDir);
    const basenames = files.map((f) => f.replace(/\.(ts|js)$/, ''));
    expect(basenames).toContain('portfolio');
    expect(basenames).toContain('saas-landing');
    expect(basenames).toContain('admin-dashboard');
    expect(basenames).toContain('agency-business');
    expect(basenames).toContain('blog-content');
  });

  it('should generate valid layout structure for admin-dashboard styling variants', () => {
    // Tailwind
    const tailwindFiles = getPredefinedTemplateFiles(
      'admin-dashboard',
      'next',
      'tailwind',
      'my-admin',
    );
    const twShell = tailwindFiles.find((f) => f.path.includes('DashboardShell.tsx'));
    expect(twShell).toBeDefined();
    expect(twShell!.content).toContain('Children.toArray');
    expect(twShell!.content).toContain('md:flex-row');

    // MUI
    const muiFiles = getPredefinedTemplateFiles('admin-dashboard', 'next', 'mui', 'my-admin');
    const muiShell = muiFiles.find((f) => f.path.includes('DashboardShell.tsx'));
    expect(muiShell).toBeDefined();
    expect(muiShell!.content).toContain('Children.toArray');
    expect(muiShell!.content).toContain("md: 'row'");
  });
});
