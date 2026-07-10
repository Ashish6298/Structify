import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  LinearProgress,
  Paper,
} from '@mui/material';
import { dashboardData } from '../../data/template-data';
import { DashboardCard } from '../ui/DashboardCard';

export function Sidebar() {
  return (
    <Box
      sx={{
        width: { xs: '100%', md: 240 },
        height: { xs: 'auto', md: '100vh' },
        position: { xs: 'static', md: 'sticky' },
        top: 0,
        bgcolor: '#0f172a',
        borderRight: '1px solid #1e293b',
        flexShrink: 0,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        variant="subtitle1"
        fontWeight="bold"
        color="#fff"
        sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Box
          sx={{ width: 16, height: 16, bgcolor: '#4f46e5', borderRadius: 0.5 }}
        />
        Console
      </Typography>
      <Stack spacing={1} sx={{ flexGrow: 1 }}>
        {['Overview', 'Analytics', 'Users', 'Settings'].map((item, idx) => (
          <Button
            key={item}
            fullWidth
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              color: idx === 0 ? '#fff' : '#94a3b8',
              bgcolor: idx === 0 ? '#1e293b' : 'transparent',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            {item}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}

export function Topbar() {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        px: 4,
        py: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        width: '100%',
      }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary">
          Welcome back, {dashboardData.user.name}
        </Typography>
        <Typography variant="h5" fontWeight={800} color="text.primary">
          {dashboardData.hero.title}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" size="small">
          Export
        </Button>
        <Button
          variant="contained"
          size="small"
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
        >
          Create report
        </Button>
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
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="h4" fontWeight={800}>
                  {stat.value}
                </Typography>
                <Chip
                  label={stat.change}
                  size="small"
                  sx={{
                    bgcolor: stat.trend === 'up' ? '#ecfdf5' : '#fff1f2',
                    color: stat.trend === 'up' ? '#047857' : '#be123c',
                    fontWeight: 'bold',
                  }}
                />
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
            <Stack
              direction="row"
              spacing={2}
              alignItems="end"
              sx={{ height: 200, pt: 2 }}
            >
              {dashboardData.chart.map((val, idx) => (
                <Box
                  key={idx}
                  sx={{
                    flex: 1,
                    bgcolor: '#4f46e5',
                    height: `${val * 1.5}px`,
                    borderRadius: '4px 4px 0 0',
                    '&:hover': { bgcolor: '#6366f1' },
                  }}
                />
              ))}
            </Stack>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
          <DashboardCard title="Recent Activity">
            <Stack spacing={2}>
              {dashboardData.activity.map((item, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{ p: 1.5, borderColor: '#f1f5f9' }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.time}
                  </Typography>
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
                <TableCell sx={{ fontWeight: 'bold', color: '#94a3b8' }}>
                  Customer
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#94a3b8' }}>
                  Plan
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#94a3b8' }}>
                  Status
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 'bold', color: '#94a3b8' }}
                >
                  Value
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.rows.map((row) => (
                <TableRow key={row.customer}>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {row.customer}
                  </TableCell>
                  <TableCell color="text.secondary">{row.plan}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      sx={{
                        bgcolor:
                          row.status === 'Healthy' ? '#ecfdf5' : '#fef3c7',
                        color: row.status === 'Healthy' ? '#047857' : '#d97706',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {row.value}
                  </TableCell>
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
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {proj.name}
                </Typography>
                <Typography variant="body2" color="primary" fontWeight="bold">
                  {proj.progress}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={parseInt(proj.progress)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5' },
                }}
              />
            </Box>
          ))}
        </Stack>
      </DashboardCard>
    </Box>
  );
}
