'use client';

import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f5f5f2] text-zinc-950 transition-colors dark:bg-[#09090b] dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(244,244,245,0.82),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(39,39,42,0.55),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(24,24,27,0.68),transparent_36%)]" />
      <Sidebar />
      <main className="relative min-h-screen flex-1 lg:ml-[288px]">
        {children}
      </main>
    </div>
  );
}
