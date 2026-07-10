import { VisualTemplateDefinition, TemplateKind } from './types.js';

export function getPageContent(
  definition: VisualTemplateDefinition,
  pageImportPrefix: string,
): string {
  const sections = getSectionNames(definition.kind);
  return `import React from 'react';
import ${definition.shellName} from '${pageImportPrefix}/layout/${definition.shellName}';
import { ${sections.join(', ')} } from '${pageImportPrefix}/sections/${definition.sectionsName}';

export default function ${definition.pageName}() {
  return (
    <${definition.shellName}>
      ${sections.map((section) => `<${section} />`).join('\n      ')}
    </${definition.shellName}>
  );
}
`;
}

export function getSectionNames(kind: TemplateKind): string[] {
  switch (kind) {
    case 'portfolio':
      return [
        'HeroSection',
        'SkillsSection',
        'ExperienceSection',
        'ProjectsSection',
        'AboutSection',
        'ContactSection',
      ];
    case 'saas':
      return [
        'Navbar',
        'HeroSection',
        'SocialProofSection',
        'FeatureGrid',
        'WorkflowSection',
        'PricingSection',
        'TestimonialsSection',
        'FAQSection',
      ];
    case 'dashboard':
      return ['Sidebar', 'Topbar', 'KpiGrid', 'AnalyticsPanel', 'DataTable', 'ProjectStatus'];
    case 'agency':
      return [
        'HeroSection',
        'ClientStrip',
        'ServicesSection',
        'ProcessSection',
        'CaseStudiesSection',
        'StatsSection',
        'TestimonialsSection',
        'ContactCTA',
      ];
    case 'blog':
      return [
        'HeroSection',
        'FeaturedPost',
        'PostGrid',
        'Categories',
        'PopularTags',
        'EditorCard',
        'Newsletter',
      ];
  }
}

export function getTailwindCss(definition: VisualTemplateDefinition): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

${definition.tailwind.bgCss}
`;
}

export function getTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./data/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
`;
}

export function getTailwindShell(definition: VisualTemplateDefinition): string {
  if (definition.kind === 'dashboard') {
    return `import React from 'react';

type ${definition.shellName}Props = {
  children: React.ReactNode;
};

export default function ${definition.shellName}({ children }: ${definition.shellName}Props) {
  const childrenArray = React.Children.toArray(children);
  const sidebar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Sidebar'
  );
  const topbar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Topbar'
  );
  const mainContent = childrenArray.filter(
    (child) =>
      !React.isValidElement(child) ||
      (((child.type as { name?: string }).name !== 'Sidebar' &&
        (child.type as { name?: string }).name !== 'Topbar'))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col md:flex-row w-full">
      {sidebar}
      <div className="flex-1 min-w-0 flex flex-col">
        {topbar}
        <main className="flex-1 p-6 space-y-6 w-full mx-auto max-w-[1600px] box-border">
          {mainContent}
        </main>
        <footer className="mx-auto max-w-4xl px-6 py-6 text-xs text-slate-400 border-t border-slate-200 text-center w-full">
          Built with Structify. Replace this starter content with your own production copy.
        </footer>
      </div>
    </div>
  );
}
`;
  }

  return `import React from 'react';

type ${definition.shellName}Props = {
  children: React.ReactNode;
};

export default function ${definition.shellName}({ children }: ${definition.shellName}Props) {
  return (
    <div className="${definition.tailwind.shellClass}">
      {children}
      <footer className="mx-auto max-w-4xl px-6 py-12 text-xs text-slate-600 border-t border-slate-900 text-center">
        Built with Structify. Replace this starter content with your own production copy.
      </footer>
    </div>
  );
}
`;
}

