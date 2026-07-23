export interface PredefinedTemplate {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'fullstack';
  description: string;
  supportedFrameworks: string[];
  supportedStyling: string[];
  defaultFramework: string;
  defaultStyling: string;
  generatedFiles: string[];
  enabledFeatures: {
    eslint: boolean;
    prettier: boolean;
  };
  scripts: Record<string, string>;
  verificationExpectations: string[];
  sections?: string[];
  components?: string[];
  layoutType?: string;
  successSummary?: string;
  quickTips?: string[];
}

export type TemplateKind = 'portfolio' | 'saas' | 'dashboard' | 'agency' | 'blog';

export interface PredefinedTemplateFile {
  path: string;
  content: string;
}

export interface BackendTemplateRenderContext {
  projectName: string;
}

export interface BackendTemplateDefinition {
  files: (context: BackendTemplateRenderContext) => PredefinedTemplateFile[];
}

/**
 * A fullstack template augments the framework/database files produced by the
 * normal generator.  Keeping this separate from visual and API-only templates
 * lets future fullstack starters share the same registry and render pipeline.
 */
export interface FullstackTemplateRenderContext extends BackendTemplateRenderContext {
  frontend: string;
  backend: string;
  styling: string;
  database: string;
  orm: string;
}

export interface FullstackTemplateDefinition {
  files: (context: FullstackTemplateRenderContext) => PredefinedTemplateFile[];
}

export interface VisualTemplateDefinition {
  kind: TemplateKind;
  shellName: string;
  cardName: string;
  sectionsName: string;
  pageName: string;
  dataExport: string;
  data: string;
  tailwind: {
    shellClass: string;
    bodyClass: string;
    accentClass: string;
    bgCss: string;
    sections: string;
    card: string;
  };
  mui: {
    bg: string;
    accent: string;
    sections: string;
    card: string;
  };
  none: {
    className: string;
    css: string;
    sections: string;
    card: string;
  };
}

export interface PredefinedTemplateDefinition {
  metadata: PredefinedTemplate;
  visualDefinition?: VisualTemplateDefinition;
  backendDefinition?: BackendTemplateDefinition;
  fullstackDefinition?: FullstackTemplateDefinition;
}
