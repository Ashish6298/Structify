import { PredefinedTemplateDefinition } from '../types.js';

export const adminDashboardTemplate: PredefinedTemplateDefinition = {
  metadata: {
    id: 'admin-dashboard',
    name: 'Admin Dashboard',
    category: 'frontend',
    description:
      'Admin dashboard with sidebar, stats grid, recent activity, datatable, and progress indicators.',
    supportedFrameworks: ['next', 'vite-react'],
    supportedStyling: ['tailwind', 'mui', 'none'],
    defaultFramework: 'next',
    defaultStyling: 'tailwind',
    generatedFiles: [
      'app/page.tsx',
      'components/sections/DashboardSections.tsx',
      'components/ui/DashboardCard.tsx',
      'components/layout/DashboardShell.tsx',
      'data/template-data.ts',
      'src/App.tsx',
      'src/components/sections/DashboardSections.tsx',
      'src/components/ui/DashboardCard.tsx',
      'src/components/layout/DashboardShell.tsx',
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
      'Sidebar layout',
      'Header controls',
      'KPI stats grid',
      'Mock charts',
      'Recent operations logs',
      'Data table',
    ],
    components: ['DashboardShell', 'DashboardCard', 'DashboardSections'],
    layoutType: 'slate/indigo operation admin console',
    successSummary:
      'Generated a complete operations console dashboard with side navigation and data-grid views.',
  },
  visualDefinition: {
    kind: 'dashboard',
    shellName: 'DashboardShell',
    cardName: 'DashboardCard',
    sectionsName: 'DashboardSections',
    pageName: 'AdminDashboard',
    dataExport: 'dashboardData',
    data: `export const dashboardData = {
  hero: {
    label: "Operations Workspace",
    title: "Operations Dashboard",
    description: "Welcome back. Here is your overview."
  },
  user: { name: "Avery Brooks", role: "Operations Lead" },
  stats: [
    { label: "Revenue", value: "$128,400", change: "+18.2%", trend: "up" },
    { label: "Active Users", value: "24,892", change: "+9.4%", trend: "up" },
    { label: "Conversion Rate", value: "7.8%", change: "+2.1%", trend: "up" },
    { label: "Open Issues", value: "42", change: "-12.0%", trend: "down" }
  ],
  chart: [42, 64, 58, 82, 76, 91, 108, 96],
  activity: [
    { label: "Enterprise plan upgraded", time: "4 min ago" },
    { label: "New deployment completed", time: "18 min ago" },
    { label: "Billing export generated", time: "1 hour ago" }
  ],
  rows: [
    { customer: "Acme Studio", plan: "Scale", status: "Healthy", value: "$12,400" },
    { customer: "Northwind Labs", plan: "Enterprise", status: "Review", value: "$28,900" },
    { customer: "Orbit Systems", plan: "Starter", status: "Trial", value: "$1,200" }
  ],
  projects: [
    { name: "Mobile onboarding", progress: "82%" },
    { name: "Analytics refresh", progress: "64%" },
    { name: "Billing automation", progress: "47%" }
  ]
};
`,
    tailwind: {
      shellClass: 'min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col md:flex-row',
      bodyClass: 'bg-slate-50 text-slate-950 antialiased',
      accentClass: 'text-indigo-600',
      bgCss: 'body { background: #f8fafc; color: #0f172a; }',
      card: `import React from 'react';

type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardCard({ title, children }: DashboardCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow w-full min-w-0">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { dashboardData } from '../../data/template-data';
import { DashboardCard } from '../ui/DashboardCard';

export function Sidebar() {
  return (
    <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 bg-slate-900 text-slate-300 flex-shrink-0 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800 flex items-center gap-2">
        <span className="h-6 w-6 rounded bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">D</span>
        <span className="font-bold text-slate-100">Operations Console</span>
      </div>
      <nav className="p-4 space-y-1 flex-1">
        {["Overview", "Analytics", "Users", "Settings"].map((item, idx) => (
          <a key={item} href="#" className={\`flex items-center gap-3 px-3 py-2 text-sm rounded-lg font-medium transition-colors \${idx === 0 ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}\`}>
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export function Topbar() {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 md:flex-row md:items-center w-full">
      <div>
        <p className="text-xs text-slate-400">Welcome back, {dashboardData.user.name}</p>
        <h1 className="text-xl font-bold text-slate-800">{dashboardData.hero.title}</h1>
      </div>
      <div className="flex gap-2">
        <button className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors">Export</button>
        <button className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm shadow-indigo-600/10">Create report</button>
      </div>
    </header>
  );
}

export function KpiGrid() {
  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {dashboardData.stats.map((stat) => (
        <DashboardCard key={stat.label} title={stat.label}>
          <div className="flex justify-between items-baseline">
            <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
            <span className={\`text-xs font-bold px-1.5 py-0.5 rounded \${stat.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}\`}>
              {stat.change}
            </span>
          </div>
        </DashboardCard>
      ))}
    </section>
  );
}

export function AnalyticsPanel() {
  return (
    <section className="grid gap-6 grid-cols-1 lg:grid-cols-3 w-full">
      <div className="lg:col-span-2 min-w-0">
        <DashboardCard title="Revenue overview">
          <div className="flex h-48 items-end gap-3 pt-6 border-b border-slate-100">
            {dashboardData.chart.map((value, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-t bg-indigo-500 hover:bg-indigo-400 transition-colors" style={{ height: \`\${value * 0.8}%\` }} />
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
      <div className="min-w-0">
        <DashboardCard title="Recent Activity">
          <div className="space-y-3">
            {dashboardData.activity.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                <span className="text-[10px] text-slate-400">{item.time}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </section>
  );
}

export function DataTable() {
  return (
    <section className="w-full min-w-0">
      <DashboardCard title="Accounts">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="text-slate-400 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="py-2.5">Customer</th>
                <th>Plan</th>
                <th>Status</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.rows.map((row) => (
                <tr key={row.customer} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 font-semibold text-slate-800">{row.customer}</td>
                  <td className="text-slate-500">{row.plan}</td>
                  <td>
                    <span className={\`px-2 py-0.5 rounded text-[10px] font-semibold \${row.status === 'Healthy' ? 'bg-emerald-50 text-emerald-700' : row.status === 'Review' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}\`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="text-right font-bold text-slate-800">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </section>
  );
}

export function ProjectStatus() {
  return (
    <section className="w-full min-w-0">
      <DashboardCard title="Projects Progress">
        <div className="space-y-4">
          {dashboardData.projects.map((project) => (
            <div key={project.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">{project.name}</span>
                <span className="text-indigo-600">{project.progress}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: project.progress }} />
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    </section>
  );
}
`,
    },
    mui: {
      bg: '#f8fafc',
      accent: '#4f46e5',
      card: `import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardCard({ title, children }: DashboardCardProps) {
  return (
    <Card variant="outlined" sx={{ bgcolor: '#fff', borderColor: '#e2e8f0', borderRadius: 3, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', width: '100%', minWidth: 0 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 1 }}>{title}</Typography>
        <Box sx={{ mt: 2 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
`,
      sections: `import React from 'react';
import { Box, Typography, Button, Stack, Grid, Table, TableHead, TableBody, TableRow, TableCell, Chip, LinearProgress, Paper } from '@mui/material';
import { dashboardData } from '../../data/template-data';
import { DashboardCard } from '../ui/DashboardCard';

export function Sidebar() {
  return (
    <Box sx={{ width: { xs: '100%', md: 240 }, height: { xs: 'auto', md: '100vh' }, position: { xs: 'static', md: 'sticky' }, top: 0, bgcolor: '#0f172a', borderRight: '1px solid #1e293b', flexShrink: 0, p: 3, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" fontWeight="bold" color="#fff" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 16, height: 16, bgcolor: '#4f46e5', borderRadius: 0.5 }} />
        Console
      </Typography>
      <Stack spacing={1} sx={{ flexGrow: 1 }}>
        {["Overview", "Analytics", "Users", "Settings"].map((item, idx) => (
          <Button key={item} fullWidth sx={{ justifyContent: 'flex-start', textTransform: 'none', color: idx === 0 ? '#fff' : '#94a3b8', bgcolor: idx === 0 ? '#1e293b' : 'transparent', '&:hover': { bgcolor: '#1e293b' } }}>{item}</Button>
        ))}
      </Stack>
    </Box>
  );
}

export function Topbar() {
  return (
    <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 4, py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, width: '100%' }}>
      <Box>
        <Typography variant="caption" color="text.secondary">Welcome back, {dashboardData.user.name}</Typography>
        <Typography variant="h5" fontWeight={800} color="text.primary">{dashboardData.hero.title}</Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" size="small">Export</Button>
        <Button variant="contained" size="small" sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>Create report</Button>
      </Stack>
    </Box>
  );
}

export function KpiGrid() {
  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {dashboardData.stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <DashboardCard title={stat.label}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="h4" fontWeight={800}>{stat.value}</Typography>
                <Chip label={stat.change} size="small" sx={{ bgcolor: stat.trend === 'up' ? '#ecfdf5' : '#fff1f2', color: stat.trend === 'up' ? '#047857' : '#be123c', fontWeight: 'bold' }} />
              </Stack>
            </DashboardCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export function AnalyticsPanel() {
  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8} sx={{ minWidth: 0 }}>
          <DashboardCard title="Revenue overview">
            <Stack direction="row" spacing={2} alignItems="end" sx={{ height: 200, pt: 2 }}>
              {dashboardData.chart.map((val, idx) => (
                <Box key={idx} sx={{ flex: 1, bgcolor: '#4f46e5', height: \`\${val * 1.5}px\`, borderRadius: '4px 4px 0 0', '&:hover': { bgcolor: '#6366f1' } }} />
              ))}
            </Stack>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
          <DashboardCard title="Recent Activity">
            <Stack spacing={2}>
              {dashboardData.activity.map((item, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderColor: '#f1f5f9' }}>
                  <Typography variant="body2" fontWeight="bold">{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.time}</Typography>
                </Paper>
              ))}
            </Stack>
          </DashboardCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export function DataTable() {
  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <DashboardCard title="Accounts">
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table size="small" sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#94a3b8' }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#94a3b8' }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#94a3b8' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#94a3b8' }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.rows.map((row) => (
                <TableRow key={row.customer}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{row.customer}</TableCell>
                  <TableCell color="text.secondary">{row.plan}</TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small" sx={{ bgcolor: row.status === 'Healthy' ? '#ecfdf5' : '#fef3c7', color: row.status === 'Healthy' ? '#047857' : '#d97706' }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </DashboardCard>
    </Box>
  );
}

export function ProjectStatus() {
  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <DashboardCard title="Projects Progress">
        <Stack spacing={3}>
          {dashboardData.projects.map((proj) => (
            <Box key={proj.name}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight="bold">{proj.name}</Typography>
                <Typography variant="body2" color="primary" fontWeight="bold">{proj.progress}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={parseInt(proj.progress)} sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5' } }} />
            </Box>
          ))}
        </Stack>
      </DashboardCard>
    </Box>
  );
}
`,
    },
    none: {
      className: 'dashboard-page',
      css: `.dashboard-page { font-family: sans-serif; background: #f8fafc; color: #0f172a; min-height: 100vh; display: flex; flex-direction: column; }
.dashboard-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.dashboard-card h3 { margin: 0 0 16px; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; }
.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 20px; }
.dashboard-sidebar { width: 240px; background: #0f172a; color: #cbd5e1; padding: 20px; }
.dashboard-sidebar h2 { color: #fff; margin-bottom: 30px; }
.dashboard-sidebar a { display: block; padding: 10px; color: #94a3b8; text-decoration: none; border-radius: 4px; }
.dashboard-sidebar a.active { background: #1e293b; color: #fff; }`,
      card: `import React from 'react';

type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardCard({ title, children }: DashboardCardProps) {
  return (
    <article className="template-card dashboard-card">
      <h3>{title}</h3>
      <div>{children}</div>
    </article>
  );
}
`,
      sections: `import React from 'react';
import { dashboardData } from '../../data/template-data';
import { DashboardCard } from '../ui/DashboardCard';

export function Sidebar() {
  return (
    <aside className="dashboard-sidebar">
      <h2>Console</h2>
      <nav>
        <a href="#" className="active">Overview</a>
        <a href="#">Analytics</a>
        <a href="#">Users</a>
        <a href="#">Settings</a>
      </nav>
    </aside>
  );
}

export function Topbar() {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Welcome back, {dashboardData.user.name}</p>
        <h1 style={{ margin: '4px 0 0', fontSize: '1.4rem' }}>{dashboardData.hero.title}</h1>
      </div>
    </header>
  );
}

export function KpiGrid() {
  return (
    <section className="dashboard-grid">
      {dashboardData.stats.map(stat => (
        <DashboardCard key={stat.label} title={stat.label}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stat.value}</div>
          <div style={{ color: 'green', fontSize: '0.85rem', marginTop: '4px' }}>{stat.change}</div>
        </DashboardCard>
      ))}
    </section>
  );
}

export function AnalyticsPanel() {
  return (
    <section style={{ padding: '0 20px 20px' }}>
      <DashboardCard title="Revenue overview">
        <div style={{ height: '150px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          [ Graph Placeholder ]
        </div>
      </DashboardCard>
    </section>
  );
}

export function ActivityPanel() {
  return (
    <section style={{ padding: '0 20px 20px' }}>
      <DashboardCard title="Recent Activity">
        {dashboardData.activity.map((a, idx) => (
          <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <strong>{a.label}</strong> <span style={{ float: 'right', fontSize: '0.8rem', color: '#94a3b8' }}>{a.time}</span>
          </div>
        ))}
      </DashboardCard>
    </section>
  );
}

export function DataTable() {
  return (
    <section style={{ padding: '0 20px 20px' }}>
      <DashboardCard title="Accounts">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>Customer</th>
              <th>Plan</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.rows.map(row => (
              <tr key={row.customer} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{row.customer}</td>
                <td>{row.plan}</td>
                <td>{row.status}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DashboardCard>
    </section>
  );
}

export function ProjectStatus() {
  return (
    <section style={{ padding: '0 20px 40px' }}>
      <DashboardCard title="Projects Progress">
        {dashboardData.projects.map(p => (
          <div key={p.name} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span>{p.name}</span>
              <strong>{p.progress}</strong>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
              <div style={{ height: '6px', background: '#4f46e5', borderRadius: '3px', width: p.progress }} />
            </div>
          </div>
        ))}
      </DashboardCard>
    </section>
  );
}
`,
    },
  },
};
