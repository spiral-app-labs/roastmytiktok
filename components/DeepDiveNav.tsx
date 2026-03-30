'use client';

import { useState, useEffect } from 'react';

interface NavItem {
  id: string;
  label: string;
  emoji: string;
}

interface DeepDiveNavProps {
  items: NavItem[];
  /** When true, dims non-hook items to reinforce hierarchy */
  hookGate?: boolean;
}

export function DeepDiveNav({ items, hookGate }: DeepDiveNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="sticky top-4 z-30 mx-auto max-w-4xl">
      <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-2 py-2 shadow-xl shadow-black/30 overflow-x-auto scrollbar-hide">
        {hookGate && (
          <div className="ml-1 hidden shrink-0 items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-300 sm:flex">
            <span>🏐</span>
            <span>fix the hook first</span>
          </div>
        )}
        {items.map((item) => {
          const isActive = activeId === item.id;
          const isDimmed = hookGate && item.id !== 'hook-gate' && item.id !== 'hook-workshop';
          return (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={[
                'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:text-sm',
                isActive
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
                isDimmed ? 'opacity-50' : '',
              ].join(' ')}
            >
              <span className="text-sm">{item.emoji}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
