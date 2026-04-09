'use client';

import { motion, useReducedMotion } from 'framer-motion';

export interface TabDef<Id extends string = string> {
  id: Id;
  label: string;
  count?: number | null;
}

interface TabBarProps<Id extends string> {
  tabs: TabDef<Id>[];
  activeId: Id;
  onChange: (id: Id) => void;
}

export default function TabBar<Id extends string>({
  tabs,
  activeId,
  onChange,
}: TabBarProps<Id>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-1 border-b border-white/6">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'relative px-4 sm:px-5 py-3',
              'font-mono text-[11px] uppercase tracking-[0.18em]',
              'transition-colors duration-200',
              isActive
                ? 'text-orange-300'
                : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                    isActive
                      ? 'bg-orange-500/15 text-orange-200'
                      : 'bg-white/5 text-zinc-400',
                  ].join(' ')}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {isActive && (
              <motion.span
                layoutId="analyze-tab-underline"
                className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 34 }
                }
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
