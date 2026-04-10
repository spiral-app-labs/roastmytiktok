'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GoViralMark from '@/components/branding/GoViralMark';
import {
  Home,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
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
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-sky-500/20 bg-sky-500/10 text-sky-600 shadow-[0_14px_34px_rgba(59,130,246,0.2)] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300 dark:shadow-[0_14px_34px_rgba(96,165,250,0.16)]">
              <GoViralMark className="h-6.5 w-6.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-display text-[18px] font-bold tracking-[-0.04em] text-zinc-950 dark:text-white">Go Viral</span>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
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
                {active && <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.7)] dark:bg-sky-300 dark:shadow-[0_0_16px_rgba(125,211,252,0.8)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex items-center justify-between px-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Appearance</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Light or dark</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-black/6 bg-white px-3 py-2 transition-colors dark:border-white/8 dark:bg-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-100">
            {userInitial}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-950 dark:text-white">
            {userEmail ?? 'Beta User'}
          </p>
          <button
            onClick={handleSignOut}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
