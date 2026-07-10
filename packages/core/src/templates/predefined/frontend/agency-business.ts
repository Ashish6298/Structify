import { PredefinedTemplateDefinition } from '../types.js';

export const agencyBusinessTemplate: PredefinedTemplateDefinition = {
  metadata: {
    id: 'agency-business',
    name: 'Agency / Business Website',
    category: 'frontend',
    description:
      'Professional agency or business website with services, case studies, process timeline, and CTA.',
    supportedFrameworks: ['next', 'vite-react'],
    supportedStyling: ['tailwind', 'mui', 'none'],
    defaultFramework: 'next',
    defaultStyling: 'tailwind',
    generatedFiles: [
      'app/page.tsx',
      'components/sections/AgencySections.tsx',
      'components/ui/AgencyCard.tsx',
      'components/layout/AgencyShell.tsx',
      'data/template-data.ts',
      'src/App.tsx',
      'src/components/sections/AgencySections.tsx',
      'src/components/ui/AgencyCard.tsx',
      'src/components/layout/AgencyShell.tsx',
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
      'Services section',
      'About section',
      'Testimonials section',
      'Contact section',
      'CTA section',
    ],
    components: ['AgencyShell', 'AgencyCard', 'AgencySections'],
    layoutType: 'warm/minimal brand and digital creative agency',
    successSummary:
      'Generated a beautiful corporate agency layout with complete visual design systems.',
  },
  visualDefinition: {
    kind: 'agency',
    shellName: 'AgencyShell',
    cardName: 'AgencyCard',
    sectionsName: 'AgencySections',
    pageName: 'AgencyWebsite',
    dataExport: 'agencyData',
    data: `export const agencyData = {
  hero: {
    label: "Creative Digital Studio",
    title: "We design & engineer sites that make brands feel inevitable.",
    description: "We combine visual strategy, premium interfaces, and fast engineering to position modern product teams at the forefront of their markets."
  },
  clients: ["Supabase", "Vercel", "Linear", "Raycast", "Kasa"],
  services: [
    { title: "Visual Identity", description: "Design systems, typography systems, and graphic assets that position teams ready to lead." },
    { title: "Product Sites", description: "Conversion-optimized landing pages built on modern stacks that compile fast and load instantly." },
    { title: "UX Consultation", description: "Deconstruct complex user patterns into calm, structured flows that scale seamlessly." }
  ],
  process: ["Discover & Align", "Design Sprint", "Scaffold Build", "Final Launch"],
  cases: [
    { title: "Northstar platform", result: "3.4x demo signups", category: "SaaS Launch" },
    { title: "Lumen branding system", result: "42% organic traffic", category: "Identity" },
    { title: "Evergreen storefront", result: "18 locales compiled", category: "Headless Commerce" }
  ],
  stats: [
    { value: "$120M+", label: "client growth generated" },
    { value: "96%", label: "client retention rating" },
    { value: "48", label: "premium products shipped" }
  ],
  testimonials: [
    { quote: "They brought strategy, absolute taste, and rigorous engineering into a single unified workspace.", author: "Priya Raman", role: "CEO, Lumen" },
    { quote: "Their design systems and speed of execution gave our team a premium web presence instantly.", author: "Miles Carter", role: "Founder, Fieldkit" }
  ]
};
`,
    tailwind: {
      shellClass: 'min-h-screen bg-[#fbf8f3] text-stone-900 font-sans antialiased',
      bodyClass: 'bg-[#fbf8f3] text-stone-900 antialiased',
      accentClass: 'text-orange-700',
      bgCss: 'body { background: #fbf8f3; color: #1c1917; }',
      card: `import React from 'react';

type AgencyCardProps = {
  title: string;
  children: React.ReactNode;
};

export function AgencyCard({ title, children }: AgencyCardProps) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:border-orange-700/20">
      <h3 className="text-xl font-bold tracking-tight text-stone-900">{title}</h3>
      <div className="mt-4 text-sm leading-relaxed text-stone-600">{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { agencyData } from '../../data/template-data';
import { AgencyCard } from '../ui/AgencyCard';

export function HeroSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-20 pb-16">
      <div className="inline-flex rounded-full bg-orange-700/5 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-700/20">{agencyData.hero.label}</div>
      <h1 className="mt-6 text-5xl font-black tracking-tight text-stone-900 sm:text-7xl max-w-4xl leading-[1.05]">{agencyData.hero.title}</h1>
      <p className="mt-6 text-lg text-stone-600 max-w-2xl leading-relaxed">{agencyData.hero.description}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        <a href="#" className="rounded-full bg-stone-900 hover:bg-stone-800 px-6 py-3 text-sm font-semibold text-white transition-colors">Start project</a>
        <a href="#" className="rounded-full border border-stone-300 hover:bg-stone-50 px-6 py-3 text-sm font-semibold text-stone-700 transition-all">View case studies</a>
      </div>
    </section>
  );
}

export function ClientStrip() {
  return (
    <section className="border-t border-stone-200/60 bg-stone-50/50 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-6">Trusted by industry leaders</p>
        <div className="flex flex-wrap items-center gap-x-12 gap-y-6 text-sm font-bold uppercase tracking-wider text-stone-400">
          {agencyData.clients.map((c) => <span key={c}>{c}</span>)}
        </div>
      </div>
    </section>
  );
}

export function ServicesSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 border-t border-stone-200/60">
      <h2 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-12">Services</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {agencyData.services.map((srv) => (
          <AgencyCard key={srv.title} title={srv.title}>
            <p className="text-xs leading-relaxed">{srv.description}</p>
          </AgencyCard>
        ))}
      </div>
    </section>
  );
}

export function ProcessSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 border-t border-stone-200/60">
      <h2 className="text-3xl font-extrabold tracking-tight text-stone-900">How we work together</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {agencyData.process.map((step, idx) => (
          <div key={step} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-mono text-orange-700">STEP 0{idx + 1}</span>
            <h3 className="mt-6 text-lg font-bold text-stone-900">{step}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CaseStudiesSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 border-t border-stone-200/60">
      <h2 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-12">Selected Work</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {agencyData.cases.map((c) => (
          <AgencyCard key={c.title} title={c.title}>
            <span className="text-xs text-stone-400 font-mono">{c.category}</span>
            <p className="mt-6 text-3xl font-black text-orange-700">{c.result}</p>
          </AgencyCard>
        ))}
      </div>
    </section>
  );
}

export function StatsSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 border-t border-stone-200/60">
      <div className="grid gap-6 sm:grid-cols-3">
        {agencyData.stats.map((s, i) => (
          <div key={i} className="text-center p-8 bg-white border border-stone-200 rounded-3xl">
            <div className="text-4xl font-extrabold text-stone-900">{s.value}</div>
            <div className="text-xs font-mono text-stone-400 mt-2 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 border-t border-stone-200/60">
      <div className="grid gap-8 md:grid-cols-2">
        {agencyData.testimonials.map((t, idx) => (
          <blockquote key={idx} className="rounded-3xl bg-stone-900 p-8 text-white">
            <p className="text-lg leading-relaxed">"{t.quote}"</p>
            <footer className="mt-6 text-xs text-stone-400 font-mono">{t.author} — {t.role}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

export function ContactCTA() {
  return (
    <section className="py-20 border-t border-stone-200/60 text-center bg-stone-50">
      <h2 className="text-4xl font-extrabold text-stone-900">Let's create something inevitable.</h2>
      <p className="mt-4 text-stone-600 text-sm max-w-md mx-auto">Get in touch to learn how we can position your brand at the forefront of the market.</p>
      <a href="mailto:hello@example.com" className="mt-8 inline-flex items-center justify-center rounded-full bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 text-sm font-semibold transition-all">Start a conversation</a>
    </section>
  );
}
`,
    },
    mui: {
      bg: '#fbf8f3',
      accent: '#c2410c',
      card: `import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type AgencyCardProps = {
  title: string;
  children: React.ReactNode;
};

export function AgencyCard({ title, children }: AgencyCardProps) {
  return (
    <Card variant="outlined" sx={{ bgcolor: '#fff', borderColor: '#e7e5e4', borderRadius: 4, transition: 'all 0.3s', '&:hover': { borderColor: '#c2410c', transform: 'translateY(-2px)' } }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={800} color="text.primary">{title}</Typography>
        <Box sx={{ mt: 2, color: '#57534e' }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
`,
      sections: `import React from 'react';
import { Box, Typography, Button, Container, Stack, Grid, Paper, Chip } from '@mui/material';
import { agencyData } from '../../data/template-data';
import { AgencyCard } from '../ui/AgencyCard';

export function HeroSection() {
  return (
    <Container maxWidth="lg" sx={{ pt: 10, pb: 6 }}>
      <Chip label={agencyData.hero.label} size="small" sx={{ bgcolor: 'rgba(194, 65, 12, 0.05)', color: '#c2410c', border: '1px solid rgba(194, 65, 12, 0.2)', mb: 3 }} />
      <Typography variant="h3" fontWeight={950} color="text.primary" sx={{ leading: 1.1, maxW: 800 }}>{agencyData.hero.title}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 3, maxW: 600, leading: 1.7 }}>{agencyData.hero.description}</Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button variant="contained" sx={{ bgcolor: '#1c1917', color: '#fff', borderRadius: 99, px: 3, py: 1, '&:hover': { bgcolor: '#292524' } }}>Start project</Button>
        <Button variant="outlined" sx={{ color: '#57534e', borderColor: '#d6d3d1', borderRadius: 99, px: 3, py: 1 }}>Case studies</Button>
      </Stack>
    </Container>
  );
}

export function ClientStrip() {
  return (
    <Box sx={{ py: 6, bgcolor: 'rgba(0,0,0,0.01)', borderTop: '1px solid #e7e5e4', borderBottom: '1px solid #e7e5e4' }}>
      <Container maxWidth="lg">
        <Typography variant="caption" sx={{ color: '#a8a29e', letterSpacing: 2, display: 'block', mb: 2, textTransform: 'uppercase' }}>Trusted by leaders</Typography>
        <Stack direction="row" spacing={4} sx={{ color: '#a8a29e', flexWrap: 'wrap', gap: 2 }}>
          {agencyData.clients.map((c) => <Typography key={c} fontWeight="bold">{c}</Typography>)}
        </Stack>
      </Container>
    </Box>
  );
}

export function ServicesSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="caption" sx={{ color: '#a8a29e', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 4 }}>Services</Typography>
      <Grid container spacing={3}>
        {agencyData.services.map((srv) => (
          <Grid item xs={12} md={4} key={srv.title}>
            <AgencyCard title={srv.title}>
              <Typography variant="body2">{srv.description}</Typography>
            </AgencyCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function ProcessSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>How we work together</Typography>
      <Grid container spacing={2}>
        {agencyData.process.map((step, idx) => (
          <Grid item xs={12} sm={6} md={3} key={step}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: '#e7e5e4' }}>
              <Typography variant="caption" color="primary" sx={{ fontFamily: 'monospace' }}>STEP 0{idx + 1}</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>{step}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function CaseStudiesSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="caption" sx={{ color: '#a8a29e', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 4 }}>Selected Work</Typography>
      <Grid container spacing={3}>
        {agencyData.cases.map((c) => (
          <Grid item xs={12} md={4} key={c.title}>
            <AgencyCard title={c.title}>
              <Typography variant="caption" color="text.secondary">{c.category}</Typography>
              <Typography variant="h4" fontWeight={900} color="#c2410c" sx={{ mt: 3 }}>{c.result}</Typography>
            </AgencyCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function StatsSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Grid container spacing={3}>
        {agencyData.stats.map((s, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: '#e7e5e4', borderRadius: 4 }}>
              <Typography variant="h4" fontWeight="bold" color="text.primary">{s.value}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textTransform: 'uppercase' }}>{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function TestimonialsSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Grid container spacing={3}>
        {agencyData.testimonials.map((t, idx) => (
          <Grid item xs={12} md={6} key={idx}>
            <Paper sx={{ p: 4, bgcolor: '#1c1917', color: '#fff', borderRadius: 4 }}>
              <Typography variant="body1" sx={{ leading: 1.6 }}>"{t.quote}"</Typography>
              <Typography variant="caption" color="#a8a29e" sx={{ mt: 2, display: 'block', fontFamily: 'monospace' }}>{t.author} — {t.role}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function ContactCTA() {
  return (
    <Box sx={{ py: 8, bgcolor: '#f5f5f4', borderTop: '1px solid #e7e5e4', textAlign: 'center' }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight="bold" color="text.primary">Let's create something inevitable.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 4 }}>Get in touch to learn how we can position your brand at the forefront of the market.</Typography>
        <Button variant="contained" sx={{ bgcolor: '#1c1917', color: '#fff', '&:hover': { bgcolor: '#292524' } }}>Start a conversation</Button>
      </Container>
    </Box>
  );
}
`,
    },
    none: {
      className: 'agency-page',
      css: `.agency-page { font-family: sans-serif; background: #fbf8f3; color: #1c1917; min-height: 100vh; padding: 40px 20px; }
.agency-card { background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.agency-card h3 { margin-top: 0; }
.agency-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; max-width: 1000px; margin: 40px auto; }
.agency-btn { display: inline-block; background: #1c1917; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; }`,
      card: `import React from 'react';

type AgencyCardProps = {
  title: string;
  children: React.ReactNode;
};

export function AgencyCard({ title, children }: AgencyCardProps) {
  return (
    <article className="template-card agency-card">
      <h3>{title}</h3>
      <div style={{ color: '#57534e', fontSize: '0.9rem' }}>{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { agencyData } from '../../data/template-data';
import { AgencyCard } from '../ui/AgencyCard';

export function HeroSection() {
  return (
    <section style={{ maxW: '800px', margin: '40px auto' }}>
      <span style={{ color: '#c2410c', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>{agencyData.hero.label}</span>
      <h1 style={{ fontSize: '3rem', margin: '20px 0 10px' }}>{agencyData.hero.title}</h1>
      <p style={{ color: '#57534e', fontSize: '1.1rem', lineHeight: 1.6 }}>{agencyData.hero.description}</p>
      <a href="#" className="agency-btn">Start project</a>
    </section>
  );
}

export function ClientStrip() {
  return (
    <section style={{ borderTop: '1px solid #e7e5e4', borderBottom: '1px solid #e7e5e4', padding: '24px 0', textAlign: 'center' }}>
      <div style={{ display: 'flex', justify: 'center', gap: '30px', flexWrap: 'wrap', color: '#a8a29e', fontWeight: 'bold' }}>
        {agencyData.clients.map(c => <span key={c}>{c}</span>)}
      </div>
    </section>
  );
}

export function ServicesSection() {
  return (
    <section className="agency-grid">
      {agencyData.services.map(s => (
        <SaasCard key={s.title} title={s.title}>
          <p>{s.description}</p>
        </SaasCard>
      ))}
    </section>
  );
}

export function ProcessSection() {
  return (
    <section style={{ maxW: '1000px', margin: '40px auto' }}>
      <h3>Process</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {agencyData.process.map((step, idx) => (
          <div key={step} style={{ background: '#fff', border: '1px solid #e7e5e4', padding: '20px', borderRadius: '8px' }}>
            <span style={{ color: '#c2410c', fontSize: '0.75rem', fontFamily: 'monospace' }}>0{idx + 1}</span>
            <h4 style={{ margin: '10px 0 0' }}>{step}</h4>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CaseStudiesSection() {
  return (
    <section className="agency-grid">
      {agencyData.cases.map(c => (
        <AgencyCard key={c.title} title={c.title}>
          <span>{c.category}</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#c2410c', marginTop: '10px' }}>{c.result}</div>
        </AgencyCard>
      ))}
    </section>
  );
}

export function StatsSection() {
  return (
    <section style={{ maxW: '1000px', margin: '40px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      {agencyData.stats.map((s, idx) => (
        <div key={idx} style={{ background: '#fff', border: '1px solid #e7e5e4', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{s.value}</div>
          <div style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{s.label}</div>
        </div>
      ))}
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section style={{ maxW: '800px', margin: '40px auto' }}>
      {agencyData.testimonials.map((t, idx) => (
        <blockquote key={idx} style={{ background: '#1c1917', color: '#fff', padding: '24px', borderRadius: '12px', margin: '20px 0' }}>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>"{t.quote}"</p>
          <footer style={{ marginTop: '12px', color: '#a8a29e', fontSize: '0.85rem' }}>{t.author}</footer>
        </blockquote>
      ))}
    </section>
  );
}

export function ContactCTA() {
  return (
    <section style={{ textAlign: 'center', background: '#f5f5f4', padding: '40px 0', borderTop: '1px solid #e7e5e4' }}>
      <h3>Let's create something inevitable.</h3>
      <p>Start a project with us today.</p>
    </section>
  );
}
`,
    },
  },
};
