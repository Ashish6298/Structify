import { PredefinedTemplateDefinition } from '../types.js';

export const portfolioTemplate: PredefinedTemplateDefinition = {
  metadata: {
    id: 'portfolio-website',
    name: 'Portfolio Website',
    category: 'frontend',
    description:
      'Personal developer/designer portfolio with hero, projects, skills, experience, and contact sections.',
    supportedFrameworks: ['next', 'vite-react'],
    supportedStyling: ['tailwind', 'mui', 'none'],
    defaultFramework: 'next',
    defaultStyling: 'tailwind',
    generatedFiles: [
      'app/page.tsx',
      'components/sections/PortfolioSections.tsx',
      'components/ui/PortfolioCard.tsx',
      'components/layout/PortfolioShell.tsx',
      'data/template-data.ts',
      'src/App.tsx',
      'src/components/sections/PortfolioSections.tsx',
      'src/components/ui/PortfolioCard.tsx',
      'src/components/layout/PortfolioShell.tsx',
      'src/data/template-data.ts',
    ],
    enabledFeatures: {
      eslint: true,
      prettier: true,
    },
    scripts: {
      build: 'npm run build',
      dev: 'npm run dev',
    },
    verificationExpectations: ['package.json'],
    sections: [
      'Hero',
      'Social links',
      'Skills',
      'Experience timeline',
      'Featured projects',
      'About',
      'Contact',
    ],
    components: ['PortfolioShell', 'PortfolioCard', 'PortfolioSections'],
    layoutType: 'dark one-page developer portfolio',
    successSummary:
      'Generated a polished developer portfolio with reusable sections and data-driven content.',
  },
  visualDefinition: {
    kind: 'portfolio',
    shellName: 'PortfolioShell',
    cardName: 'PortfolioCard',
    sectionsName: 'PortfolioSections',
    pageName: 'Portfolio',
    dataExport: 'portfolioData',
    data: `export const portfolioData = {
  hero: {
    availability: "Available for select product builds",
    name: "Alex Morgan",
    role: "Full Stack Developer & Product Designer",
    intro: "I build accessible, high-polish software for teams that care about craft, performance, and maintainability. Product surfaces with depth and detail.",
    location: "Toronto, Canada",
    social: ["GitHub", "LinkedIn", "Dribbble", "Email"]
  },
  skills: ["TypeScript", "React", "Next.js", "Design Systems", "Node.js", "PostgreSQL", "Accessibility", "Performance"],
  experience: [
    { period: "2024 - Now", role: "Senior Frontend Engineer", company: "Northstar Labs", detail: "Leading design systems, dashboard experiences, and platform architecture for product teams." },
    { period: "2021 - 2024", role: "Product Engineer", company: "Lumen Works", detail: "Shipped customer-facing SaaS workflows with measurable conversion and speed improvements." },
    { period: "2019 - 2021", role: "UI Engineer", company: "Pixel Foundry", detail: "Built responsive marketing sites, component libraries, and polished launch experiences." }
  ],
  projects: [
    { title: "Atlas Analytics", type: "Product UI", summary: "A real-time analytics workspace with drill-down reporting, saved views, and collaboration tools.", stack: ["Next.js", "Prisma", "Charts"] },
    { title: "Orbit Commerce", type: "Fullstack", summary: "A headless storefront with editorial merchandising, subscription bundles, and checkout optimization.", stack: ["React", "Stripe", "Postgres"] },
    { title: "Signal Design Kit", type: "Design System", summary: "A production component library with accessibility defaults, tokens, and documentation.", stack: ["TypeScript", "Storybook", "A11y"] }
  ],
  highlights: [
    { value: "38%", label: "faster page loads" },
    { value: "24", label: "launches shipped" },
    { value: "AA", label: "accessibility baseline" }
  ]
};
`,
    tailwind: {
      shellClass:
        'min-h-screen bg-[#07111f] text-slate-100 selection:bg-emerald-300 selection:text-slate-950 antialiased',
      bodyClass: 'bg-[#07111f] text-slate-100 antialiased',
      accentClass: 'text-emerald-300',
      bgCss:
        'body { background: #07111f; color: #f8fafc; } body::before { content: ""; position: fixed; inset: 0; pointer-events: none; background: radial-gradient(circle at top left, rgba(16,185,129,0.18), transparent 34rem), radial-gradient(circle at bottom right, rgba(59,130,246,0.12), transparent 30rem); z-index: -1; }',
      card: `import React from 'react';

type PortfolioCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function PortfolioCard({ title, eyebrow, children }: PortfolioCardProps) {
  return (
    <article className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all duration-300 hover:border-emerald-300/40 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-emerald-950/10">
      {eyebrow && <span className="text-xs font-mono tracking-widest text-emerald-400/80 uppercase">{eyebrow}</span>}
      <h3 className="mt-2 text-lg font-bold text-slate-50 group-hover:text-emerald-300 transition-colors duration-200">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-slate-400">{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { portfolioData } from '../../data/template-data';
import { PortfolioCard } from '../ui/PortfolioCard';

export function HeroSection() {
  return (
    <section className="py-20 max-w-4xl mx-auto px-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {portfolioData.hero.availability}
      </div>
      <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-100 sm:text-7xl">{portfolioData.hero.name}</h1>
      <p className="mt-4 text-2xl text-slate-300 font-medium">{portfolioData.hero.role}</p>
      <p className="mt-6 text-lg leading-relaxed text-slate-400 max-w-xl">{portfolioData.hero.intro}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {portfolioData.hero.social.map((item) => (
          <a key={item} href="#" className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-xs font-medium text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition-all duration-200">{item}</a>
        ))}
      </div>
    </section>
  );
}

export function SkillsSection() {
  return (
    <section id="skills" className="py-16 border-t border-slate-900 max-w-4xl mx-auto px-6">
      <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-6">Capabilities</h2>
      <div className="flex flex-wrap gap-2">
        {portfolioData.skills.map((skill) => (
          <span key={skill} className="rounded-md border border-slate-800 bg-slate-900/30 px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-emerald-400/30 hover:text-slate-100 transition-all">{skill}</span>
        ))}
      </div>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section id="experience" className="py-16 border-t border-slate-900 max-w-4xl mx-auto px-6">
      <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-8">Work History</h2>
      <div className="relative border-l border-slate-800/80 ml-2 pl-6 space-y-8">
        {portfolioData.experience.map((item, idx) => (
          <div key={idx} className="relative group">
            <span className="absolute -left-[31px] top-1.5 h-2 w-2 rounded-full bg-slate-800 group-hover:bg-emerald-400 border border-slate-900 transition-all" />
            <span className="text-xs font-mono text-emerald-400">{item.period}</span>
            <h3 className="text-base font-bold text-slate-200 mt-1">{item.role} <span className="text-slate-500">@</span> <span className="text-slate-100">{item.company}</span></h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProjectsSection() {
  return (
    <section id="projects" className="py-16 border-t border-slate-900 max-w-4xl mx-auto px-6">
      <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-8">Selected Projects</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {portfolioData.projects.map((project) => (
          <PortfolioCard key={project.title} title={project.title} eyebrow={project.type}>
            <p className="text-xs leading-relaxed text-slate-400">{project.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.stack.map((item) => (
                <span key={item} className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-mono text-emerald-400">{item}</span>
              ))}
            </div>
          </PortfolioCard>
        ))}
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="py-16 border-t border-slate-900 max-w-4xl mx-auto px-6">
      <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-6">About</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-400 leading-relaxed">
            I specialize in bridging the gap between design and engineering. Every pixel and line of code is optimized for performance, accessibility, and high visual excellence.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {portfolioData.highlights.map((h, i) => (
            <div key={i} className="text-center p-4 bg-slate-900/30 rounded-xl border border-slate-800">
              <div className="text-xl font-bold text-emerald-400">{h.value}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase">{h.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" className="py-20 border-t border-slate-900 text-center max-w-4xl mx-auto px-6">
      <h2 className="text-4xl font-extrabold text-slate-100">Need sharp execution?</h2>
      <p className="mt-4 text-slate-400 text-base max-w-md mx-auto leading-relaxed">Let's build interfaces that respect attention. Partnering with teams to engineer clean software experiences.</p>
      <a href="mailto:hello@example.com" className="mt-8 inline-flex items-center justify-center rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-6 py-3 text-sm font-bold transition-all">Start a conversation</a>
    </section>
  );
}
`,
    },
    mui: {
      bg: '#07111f',
      accent: '#34d399',
      card: `import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type PortfolioCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function PortfolioCard({ title, eyebrow, children }: PortfolioCardProps) {
  return (
    <Card variant="outlined" sx={{ bgcolor: 'rgba(15, 23, 42, 0.4)', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, transition: 'all 0.3s', '&:hover': { borderColor: '#34d399', bgcolor: 'rgba(15, 23, 42, 0.7)' } }}>
      <CardContent sx={{ p: 3 }}>
        {eyebrow && <Typography variant="caption" sx={{ color: '#34d399', letterSpacing: 2, display: 'block', textTransform: 'uppercase', mb: 1 }}>{eyebrow}</Typography>}
        <Typography variant="h6" fontWeight={700} color="#fff">{title}</Typography>
        <Box sx={{ mt: 1.5, color: '#94a3b8' }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
`,
      sections: `import React from 'react';
import { Box, Typography, Button, Stack, Chip, Grid, Container } from '@mui/material';
import { portfolioData } from '../../data/template-data';
import { PortfolioCard } from '../ui/PortfolioCard';

export function HeroSection() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Chip label={portfolioData.hero.availability} size="small" variant="outlined" sx={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)', bgcolor: 'rgba(52, 211, 153, 0.05)', mb: 3 }} />
      <Typography variant="h3" fontWeight={800} color="#fff">{portfolioData.hero.name}</Typography>
      <Typography variant="h5" color="#94a3b8" sx={{ mt: 1 }}>{portfolioData.hero.role}</Typography>
      <Typography variant="body1" color="#94a3b8" sx={{ mt: 2, maxWidth: 500, lineHeight: 1.7 }}>{portfolioData.hero.intro}</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
        {portfolioData.hero.social.map((item) => (
          <Button key={item} variant="outlined" size="small" sx={{ color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 2, '&:hover': { borderColor: '#34d399', color: '#34d399' } }}>{item}</Button>
        ))}
      </Stack>
    </Container>
  );
}

export function SkillsSection() {
  return (
    <Container maxWidth="md" sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 3 }}>Capabilities</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {portfolioData.skills.map((skill) => (
          <Chip key={skill} label={skill} sx={{ bgcolor: 'rgba(255,255,255,0.02)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }} />
        ))}
      </Stack>
    </Container>
  );
}

export function ExperienceSection() {
  return (
    <Container maxWidth="md" sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 4 }}>Work History</Typography>
      <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.08)', ml: 1, pl: 3 }}>
        {portfolioData.experience.map((item, idx) => (
          <Box key={idx} sx={{ mb: 4, position: 'relative' }}>
            <Box sx={{ position: 'absolute', left: '-30px', top: '6px', width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Typography variant="caption" sx={{ color: '#34d399', fontFamily: 'monospace' }}>{item.period}</Typography>
            <Typography variant="subtitle1" fontWeight={700} color="#fff" sx={{ mt: 0.5 }}>{item.role} <Box component="span" sx={{ color: '#64748b' }}>@</Box> {item.company}</Typography>
            <Typography variant="body2" color="#94a3b8" sx={{ mt: 1, lineHeight: 1.7 }}>{item.detail}</Typography>
          </Box>
        ))}
      </Box>
    </Container>
  );
}

export function ProjectsSection() {
  return (
    <Container maxWidth="md" sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 4 }}>Selected Projects</Typography>
      <Grid container spacing={3}>
        {portfolioData.projects.map((project) => (
          <Grid item xs={12} sm={6} key={project.title}>
            <PortfolioCard title={project.title} eyebrow={project.type}>
              <Typography variant="body2" color="#94a3b8">{project.summary}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {project.stack.map((item) => (
                  <Chip key={item} label={item} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.3)', color: '#34d399', border: '1px solid rgba(255,255,255,0.05)' }} />
                ))}
              </Stack>
            </PortfolioCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function AboutSection() {
  return (
    <Container maxWidth="md" sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 3 }}>About</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="#94a3b8" sx={{ lineHeight: 1.7 }}>
            I specialize in bridging the gap between design and engineering. Every pixel and line of code is optimized for performance, accessibility, and high visual excellence.
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Grid container spacing={2}>
            {portfolioData.highlights.map((h, i) => (
              <Grid item xs={4} key={i}>
                <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#34d399">{h.value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 8, mt: 0.5, textTransform: 'uppercase' }}>{h.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export function ContactSection() {
  return (
    <Container maxWidth="md" sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={800} color="#fff">Need sharp execution?</Typography>
      <Typography variant="body2" color="#94a3b8" sx={{ mt: 1, maxWidth: 400, mx: 'auto', mb: 3 }}>Let's build interfaces that respect attention. Partnering with teams to engineer clean software experiences.</Typography>
      <Button variant="contained" sx={{ bgcolor: '#34d399', color: '#0f172a', fontWeight: 'bold', '&:hover': { bgcolor: '#10b981' } }}>Start a conversation</Button>
    </Container>
  );
}
`,
    },
    none: {
      className: 'portfolio-page',
      css: `.portfolio-page { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif; background: #07111f; color: #cbd5e1; }
.portfolio-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.portfolio-card h3 { color: #f8fafc; margin-top: 4px; }
.portfolio-card span { color: #34d399; font-size: 0.8rem; font-family: monospace; }
.skill-tag { display: inline-block; background: rgba(255,255,255,0.05); color: #e2e8f0; padding: 6px 12px; border-radius: 6px; margin: 4px; font-size: 0.85rem; }
.timeline-item { border-left: 1px solid rgba(255,255,255,0.08); padding-left: 20px; margin-bottom: 24px; position: relative; }
.timeline-dot { position: absolute; left: -5px; top: 8px; width: 8px; height: 8px; border-radius: 50%; background: #34d399; }
.btn-contact { display: inline-block; background: #34d399; color: #07111f; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; margin-top: 16px; }`,
      card: `import React from 'react';

type PortfolioCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function PortfolioCard({ title, eyebrow, children }: PortfolioCardProps) {
  return (
    <article className="template-card portfolio-card">
      {eyebrow && <span>{eyebrow}</span>}
      <h3>{title}</h3>
      <div>{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { portfolioData } from '../../data/template-data';
import { PortfolioCard } from '../ui/PortfolioCard';

export function HeroSection() {
  return (
    <header style={{ paddingBottom: '32px' }}>
      <div style={{ display: 'inline-block', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>{portfolioData.hero.availability}</div>
      <h1 style={{ color: '#fff', fontSize: '2.5rem', margin: '16px 0 8px' }}>{portfolioData.hero.name}</h1>
      <p style={{ fontSize: '1.2rem', color: '#94a3b8', margin: 0 }}>{portfolioData.hero.role}</p>
      <p style={{ color: '#94a3b8', lineHeight: 1.6, maxWidth: '500px', marginTop: '12px' }}>{portfolioData.hero.intro}</p>
    </header>
  );
}

export function SkillsSection() {
  return (
    <section style={{ padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <h2 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Capabilities</h2>
      <div>
        {portfolioData.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
      </div>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section style={{ padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <h2 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>Work History</h2>
      <div>
        {portfolioData.experience.map((item, idx) => (
          <div key={idx} className="timeline-item">
            <div className="timeline-dot" />
            <div style={{ color: '#34d399', fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.period}</div>
            <h3 style={{ color: '#fff', margin: '4px 0' }}>{item.role} @ {item.company}</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProjectsSection() {
  return (
    <section style={{ padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <h2 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>Selected Work</h2>
      <div>
        {portfolioData.projects.map((project) => (
          <PortfolioCard key={project.title} title={project.title} eyebrow={project.type}>
            <p style={{ fontSize: '0.9rem' }}>{project.summary}</p>
          </PortfolioCard>
        ))}
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section style={{ padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <h2 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>About</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>I specialize in bridging the gap between design and engineering. Every pixel and line of code is optimized for performance, accessibility, and high visual excellence.</p>
    </section>
  );
}

export function ContactSection() {
  return (
    <section style={{ padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <h2 style={{ color: '#fff' }}>Need sharp execution?</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px' }}>Let's build interfaces that respect attention. Partnering with teams to engineer clean software experiences.</p>
      <a href="mailto:hello@example.com" className="btn-contact">Start a conversation</a>
    </section>
  );
}
`,
    },
  },
};
