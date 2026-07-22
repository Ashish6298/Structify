import { PredefinedTemplateDefinition } from '../types.js';

export const saasLandingTemplate: PredefinedTemplateDefinition = {
  metadata: {
    id: 'saas-landing',
    name: 'SaaS Landing Page',
    category: 'frontend',
    description:
      'SaaS landing page with hero, features, pricing, testimonials, FAQ, and CTA sections.',
    supportedFrameworks: ['next', 'vite-react'],
    supportedStyling: ['tailwind', 'mui', 'none'],
    defaultFramework: 'next',
    defaultStyling: 'tailwind',
    generatedFiles: [
      'app/page.tsx',
      'components/sections/SaasSections.tsx',
      'components/ui/SaasCard.tsx',
      'components/layout/SaasShell.tsx',
      'data/template-data.ts',
      'src/App.tsx',
      'src/components/sections/SaasSections.tsx',
      'src/components/ui/SaasCard.tsx',
      'src/components/layout/SaasShell.tsx',
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
    quickTips: [
      'Start editing components/sections/SaasSections.tsx to customize the product features.',
      'Configure the pricing plans in data/template-data.ts.',
      'Ensure FAQ items are updated with your product details.',
    ],
    sections: [
      'Hero section',
      'Social proof',
      'Features list',
      'Pricing grid',
      'FAQ section',
      'CTA section',
    ],
    components: ['SaasShell', 'SaasCard', 'SaasSections'],
    layoutType: 'indigo/purple SaaS product landing',
    successSummary:
      'Generated a SaaS product landing page with complete marketing sections and pricing grids.',
  },
  visualDefinition: {
    kind: 'saas',
    shellName: 'SaasShell',
    cardName: 'SaasCard',
    sectionsName: 'SaasSections',
    pageName: 'SaasLanding',
    dataExport: 'saasData',
    data: `export const saasData = {
  nav: ["Features", "Workflow", "Pricing", "FAQ"],
  hero: {
    label: "Built for high-velocity teams",
    title: "Plan, ship, and measure product work in one operating system.",
    description: "Structify Cloud turns scattered requests, releases, and insights into a calm workspace for modern software teams."
  },
  features: [
    { title: "Roadmap command center", description: "Connect initiatives, milestones, owners, and releases in a single product timeline." },
    { title: "Automated project health", description: "Surface blockers, stale work, and delivery risks before weekly reviews." },
    { title: "AI-ready documentation", description: "Turn decisions, specs, and customer notes into searchable project memory." },
    { title: "Launch analytics", description: "Track adoption, feedback, and release quality without leaving the product workflow." }
  ],
  workflow: ["Capture signal", "Prioritize work", "Ship releases", "Measure impact"],
  integrations: ["GitHub", "Slack", "Figma", "Linear", "Vercel", "Stripe"],
  pricing: [
    { name: "Starter", price: "$19", description: "For focused teams launching their first operating rhythm.", features: ["5 projects", "Team roadmap", "Basic analytics"] },
    { name: "Scale", price: "$49", description: "For growing product teams that need deeper coordination.", features: ["Unlimited projects", "Workflow automation", "Priority support"], popular: true },
    { name: "Enterprise", price: "Custom", description: "For organizations standardizing product execution.", features: ["SSO", "Audit logs", "Dedicated success"] }
  ],
  testimonials: [
    { quote: "Structify Cloud gave our product reviews the focus of a launch room without the meeting overhead.", author: "Maya Desai", role: "VP Product, Northwind" },
    { quote: "The workflow feels fast, intentional, and surprisingly calm for a tool our whole team lives in.", author: "Jordan Lee", role: "Founder, Arcbase" }
  ],
  faqs: [
    { question: "Can we import existing projects?", answer: "Yes. Start from CSV, GitHub issues, or manual workspace setup." },
    { question: "Does it work with engineering tools?", answer: "Structify Cloud is designed to sit alongside GitHub, Slack, Figma, and deployment platforms." },
    { question: "Can we self-host?", answer: "Enterprise plans include deployment options for stricter compliance environments." }
  ]
};
`,
    tailwind: {
      shellClass: 'min-h-screen bg-zinc-950 text-white antialiased',
      bodyClass: 'bg-zinc-950 text-white antialiased',
      accentClass: 'text-indigo-400',
      bgCss:
        'body { background: #09090b; color: #fafafa; } body::before { content: ""; position: fixed; inset: 0; pointer-events: none; background: radial-gradient(circle at top, rgba(99,102,241,0.15), transparent 38rem), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.1), transparent 30rem); z-index: -1; }',
      card: `import React from 'react';

type SaasCardProps = {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
};

export function SaasCard({ title, children, highlight = false }: SaasCardProps) {
  return (
    <article className={\`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 \${highlight ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}\`}>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <div className="mt-4 text-sm leading-relaxed text-zinc-400">{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { saasData } from '../../data/template-data';
import { SaasCard } from '../ui/SaasCard';

export function Navbar() {
  return (
    <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
          <span className="h-5 w-5 rounded bg-indigo-600 flex items-center justify-center text-[10px] text-white">S</span>
          Structify Cloud
        </div>
        <nav className="hidden gap-8 text-sm font-medium text-zinc-400 md:flex">
          {saasData.nav.map((item) => <a key={item} href="#" className="hover:text-white transition-colors">{item}</a>)}
        </nav>
        <a href="#" className="rounded-full bg-white hover:bg-zinc-200 px-4 py-1.5 text-xs font-bold text-zinc-950 transition-colors">Start free</a>
      </div>
    </header>
  );
}

export function HeroSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center">
      <span className="inline-flex rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30">{saasData.hero.label}</span>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl max-w-3xl mx-auto leading-[1.1]">{saasData.hero.title}</h1>
      <p className="mt-6 text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">{saasData.hero.description}</p>
      <div className="mt-8 flex justify-center gap-4">
        <a href="#" className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-bold text-white transition-colors shadow-lg shadow-indigo-600/20">Get started free</a>
        <a href="#" className="rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 px-6 py-3 text-sm font-bold text-zinc-300 transition-colors">Book a demo</a>
      </div>
      <div className="mt-16 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-2 shadow-2xl shadow-black/80">
        <div className="h-64 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex items-center justify-center">
          <p className="text-xs font-mono text-zinc-500">[ Visual Product Interface Mockup ]</p>
        </div>
      </div>
    </section>
  );
}

export function SocialProofSection() {
  return (
    <section className="border-t border-b border-zinc-900 bg-zinc-950/40 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-6">Integrates with your stack</p>
        <div className="flex flex-wrap justify-center gap-8 text-sm font-semibold text-zinc-500">
          {saasData.integrations.map((item) => <span key={item} className="hover:text-zinc-300 transition-colors cursor-default">{item}</span>)}
        </div>
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Engineered for high performance.</h2>
        <p className="mt-4 text-zinc-400 text-sm leading-relaxed">Everything you need to launch features and manage cycles without the administrative noise of legacy database boards.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {saasData.features.map((feat) => (
          <SaasCard key={feat.title} title={feat.title}>
            <p className="text-xs leading-relaxed text-zinc-400">{feat.description}</p>
          </SaasCard>
        ))}
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 border-t border-zinc-900">
      <h2 className="text-3xl font-bold text-center text-white mb-12">Product Workflow</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {saasData.workflow.map((step, idx) => (
          <div key={step} className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl">
            <span className="text-xs font-mono text-indigo-400">STEP 0{idx + 1}</span>
            <h3 className="mt-4 text-lg font-bold text-white">{step}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 border-t border-zinc-900">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Pricing built for scale.</h2>
        <p className="mt-4 text-zinc-400 text-sm">Flexible tiers to support teams of 1 to 1000.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {saasData.pricing.map((tier) => (
          <SaasCard key={tier.name} title={tier.name} highlight={tier.popular}>
            <div className="my-4">
              <span className="text-3xl font-extrabold text-white">{tier.price}</span>
              {tier.price !== 'Custom' && <span className="text-xs text-zinc-500"> / month</span>}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed min-h-[40px]">{tier.description}</p>
            <ul className="mt-6 space-y-2 border-t border-zinc-800 pt-6 min-h-[140px]">
              {tier.features.map((f) => (
                <li key={f} className="text-xs text-zinc-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button className={\`mt-8 w-full rounded-lg py-2.5 text-xs font-bold transition-all \${tier.popular ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300'}\`}>Get started</button>
          </SaasCard>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 border-t border-zinc-900">
      <h2 className="text-3xl font-bold text-center text-white mb-12">Loved by Builders</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {saasData.testimonials.map((t, idx) => (
          <blockquote key={idx} className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
            <p className="text-lg text-zinc-200 italic">"{t.quote}"</p>
            <footer className="mt-6 text-xs text-zinc-500">{t.author} — {t.role}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

export function FAQSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 border-t border-zinc-900">
      <h2 className="text-3xl font-bold tracking-tight text-white text-center mb-12">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {saasData.faqs.map((item) => (
          <details key={item.question} className="group border-b border-zinc-800 pb-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
              {item.question}
              <span className="text-zinc-500 group-open:rotate-180 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
`,
    },
    mui: {
      bg: '#09090b',
      accent: '#6366f1',
      card: `import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type SaasCardProps = {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
};

export function SaasCard({ title, children, highlight = false }: SaasCardProps) {
  return (
    <Card variant="outlined" sx={{ bgcolor: highlight ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)', borderColor: highlight ? '#6366f1' : 'rgba(255, 255, 255, 0.08)', borderRadius: 3, transition: 'all 0.3s', '&:hover': { borderColor: highlight ? '#6366f1' : 'rgba(255, 255, 255, 0.15)', transform: 'translateY(-2px)' } }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} color="#fff">{title}</Typography>
        <Box sx={{ mt: 2, color: '#a1a1aa' }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
`,
      sections: `import React from 'react';
import { Box, Typography, Button, Container, Stack, Grid, Accordion, AccordionSummary, AccordionDetails, Chip, Paper } from '@mui/material';
import { saasData } from '../../data/template-data';
import { SaasCard } from '../ui/SaasCard';

export function Navbar() {
  return (
    <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 100 }}>
      <Container maxWidth="lg" sx={{ py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={800} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#6366f1', borderRadius: 0.5 }} />
          Structify Cloud
        </Typography>
        <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }}>
          {saasData.nav.map((item) => <Button key={item} sx={{ color: '#a1a1aa', textTransform: 'none', '&:hover': { color: '#fff' } }}>{item}</Button>)}
        </Stack>
        <Button variant="contained" size="small" sx={{ bgcolor: '#fff', color: '#09090b', fontWeight: 'bold', '&:hover': { bgcolor: '#e4e4e7' } }}>Start free</Button>
      </Container>
    </Box>
  );
}

export function HeroSection() {
  return (
    <Container maxWidth="md" sx={{ pt: 10, pb: 6, textAlign: 'center' }}>
      <Chip label={saasData.hero.label} size="small" sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', mb: 3 }} />
      <Typography variant="h3" fontWeight={900} color="#fff" sx={{ lineHeight: 1.2, mb: 2 }}>{saasData.hero.title}</Typography>
      <Typography variant="body1" color="#a1a1aa" sx={{ mt: 2, maxW: 600, mx: 'auto', mb: 4 }}>{saasData.hero.description}</Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button variant="contained" sx={{ bgcolor: '#6366f1', color: '#fff', fontWeight: 'bold', '&:hover': { bgcolor: '#4f46e5' } }}>Get started free</Button>
        <Button variant="outlined" sx={{ color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', '&:hover': { borderColor: '#fff' } }}>Book a demo</Button>
      </Stack>
      <Box sx={{ mt: 8, p: 1, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
        <Box sx={{ height: 280, bgcolor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#52525b' }}>[ Visual Product Interface Mockup ]</Typography>
        </Box>
      </Box>
    </Container>
  );
}

export function SocialProofSection() {
  return (
    <Box sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
      <Container maxWidth="lg">
        <Typography variant="overline" align="center" display="block" sx={{ color: '#52525b', letterSpacing: 2, mb: 3 }}>Integrates with your stack</Typography>
        <Stack direction="row" spacing={4} justifyContent="center" flexWrap="wrap" sx={{ gap: 2, color: '#52525b' }}>
          {saasData.integrations.map((item) => <Typography key={item} fontWeight="bold">{item}</Typography>)}
        </Stack>
      </Container>
    </Box>
  );
}

export function FeatureGrid() {
  return (
    <Container maxWidth="lg" sx={{ py: 10 }}>
      <Typography variant="h4" align="center" fontWeight={800} color="#fff" mb={6}>Engineered for high performance.</Typography>
      <Grid container spacing={3}>
        {saasData.features.map((feat) => (
          <Grid item xs={12} sm={6} md={3} key={feat.title}>
            <SaasCard title={feat.title}>
              <Typography variant="body2">{feat.description}</Typography>
            </SaasCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function WorkflowSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="h4" align="center" fontWeight={800} color="#fff" mb={6}>Product Workflow</Typography>
      <Grid container spacing={2}>
        {saasData.workflow.map((step, idx) => (
          <Grid item xs={12} sm={6} md={3} key={step}>
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>
              <Typography variant="caption" sx={{ color: '#6366f1', fontFamily: 'monospace' }}>STEP 0{idx + 1}</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 2 }}>{step}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function PricingSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="h4" align="center" fontWeight={800} color="#fff" mb={6}>Pricing built for scale.</Typography>
      <Grid container spacing={3}>
        {saasData.pricing.map((tier) => (
          <Grid item xs={12} md={4} key={tier.name}>
            <SaasCard title={tier.name} highlight={tier.popular}>
              <Box sx={{ my: 2 }}>
                <Typography variant="h4" component="span" fontWeight={800} color="#fff">{tier.price}</Typography>
                {tier.price !== 'Custom' && <Typography variant="caption" color="#52525b"> / month</Typography>}
              </Box>
              <Typography variant="body2" sx={{ minHeight: 40 }}>{tier.description}</Typography>
              <Stack spacing={1} sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', minHeight: 140 }}>
                {tier.features.map((f) => (
                  <Typography key={f} variant="body2" color="#e4e4e7" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#6366f1' }} />
                    {f}
                  </Typography>
                ))}
              </Stack>
              <Button variant={tier.popular ? 'contained' : 'outlined'} fullWidth sx={{ mt: 3, bgcolor: tier.popular ? '#6366f1' : 'transparent', color: '#fff', borderColor: tier.popular ? 'transparent' : 'rgba(255,255,255,0.1)' }}>Get started</Button>
            </SaasCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function TestimonialsSection() {
  return (
    <Container maxWidth="lg" sx={{ py: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="h4" align="center" fontWeight={800} color="#fff" mb={6}>Loved by Builders</Typography>
      <Grid container spacing={3}>
        {saasData.testimonials.map((t, idx) => (
          <Grid item xs={12} md={6} key={idx}>
            <Paper variant="outlined" sx={{ p: 4, bgcolor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>"{t.quote}"</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>{t.author} — {t.role}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function FAQSection() {
  return (
    <Container maxWidth="md" sx={{ py: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="h4" align="center" fontWeight={800} color="#fff" mb={6}>Frequently Asked Questions</Typography>
      <Box>
        {saasData.faqs.map((item) => (
          <Accordion key={item.question} sx={{ bgcolor: 'transparent', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<Typography color="#52525b">+</Typography>} sx={{ px: 0 }}>
              <Typography fontWeight="bold" variant="body2">{item.question}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, color: '#a1a1aa' }}>
              <Typography variant="body2">{item.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Container>
  );
}
`,
    },
    none: {
      className: 'saas-page',
      css: `.saas-page { font-family: sans-serif; background: #09090b; color: #e4e4e7; min-height: 100vh; padding-bottom: 40px; }
.saas-nav { max-width: 1000px; margin: 0 auto; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; }
.saas-nav a { color: #cbd5e1; text-decoration: none; font-size: 0.9rem; margin-right: 20px; }
.saas-nav .btn-nav { background: #fff; color: #09090b; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
.saas-hero { max-width: 800px; margin: 60px auto; text-align: center; padding: 0 20px; }
.saas-hero h1 { color: #fff; font-size: 3rem; margin: 20px 0; }
.saas-hero p { color: #a1a1aa; font-size: 1.1rem; line-height: 1.6; }
.saas-btn { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 10px; }
.saas-btn-sec { display: inline-block; background: transparent; border: 1px solid #374151; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 10px; }
.saas-card { background: rgba(255,255,255,0.02); border: 1px solid #1f2937; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
.saas-card h3 { color: #fff; margin-top: 0; }
.saas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; max-width: 1000px; margin: 40px auto; padding: 0 20px; }
.pricing-card { border: 1px solid #1f2937; border-radius: 16px; padding: 24px; text-align: left; }
.pricing-card.popular { border-color: #6366f1; background: rgba(99,102,241,0.05); }`,
      card: `import React from 'react';

type SaasCardProps = {
  title: string;
  children: React.ReactNode;
};

export function SaasCard({ title, children }: SaasCardProps) {
  return (
    <article className="template-card saas-card">
      <h3>{title}</h3>
      <div style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { saasData } from '../../data/template-data';
import { SaasCard } from '../ui/SaasCard';

export function Navbar() {
  return (
    <header className="saas-nav">
      <div style={{ fontWeight: 'bold', color: '#fff' }}>Structify Cloud</div>
      <nav>
        {saasData.nav.map(n => <a key={n} href="#">{n}</a>)}
      </nav>
      <a href="#" className="btn-nav">Start free</a>
    </header>
  );
}

export function HeroSection() {
  return (
    <section className="saas-hero">
      <span style={{ color: '#818cf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{saasData.hero.label}</span>
      <h1>{saasData.hero.title}</h1>
      <p>{saasData.hero.description}</p>
      <div>
        <a href="#" className="saas-btn">Get started free</a>
        <a href="#" className="saas-btn-sec">Book a demo</a>
      </div>
    </section>
  );
}

export function SocialProofSection() {
  return (
    <section style={{ borderTop: '1px solid #1f2937', borderBottom: '1px solid #1f2937', padding: '30px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '0.8rem', color: '#52525b', textTransform: 'uppercase', marginBottom: '16px' }}>Integrates with your stack</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', color: '#a1a1aa' }}>
        {saasData.integrations.map(i => <span key={i}>{i}</span>)}
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section className="saas-grid">
      {saasData.features.map(f => (
        <SaasCard key={f.title} title={f.title}>
          <p>{f.description}</p>
        </SaasCard>
      ))}
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section style={{ maxW: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <h2 style={{ textAlign: 'center', color: '#fff' }}>Product Workflow</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {saasData.workflow.map((step, idx) => (
          <div key={step} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1f2937', padding: '20px', borderRadius: '8px' }}>
            <div style={{ color: '#6366f1', fontSize: '0.75rem', fontFamily: 'monospace' }}>STEP 0{idx + 1}</div>
            <h4 style={{ margin: '10px 0 0', color: '#fff' }}>{step}</h4>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section style={{ maxW: '1000px', margin: '60px auto', padding: '0 20px' }}>
      <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '40px' }}>Pricing</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {saasData.pricing.map(tier => (
          <div key={tier.name} className={\`pricing-card \${tier.popular ? 'popular' : ''}\`}>
            <h3 style={{ color: '#fff' }}>{tier.name}</h3>
            <div style={{ fontSize: '2rem', color: '#fff', margin: '16px 0' }}>{tier.price}</div>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>{tier.description}</p>
            <ul style={{ paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.85rem', marginTop: '20px' }}>
              {tier.features.map(f => <li key={f} style={{ marginBottom: '8px' }}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section style={{ maxW: '800px', margin: '60px auto', padding: '0 20px', borderTop: '1px solid #1f2937', paddingTop: '40px' }}>
      <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '30px' }}>Loved by Builders</h2>
      {saasData.testimonials.map((t, idx) => (
        <blockquote key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1f2937', padding: '24px', borderRadius: '12px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '1.1rem', color: '#e4e4e7', fontStyle: 'italic' }}>"{t.quote}"</p>
          <footer style={{ marginTop: '12px', color: '#52525b', fontSize: '0.85rem' }}>{t.author} — {t.role}</footer>
        </blockquote>
      ))}
    </section>
  );
}

export function FAQSection() {
  return (
    <section style={{ maxW: '800px', margin: '60px auto', padding: '0 20px', borderTop: '1px solid #1f2937', paddingTop: '40px' }}>
      <h2 style={{ color: '#fff', marginBottom: '30px' }}>FAQs</h2>
      {saasData.faqs.map(faq => (
        <div key={faq.question} style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#fff', margin: '0 0 8px' }}>{faq.question}</h4>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem', margin: 0 }}>{faq.answer}</p>
        </div>
      ))}
    </section>
  );
}
`,
    },
  },
};
