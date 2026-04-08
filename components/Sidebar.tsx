'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Clock,
  BarChart3,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname() || '/';
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUserEmail(session.user.email ?? null);
      }
    }

    loadUser();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const userInitial = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-full border border-black/8 bg-white/90 p-2 text-zinc-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur transition-colors dark:border-white/8 dark:bg-zinc-950/90 dark:text-zinc-300 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-black/6 bg-white/92 px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform duration-200 dark:border-white/8 dark:bg-zinc-950/88 dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-1 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br from-orange-500 via-amber-500 to-pink-500 text-white shadow-[0_12px_30px_rgba(249,115,22,0.32)] dark:from-orange-400 dark:via-amber-300 dark:to-orange-500 dark:text-zinc-950 dark:shadow-[0_14px_34px_rgba(251,191,36,0.2)]">
              <Flame className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-display text-[17px] font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">Go Viral</span>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  Beta
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition-colors ${
                  active
                    ? 'bg-zinc-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.14)] dark:bg-white dark:text-zinc-950 dark:shadow-[0_12px_30px_rgba(255,255,255,0.08)]'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-[18px] w-[18px] ${active ? 'text-white dark:text-zinc-950' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span className="font-medium">{item.label}</span>
                </span>
                {active && <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.7)] dark:bg-orange-300 dark:shadow-[0_0_16px_rgba(253,186,116,0.8)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-[28px] border border-black/6 bg-[#fafaf9] p-4 text-zinc-950 transition-colors dark:border-white/8 dark:bg-white/5 dark:text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Quick action</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Start a new analysis and keep the feedback loop tight while the draft is still fresh.
          </p>
          <Link
            href="/dashboard#upload"
            onClick={() => setMobileOpen(false)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 dark:bg-zinc-950 dark:text-white dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          >
            <Upload className="h-4 w-4" />
            Upload video
          </Link>
        </div>

        <div className="mt-5 flex items-center justify-between px-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Appearance</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Light or dark</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-4 rounded-[28px] border border-black/6 bg-white p-4 transition-colors dark:border-white/8 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-100">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{userEmail ?? 'Beta User'}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Signed in workspace</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            Manage workspace
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>
    </>
  );
}
