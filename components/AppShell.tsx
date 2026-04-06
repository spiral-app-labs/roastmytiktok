'use client';

import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#09090b]">
      <Sidebar />
      {/* Main content area — offset by sidebar width on desktop */}
      <main className="flex-1 lg:ml-[260px] min-h-screen">
        {children}
      </main>
    </div>
  );
}
