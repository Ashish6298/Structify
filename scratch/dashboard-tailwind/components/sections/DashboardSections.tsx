import React from 'react';
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
          <a key={item} href="#" className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${idx === 0 ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}`}>
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
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${stat.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
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
                <div className="w-full rounded-t bg-indigo-500 hover:bg-indigo-400 transition-colors" style={{ height: `${value * 0.8}%` }} />
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.status === 'Healthy' ? 'bg-emerald-50 text-emerald-700' : row.status === 'Review' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
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
