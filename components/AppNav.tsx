'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const APP_ROUTE_PREFIXES = ['/dashboard', '/history', '/analyze', '/roast', '/analyze-account', '/account', '/settings'];
const MARKETING_ROOT_PATHS = ['/', '/login', '/bypass'];

function isAppRoute(pathname: string) {
  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav() {
  const pathname = usePathname() || '/';
  const [hasAccess, setHasAccess] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveAccess() {
      try {
        const [bypassRes, sessionRes] = await Promise.allSettled([
          fetch('/api/bypass/check', { cache: 'no-store' }).then((res) => res.json()),
          createClient().auth.getSession(),
        ]);

        const bypassed = bypassRes.status === 'fulfilled' && bypassRes.value?.bypassed === true;
        const signedIn = sessionRes.status === 'fulfilled' && !!sessionRes.value.data.session?.user;

        if (!cancelled) {
          setHasAccess(bypassed || signedIn);
          setResolved(true);
        }
      } catch {
        if (!cancelled) {
          setResolved(true);
        }
      }
    }

    resolveAccess();

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setHasAccess((current) => current || !!session?.user);
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const showAppNav = isAppRoute(pathname) || (resolved && hasAccess && !MARKETING_ROOT_PATHS.includes(pathname));

  const appLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/analyze-account', label: 'Account Analysis' },
    { href: '/history', label: 'History' },
    { href: '/settings', label: '⚙️ Settings' },
  ];

  const marketingLinks = [
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/#agents', label: 'Agents' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0908]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={showAppNav ? '/dashboard' : '/'} className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-orange-400">RoastMyTikTok</span>
            <span className="hidden rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300 sm:inline-flex">
              Beta
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-2 py-1 md:flex">
          {(showAppNav ? appLinks : marketingLinks).map((item) => {
            const active = showAppNav && isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-white/[0.06] text-white'
                    : showAppNav
                      ? 'text-zinc-400 hover:text-white'
                      : item.href === '/pricing'
                        ? 'bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                        : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {showAppNav ? (
            <>
              <Link href="/history" className="rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white md:hidden">
                History
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.28)] transition-transform hover:-translate-y-0.5"
              >
                New Roast
              </Link>
            </>
          ) : (
            <>
              <Link href="/history" className="rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white md:hidden">
                History
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.28)] transition-transform hover:-translate-y-0.5"
              >
                Roast a TikTok
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
