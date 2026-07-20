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
}
