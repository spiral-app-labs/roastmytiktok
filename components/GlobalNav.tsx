'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function GlobalNav() {
  const pathname = usePathname();

  // Hide global nav on dashboard (it has its own sidebar)
  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-zinc-900">
      <Link href="/" className="text-sm font-bold fire-text">Roast My TikTok</Link>
      <Link href="/history" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
        History
      </Link>
    </nav>
  );
}
