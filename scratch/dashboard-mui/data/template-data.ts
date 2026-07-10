export const templateProjectName = 'structify-app';

export const dashboardData = {
  hero: {
    label: 'Operations Workspace',
    title: 'Operations Dashboard',
    description: 'Welcome back. Here is your overview.',
  },
  user: { name: 'Avery Brooks', role: 'Operations Lead' },
  stats: [
    { label: 'Revenue', value: '$128,400', change: '+18.2%', trend: 'up' },
    { label: 'Active Users', value: '24,892', change: '+9.4%', trend: 'up' },
    { label: 'Conversion Rate', value: '7.8%', change: '+2.1%', trend: 'up' },
    { label: 'Open Issues', value: '42', change: '-12.0%', trend: 'down' },
  ],
  chart: [42, 64, 58, 82, 76, 91, 108, 96],
  activity: [
    { label: 'Enterprise plan upgraded', time: '4 min ago' },
    { label: 'New deployment completed', time: '18 min ago' },
    { label: 'Billing export generated', time: '1 hour ago' },
  ],
  rows: [
    {
      customer: 'Acme Studio',
      plan: 'Scale',
      status: 'Healthy',
      value: '$12,400',
    },
    {
      customer: 'Northwind Labs',
      plan: 'Enterprise',
      status: 'Review',
      value: '$28,900',
    },
    {
      customer: 'Orbit Systems',
      plan: 'Starter',
      status: 'Trial',
      value: '$1,200',
    },
  ],
  projects: [
    { name: 'Mobile onboarding', progress: '82%' },
    { name: 'Analytics refresh', progress: '64%' },
    { name: 'Billing automation', progress: '47%' },
  ],
};
