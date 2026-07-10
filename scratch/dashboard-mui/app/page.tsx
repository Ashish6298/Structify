import React from 'react';
import DashboardShell from '../components/layout/DashboardShell';
import {
  Sidebar,
  Topbar,
  KpiGrid,
  AnalyticsPanel,
  DataTable,
  ProjectStatus,
} from '../components/sections/DashboardSections';

export default function AdminDashboard() {
  return (
    <DashboardShell>
      <Sidebar />
      <Topbar />
      <KpiGrid />
      <AnalyticsPanel />
      <DataTable />
      <ProjectStatus />
    </DashboardShell>
  );
}
