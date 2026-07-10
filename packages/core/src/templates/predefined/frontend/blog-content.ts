import { PredefinedTemplateDefinition } from '../types.js';

export const blogContentTemplate: PredefinedTemplateDefinition = {
  metadata: {
    id: 'blog-content',
    name: 'Blog / Content Website',
    category: 'frontend',
    description:
      'Blog or editorial website with hero, featured post card, post grids, categories, and newsletter subscription form.',
    supportedFrameworks: ['next', 'vite-react'],
    supportedStyling: ['tailwind', 'mui', 'none'],
    defaultFramework: 'next',
    defaultStyling: 'tailwind',
    generatedFiles: [
      'app/page.tsx',
      'components/sections/BlogSections.tsx',
      'components/ui/BlogCard.tsx',
      'components/layout/BlogShell.tsx',
      'data/template-data.ts',
      'src/App.tsx',
      'src/components/sections/BlogSections.tsx',
      'src/components/ui/BlogCard.tsx',
      'src/components/layout/BlogShell.tsx',
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
    sections: ['Article listing', 'Featured post', 'Category layout', 'Blog detail structure'],
    components: ['BlogShell', 'BlogCard', 'BlogSections'],
    layoutType: 'warm/minimal editorial magazine layout',
    successSummary:
      'Generated a polished editorial content site with featured stories and reusable article data.',
  },
  visualDefinition: {
    kind: 'blog',
    shellName: 'BlogShell',
    cardName: 'BlogCard',
    sectionsName: 'BlogSections',
    pageName: 'BlogWebsite',
    dataExport: 'blogData',
    data: `export const blogData = {
  hero: { label: "Structify Journal", title: "Field Notes for Building Better Software", description: "Long-form essays, launch notes, and practical guides for product-minded engineering teams." },
  featured: { title: "Designing calm developer tools for complex workflows", excerpt: "A practical look at information architecture, fast feedback loops, and interfaces that respect attention.", author: "Elena Carter", date: "July 9, 2026", readTime: "8 min read", tag: "Product Engineering" },
  posts: [
    { title: "A checklist for production-ready starter kits", excerpt: "What to include before a generated project feels ready for a real team.", tag: "Guides", readTime: "6 min read" },
    { title: "How design tokens keep frontend systems honest", excerpt: "A lightweight approach to scale colors, spacing, and typography.", tag: "Design Systems", readTime: "5 min read" },
    { title: "Shipping dashboards that people actually use", excerpt: "Practical patterns for tables, filters, empty states, and useful summaries.", tag: "UX", readTime: "7 min read" },
    { title: "Making CI feedback useful instead of noisy", excerpt: "Turn pipeline output into a clear, developer-friendly signal.", tag: "DevOps", readTime: "4 min read" }
  ],
  categories: ["Engineering", "Design Systems", "Product", "DevOps", "Case Studies"],
  tags: ["React", "Next.js", "TypeScript", "Accessibility", "Performance", "Tooling"],
  editor: { name: "Elena Carter", role: "Editor & Product Engineer", bio: "Writing about the intersection of software craft, product systems, and calm interfaces." }
};
`,
    tailwind: {
      shellClass: 'min-h-screen bg-white text-stone-900 font-sans antialiased',
      bodyClass: 'bg-white text-stone-900 antialiased',
      accentClass: 'text-indigo-600',
      bgCss: 'body { background: #ffffff; color: #1c1917; }',
      card: `import React from 'react';

type BlogCardProps = {
  title: string;
  meta?: string;
  children: React.ReactNode;
};

export function BlogCard({ title, meta, children }: BlogCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {meta && <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">{meta}</span>}
      <h3 className="mt-2 text-xl font-bold tracking-tight text-stone-900">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-stone-600">{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { blogData } from '../../data/template-data';
import { BlogCard } from '../ui/BlogCard';

export function HeroSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center">
      <span className="text-xs font-mono uppercase tracking-widest text-indigo-600">{blogData.hero.label}</span>
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-stone-900 sm:text-6xl">{blogData.hero.title}</h1>
      <p className="mt-6 text-base text-stone-600 max-w-xl mx-auto leading-relaxed">{blogData.hero.description}</p>
    </section>
  );
}

export function FeaturedPost() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-12">
      <article className="grid overflow-hidden rounded-3xl border border-stone-200 bg-stone-900 text-white md:grid-cols-[0.8fr_1.2fr]">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 flex flex-col justify-between text-white">
          <span className="text-xs font-bold uppercase tracking-wider">{blogData.featured.tag}</span>
          <h2 className="text-3xl font-black mt-20">Featured Essay</h2>
        </div>
        <div className="p-8">
          <p className="text-xs text-stone-400">{blogData.featured.date} — {blogData.featured.readTime}</p>
          <h3 className="mt-3 text-2xl font-bold">{blogData.featured.title}</h3>
          <p className="mt-4 text-sm text-stone-300 leading-relaxed">{blogData.featured.excerpt}</p>
          <p className="mt-6 text-xs text-stone-400">By {blogData.featured.author}</p>
        </div>
      </article>
    </section>
  );
}

export function PostGrid() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12 border-t border-stone-100">
      <h2 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-8">Recent Articles</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {blogData.posts.map((post) => (
          <BlogCard key={post.title} title={post.title} meta={post.tag}>
            <p className="text-xs text-stone-600 leading-relaxed">{post.excerpt}</p>
            <span className="mt-4 block text-[10px] font-mono text-stone-400">{post.readTime}</span>
          </BlogCard>
        ))}
      </div>
    </section>
  );
}

export function Categories() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12 border-t border-stone-100">
      <h2 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-6">Explore Categories</h2>
      <div className="flex flex-wrap gap-2">
        {blogData.categories.map((c) => (
          <span key={c} className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 cursor-pointer">{c}</span>
        ))}
      </div>
    </section>
  );
}

export function PopularTags() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12 border-t border-stone-100">
      <h2 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-6">Popular Tags</h2>
      <div className="flex flex-wrap gap-1.5">
        {blogData.tags.map((tag) => (
          <span key={tag} className="rounded border border-stone-200 px-2.5 py-1 text-xs font-mono text-stone-500">{tag}</span>
        ))}
      </div>
    </section>
  );
}

export function EditorCard() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12 border-t border-stone-100">
      <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 max-w-md">
        <h3 className="text-xs font-mono text-stone-400 uppercase tracking-widest">About the Editor</h3>
        <h4 className="mt-2 text-lg font-bold text-stone-900">{blogData.editor.name}</h4>
        <p className="text-xs text-stone-500 mt-1">{blogData.editor.role}</p>
        <p className="text-xs leading-relaxed text-stone-600 mt-3">{blogData.editor.bio}</p>
      </div>
    </section>
  );
}

export function Newsletter() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 text-center">
      <div className="rounded-3xl bg-stone-900 p-8 md:p-12 text-white">
        <h2 className="text-3xl font-extrabold">Read more letters.</h2>
        <p className="mt-3 text-sm text-stone-400">Monthly notes on design systems, frontend interfaces, and software craft.</p>
        <div className="mx-auto mt-6 flex max-w-sm gap-2">
          <input className="min-w-0 flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm text-white placeholder-stone-500 border border-stone-800 focus:outline-none" placeholder="you@example.com" />
          <button className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-colors">Subscribe</button>
        </div>
      </div>
    </section>
  );
}
`,
    },
    mui: {
      bg: '#ffffff',
      accent: '#4f46e5',
      card: `import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type BlogCardProps = {
  title: string;
  meta?: string;
  children: React.ReactNode;
};

export function BlogCard({ title, meta, children }: BlogCardProps) {
  return (
    <Card variant="outlined" sx={{ bgcolor: '#fff', borderColor: '#e7e5e4', borderRadius: 4, transition: 'all 0.3s', '&:hover': { borderColor: '#4f46e5' } }}>
      <CardContent sx={{ p: 3 }}>
        {meta && <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', mb: 1 }}>{meta}</Typography>}
        <Typography variant="h6" fontWeight={850} color="text.primary">{title}</Typography>
        <Box sx={{ mt: 1.5, color: '#57534e' }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
`,
      sections: `import React from 'react';
import { Box, Typography, Button, Container, Stack, Grid, Paper, TextField, Chip } from '@mui/material';
import { blogData } from '../../data/template-data';
import { BlogCard } from '../ui/BlogCard';

export function HeroSection() {
  return (
    <Container maxWidth="md" sx={{ pt: 10, pb: 4, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 'bold' }}>{blogData.hero.label}</Typography>
      <Typography variant="h3" fontWeight={900} color="text.primary" sx={{ leading: 1.1, mt: 2 }}>{blogData.hero.title}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 3, maxW: 600, mx: 'auto', leading: 1.7 }}>{blogData.hero.description}</Typography>
    </Container>
  );
}

export function FeaturedPost() {
  return (
    <Container maxWidth="lg" sx={{ pb: 6 }}>
      <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e7e5e4' }}>
        <Grid container>
          <Grid item xs={12} md={5} sx={{ p: 4, bgcolor: '#4f46e5', color: '#fff', display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
            <Typography variant="caption" fontWeight="bold">{blogData.featured.tag}</Typography>
            <Typography variant="h4" fontWeight={900} sx={{ mt: 8 }}>Featured Essay</Typography>
          </Grid>
          <Grid item xs={12} md={7} sx={{ p: 4 }}>
            <Typography variant="caption" color="text.secondary">{blogData.featured.date} — {blogData.featured.readTime}</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>{blogData.featured.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{blogData.featured.excerpt}</Typography>
            <Typography variant="caption" color="text.secondary">By {blogData.featured.author}</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export function PostGrid() {
  return (
    <Container maxWidth="lg" sx={{ py: 6, borderTop: '1px solid #f5f5f4' }}>
      <Typography variant="caption" sx={{ color: '#a8a29e', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 3 }}>Recent Articles</Typography>
      <Grid container spacing={3}>
        {blogData.posts.map((post) => (
          <Grid item xs={12} md={6} key={post.title}>
            <BlogCard title={post.title} meta={post.tag}>
              <Typography variant="body2">{post.excerpt}</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#a8a29e' }}>{post.readTime}</Typography>
            </BlogCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export function Categories() {
  return (
    <Container maxWidth="lg" sx={{ py: 6, borderTop: '1px solid #f5f5f4' }}>
      <Typography variant="caption" sx={{ color: '#a8a29e', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 3 }}>Categories</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
        {blogData.categories.map((c) => (
          <Chip key={c} label={c} size="small" sx={{ bgcolor: '#f5f5f4' }} />
        ))}
      </Stack>
    </Container>
  );
}

export function PopularTags() {
  return (
    <Container maxWidth="lg" sx={{ py: 6, borderTop: '1px solid #f5f5f4' }}>
      <Typography variant="caption" sx={{ color: '#a8a29e', display: 'block', textTransform: 'uppercase', letterSpacing: 2, mb: 3 }}>Popular Tags</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
        {blogData.tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 10 }} />
        ))}
      </Stack>
    </Container>
  );
}

export function EditorCard() {
  return (
    <Container maxWidth="lg" sx={{ py: 6, borderTop: '1px solid #f5f5f4' }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, borderColor: '#e7e5e4', maxWidth: 450 }}>
        <Typography variant="caption" sx={{ color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 2 }}>About the Editor</Typography>
        <Typography variant="h6" fontWeight="bold" sx={{ mt: 2 }}>{blogData.editor.name}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{blogData.editor.role}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.6 }}>{blogData.editor.bio}</Typography>
      </Paper>
    </Container>
  );
}

export function Newsletter() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, bgcolor: '#1c1917', color: '#fff', borderRadius: 4, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold">Read more letters.</Typography>
        <Typography variant="body2" sx={{ mt: 1, color: '#a8a29e' }}>Monthly notes on design systems, frontend interfaces, and software craft.</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 3, maxW: 380, mx: 'auto' }}>
          <TextField size="small" fullWidth placeholder="you@example.com" sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, '& input': { color: '#fff', fontSize: '13px' } }} />
          <Button variant="contained" sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>Subscribe</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
`,
    },
    none: {
      className: 'blog-page',
      css: `.blog-page { font-family: serif; background: #fff; color: #1c1917; min-height: 100vh; padding: 40px 20px; }
.blog-card { background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.blog-card h3 { margin-top: 4px; font-family: sans-serif; }
.blog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; max-width: 1000px; margin: 40px auto; }`,
      card: `import React from 'react';

type BlogCardProps = {
  title: string;
  meta?: string;
  children: React.ReactNode;
};

export function BlogCard({ title, meta, children }: BlogCardProps) {
  return (
    <article className="template-card blog-card">
      {meta && <span style={{ color: '#4f46e5', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>{meta}</span>}
      <h3>{title}</h3>
      <div style={{ color: '#57534e', fontSize: '0.9rem', fontFamily: 'sans-serif' }}>{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { blogData } from '../../data/template-data';
import { BlogCard } from '../ui/BlogCard';

export function HeroSection() {
  return (
    <section style={{ maxW: '800px', margin: '40px auto', textAlign: 'center' }}>
      <span style={{ color: '#4f46e5', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>{blogData.hero.label}</span>
      <h1 style={{ fontSize: '3rem', margin: '20px 0 10px' }}>{blogData.hero.title}</h1>
      <p style={{ color: '#57534e', fontSize: '1.1rem', lineHeight: 1.6 }}>{blogData.hero.description}</p>
    </section>
  );
}

export function FeaturedPost() {
  return (
    <section style={{ maxW: '800px', margin: '40px auto', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px' }}>
      <span style={{ color: '#4f46e5', fontSize: '0.75rem', fontWeight: 'bold' }}>{blogData.featured.tag}</span>
      <h2 style={{ margin: '12px 0 6px' }}>{blogData.featured.title}</h2>
      <p style={{ color: '#57534e', fontSize: '0.95rem' }}>{blogData.featured.excerpt}</p>
    </section>
  );
}

export function PostGrid() {
  return (
    <section className="blog-grid">
      {blogData.posts.map(p => (
        <BlogCard key={p.title} title={p.title} meta={p.tag}>
          <p>{p.excerpt}</p>
        </BlogCard>
      ))}
    </section>
  );
}

export function Categories() {
  return (
    <section style={{ maxW: '800px', margin: '40px auto' }}>
      <h3>Categories</h3>
      {blogData.categories.map(c => <span key={c} style={{ background: '#f5f5f4', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', margin: '4px', display: 'inline-block' }}>{c}</span>)}
    </section>
  );
}

export function PopularTags() {
  return (
    <section style={{ maxW: '800px', margin: '40px auto' }}>
      <h3>Popular Tags</h3>
      {blogData.tags.map(t => <span key={t} style={{ border: '1px solid #e7e5e4', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', margin: '4px', display: 'inline-block', fontFamily: 'monospace' }}>{t}</span>)}
    </section>
  );
}

export function EditorCard() {
  return (
    <section style={{ maxW: '800px', margin: '40px auto' }}>
      <div style={{ border: '1px solid #e7e5e4', padding: '20px', borderRadius: '8px', maxWidth: '400px' }}>
        <h4>{blogData.editor.name}</h4>
        <p style={{ color: '#a8a29e', fontSize: '0.8rem' }}>{blogData.editor.role}</p>
        <p style={{ color: '#57534e', fontSize: '0.85rem' }}>{blogData.editor.bio}</p>
      </div>
    </section>
  );
}

export function Newsletter() {
  return (
    <section style={{ maxW: '600px', margin: '40px auto', background: '#1c1917', color: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
      <h3>Newsletter</h3>
      <p>Subscribe to get the latest essays.</p>
    </section>
  );
}
`,
    },
  },
};
