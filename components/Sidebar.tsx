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
} from 'lucide-react';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email ?? null);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const userInitial = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-white transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#111113] border-r border-zinc-800/80 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button (mobile) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 lg:hidden text-zinc-500 hover:text-white transition-colors"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <Flame className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-white tracking-tight">Go Viral</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-orange-400/80 bg-orange-500/10 border border-orange-500/20 rounded px-1.5 py-0.5">
              Beta
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-orange-400' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Upload CTA */}
        <div className="px-3 mb-4">
          <Link
            href="/dashboard#upload"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[13px] font-semibold transition-all hover:opacity-90 shadow-lg shadow-orange-500/20"
          >
            <Upload className="w-4 h-4" />
            Upload Video
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800/80" />

        {/* User section */}
        <div className="px-3 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-zinc-300 truncate">
              {userEmail ?? 'Beta User'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
