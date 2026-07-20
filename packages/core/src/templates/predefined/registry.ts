import { PredefinedTemplate, PredefinedTemplateDefinition } from './types.js';
import { frontendTemplates } from './frontend/index.js';
import { backendTemplates } from './backend/index.js';
import { fullstackTemplates } from './fullstack/index.js';
import {
  getPageContent,
  getTailwindCss,
  getTailwindConfig,
  getTailwindShell,
  getMuiShell,
  getNoneCss,
  getNoneShell,
  toTitleCase,
} from './shared-utils.js';

export class TemplateRegistry {
  private templates: Map<string, PredefinedTemplateDefinition> = new Map();

  constructor() {
    this.registerTemplates(frontendTemplates);
    this.registerTemplates(backendTemplates);
    this.registerTemplates(fullstackTemplates);
  }

  private registerTemplates(defs: PredefinedTemplateDefinition[]) {
    for (const def of defs) {
      this.templates.set(def.metadata.id, def);
    }
  }

  public getTemplate(id: string): PredefinedTemplateDefinition | undefined {
    return this.templates.get(id);
  }

  public listTemplates(): PredefinedTemplate[] {
    return Array.from(this.templates.values()).map((def) => def.metadata);
  }

  public filterTemplates(filters: {
    category?: 'frontend' | 'backend' | 'fullstack';
    framework?: string;
    styling?: string;
  }): PredefinedTemplate[] {
    let list = this.listTemplates();
    if (filters.category) {
      list = list.filter((t) => t.category === filters.category);
    }
    if (filters.framework) {
      list = list.filter((t) => t.supportedFrameworks.includes(filters.framework!));
    }
    if (filters.styling) {
      list = list.filter((t) => t.supportedStyling.includes(filters.styling!));
    }
    return list;
  }
}

// Global registry instance
export const registry = new TemplateRegistry();

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = registry.listTemplates();

export function getPredefinedTemplateFiles(
  templateId: string,
  framework: string,
  styling: string,
  projectName: string,
): { path: string; content: string }[] {
  const template = registry.getTemplate(templateId);
  if (!template) {
    return [];
  }

  if (template.backendDefinition) {
    return template.backendDefinition.files({ projectName });
  }

  const definition = template.visualDefinition;
  if (!definition) {
    return [];
  }

  const prefix = framework === 'next' ? '' : 'src/';
  const dataPath = `${prefix}data/template-data.ts`;
  const cssPath = framework === 'next' ? 'app/globals.css' : 'src/index.css';
  const componentRoot = `${prefix}components`;
  const pagePath = framework === 'next' ? 'app/page.tsx' : 'src/App.tsx';
  const pageImportPrefix = framework === 'next' ? '../components' : './components';

  const result: { path: string; content: string }[] = [
    {
      path: dataPath,
      content: `export const templateProjectName = "${projectName.replace(/"/g, '\\"')}";

${definition.data.replace(/Structify Cloud/g, toTitleCase(projectName) + ' Cloud')}`,
    },
  ];

  if (styling === 'mui') {
    result.push(
      { path: `${componentRoot}/ui/${definition.cardName}.tsx`, content: definition.mui.card },
      {
        path: `${componentRoot}/sections/${definition.sectionsName}.tsx`,
        content: definition.mui.sections,
      },
      {
        path: `${componentRoot}/layout/${definition.shellName}.tsx`,
        content: getMuiShell(definition),
      },
      { path: pagePath, content: getPageContent(definition, pageImportPrefix) },
    );
    return result;
  }

  if (styling === 'none') {
    result.push(
      { path: cssPath, content: getNoneCss(definition) },
      { path: `${componentRoot}/ui/${definition.cardName}.tsx`, content: definition.none.card },
      {
        path: `${componentRoot}/sections/${definition.sectionsName}.tsx`,
        content: definition.none.sections,
      },
      {
        path: `${componentRoot}/layout/${definition.shellName}.tsx`,
        content: getNoneShell(definition),
      },
      { path: pagePath, content: getPageContent(definition, pageImportPrefix) },
    );
    return result;
  }

  result.push(
    { path: 'tailwind.config.js', content: getTailwindConfig() },
    { path: cssPath, content: getTailwindCss(definition) },
    { path: `${componentRoot}/ui/${definition.cardName}.tsx`, content: definition.tailwind.card },
    {
      path: `${componentRoot}/sections/${definition.sectionsName}.tsx`,
      content: definition.tailwind.sections,
    },
    {
      path: `${componentRoot}/layout/${definition.shellName}.tsx`,
      content: getTailwindShell(definition),
    },
    { path: pagePath, content: getPageContent(definition, pageImportPrefix) },
  );

  return result;
}

export function getCustomTemplateContent(
  templateId: string,
  framework: string,
  styling: string,
  projectName: string,
): string {
  const files = getPredefinedTemplateFiles(templateId, framework, styling, projectName);
  const mainPath = framework === 'next' ? 'app/page.tsx' : 'src/App.tsx';
  return files.find((f) => f.path === mainPath)?.content || '';
}