export function getMuiShell(definition: VisualTemplateDefinition): string {
  if (definition.kind === 'dashboard') {
    return `import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';

type ${definition.shellName}Props = {
  children: React.ReactNode;
};

export default function ${definition.shellName}({ children }: ${definition.shellName}Props) {
  const childrenArray = React.Children.toArray(children);
  const sidebar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Sidebar'
  );
  const topbar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Topbar'
  );
  const mainContent = childrenArray.filter(
    (child) =>
      !React.isValidElement(child) ||
      (((child.type as { name?: string }).name !== 'Sidebar' &&
        (child.type as { name?: string }).name !== 'Topbar'))
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: '100vh', bgcolor: '${definition.mui.bg}', width: '100%' }}>
      {sidebar}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {topbar}
        <Box component="main" sx={{ flexGrow: 1, p: 4, width: '100%', maxWidth: 1600, mx: 'auto', boxSizing: 'border-box' }}>
          <Stack spacing={3}>
            {mainContent}
          </Stack>
        </Box>
        <Container maxWidth="md" sx={{ py: 4, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>Built with Structify. Replace this starter content with your own production copy.</Typography>
        </Container>
      </Box>
    </Box>
  );
}
`;
  }

  return `import React from 'react';
import { Box, Container, Typography } from '@mui/material';

type ${definition.shellName}Props = {
  children: React.ReactNode;
};

export default function ${definition.shellName}({ children }: ${definition.shellName}Props) {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: '${definition.mui.bg}', color: '${definition.kind === 'portfolio' || definition.kind === 'saas' ? '#fff' : 'text.primary'}' }}>
      {children}
      <Container maxWidth="md" sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ opacity: 0.5 }}>Built with Structify. Replace this starter content with your own production copy.</Typography>
      </Container>
    </Box>
  );
}
`;
}

export function getNoneCss(definition: VisualTemplateDefinition): string {
  return `:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #111827;
  background: ${definition.mui.bg};
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

a {
  color: inherit;
}

.${definition.none.className} {
  min-height: 100vh;
  background: ${definition.mui.bg};
  color: ${definition.kind === 'portfolio' || definition.kind === 'saas' ? '#ffffff' : '#111827'};
}

.template-section {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 64px 0;
}

.template-hero {
  padding-top: 96px;
  text-align: ${definition.kind === 'agency' || definition.kind === 'dashboard' ? 'left' : 'center'};
}

.template-eyebrow {
  color: ${definition.mui.accent};
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.template-title {
  max-width: 900px;
  margin: 18px ${definition.kind === 'agency' || definition.kind === 'dashboard' ? '0' : 'auto'} 0;
  font-size: clamp(2.8rem, 8vw, 5.8rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.template-lede {
  max-width: 700px;
  margin: 24px ${definition.kind === 'agency' || definition.kind === 'dashboard' ? '0' : 'auto'} 0;
  color: ${definition.kind === 'portfolio' || definition.kind === 'saas' ? 'rgba(255,255,255,0.72)' : '#4b5563'};
  font-size: 1.1rem;
  line-height: 1.8;
}

.template-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.template-card {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 28px;
  padding: 28px;
  background: ${definition.kind === 'portfolio' || definition.kind === 'saas' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.template-card h3 {
  margin: 0;
  font-size: 1.35rem;
}

.template-card p {
  color: ${definition.kind === 'portfolio' || definition.kind === 'saas' ? 'rgba(255,255,255,0.72)' : '#4b5563'};
  line-height: 1.7;
}

.template-footer {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 40px 0;
  opacity: 0.65;
}
`;
}

export function getNoneShell(definition: VisualTemplateDefinition): string {
  if (definition.kind === 'dashboard') {
    return `import React from 'react';

type ${definition.shellName}Props = {
  children: React.ReactNode;
};

export default function ${definition.shellName}({ children }: ${definition.shellName}Props) {
  const childrenArray = React.Children.toArray(children);
  const sidebar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Sidebar'
  );
  const topbar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Topbar'
  );
  const mainContent = childrenArray.filter(
    (child) =>
      !React.isValidElement(child) ||
      (((child.type as { name?: string }).name !== 'Sidebar' &&
        (child.type as { name?: string }).name !== 'Topbar'))
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', flexDirection: 'row', width: '100%' }} className="${definition.none.className}">
      {sidebar}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {topbar}
        <main style={{ flex: 1, padding: '20px', maxWidth: '1600px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {mainContent}
        </main>
        <footer className="template-footer" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Built with Structify. Replace this starter content with your own production copy.</footer>
      </div>
    </div>
  );
}
`;
  }

  return `import React from 'react';

type ${definition.shellName}Props = {
  children: React.ReactNode;
};

export default function ${definition.shellName}({ children }: ${definition.shellName}Props) {
  return (
    <main className="${definition.none.className}">
      {children}
      <footer className="template-footer">Built with Structify. Replace this starter content with your own production copy.</footer>
    </main>
  );
}
`;
}

export function toTitleCase(value: string): string {
  return (
    value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Structify'
  );
}
