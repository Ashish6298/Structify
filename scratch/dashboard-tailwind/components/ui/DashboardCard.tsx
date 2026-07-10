import React from 'react';

type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardCard({ title, children }: DashboardCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow w-full min-w-0">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}
