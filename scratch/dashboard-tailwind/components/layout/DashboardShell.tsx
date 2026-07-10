import React from 'react';

type DashboardShellProps = {
  children: React.ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  const childrenArray = React.Children.toArray(children);
  const sidebar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Sidebar'
  );
  const topbar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Topbar'
  );
  const mainContent = childrenArray.filter(
    (child) =>
      !React.isValidElement(child) ||
      (((child.type as { name?: string }).name !== 'Sidebar' &&
        (child.type as { name?: string }).name !== 'Topbar'))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col md:flex-row w-full">
      {sidebar}
      <div className="flex-1 min-w-0 flex flex-col">
        {topbar}
        <main className="flex-1 p-6 space-y-6 w-full mx-auto max-w-[1600px] box-border">
          {mainContent}
        </main>
        <footer className="mx-auto max-w-4xl px-6 py-6 text-xs text-slate-400 border-t border-slate-200 text-center w-full">
          Built with Structify. Replace this starter content with your own production copy.
        </footer>
      </div>
    </div>
  );
}
