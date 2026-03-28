'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchHistory, HistoryEntry } from '@/lib/history';
import Sidebar, { DashboardTab } from '@/components/dashboard/Sidebar';
import OverviewView from '@/components/dashboard/OverviewView';
import UploadView from '@/components/dashboard/UploadView';
import HistoryView from '@/components/dashboard/HistoryView';
import TipsView from '@/components/dashboard/TipsView';
import SettingsView from '@/components/dashboard/SettingsView';

export default function DashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    async function checkAccess() {
      // Check sub bypass cookie
      try {
        const bypassRes = await fetch('/api/sub-bypass/check');
        const bypassData = await bypassRes.json();
        if (bypassData.subBypassed) {
          setAuthorized(true);
          setChecking(false);
          return;
        }
      } catch {
        // ignore
      }

      // Check Supabase session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthorized(true);
        setUserEmail(session.user.email ?? null);
        setChecking(false);
        return;
      }

      // Neither — redirect to login
      router.push('/login?redirect=/dashboard');
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (authorized) {
      fetchHistory().then(setHistory);
    }
  }, [authorized, activeTab]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg fire-gradient animate-pulse" />
      </main>
    );
  }

  if (!authorized) return null;

  const sidebarWidth = sidebarCollapsed ? 68 : 220;

  return (
    <div className="min-h-screen bg-[#080808]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userEmail={userEmail}
        onSignOut={handleSignOut}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b border-zinc-800/60 bg-[#080808]/80 backdrop-blur-md">
          <h1 className="text-sm font-semibold text-white capitalize">
            {activeTab === 'overview' ? 'Dashboard' : activeTab}
          </h1>
          <button
            onClick={() => setActiveTab('upload')}
            className="fire-gradient text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            New Roast
          </button>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewView history={history} onNavigate={setActiveTab} />}
          {activeTab === 'upload' && <UploadView />}
          {activeTab === 'history' && <HistoryView history={history} />}
          {activeTab === 'tips' && <TipsView history={history} />}
          {activeTab === 'settings' && <SettingsView userEmail={userEmail} onSignOut={handleSignOut} />}
        </div>
      </main>
    </div>
  );
}
