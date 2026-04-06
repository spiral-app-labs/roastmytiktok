'use client';

import type { HookIdentification as HookIdType } from '@/lib/types';

interface Props {
  hookId: HookIdType;
}

export function HookIdentification({ hookId }: Props) {
  const panels = [
    {
      icon: '📝',
      label: 'text on screen',
      value: hookId.textOnScreen,
      empty: 'No text detected in opening frames',
      accent: 'border-violet-500/20 bg-violet-500/[0.06]',
      textColor: 'text-violet-300',
    },
    {
      icon: '🎙️',
      label: "what's said",
      value: hookId.spokenWords,
      empty: 'No speech detected in first 3 seconds',
      accent: 'border-amber-500/20 bg-amber-500/[0.06]',
      textColor: 'text-amber-300',
    },
    {
      icon: '👁️',
      label: "what's shown",
      value: hookId.visualDescription,
      empty: 'Visual description unavailable',
      accent: 'border-cyan-500/20 bg-cyan-500/[0.06]',
      textColor: 'text-cyan-300',
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
        🎯 your hook — what viewers see in the first 3 seconds
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {panels.map((panel) => (
          <div key={panel.label} className={`rounded-xl border p-3 ${panel.accent}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{panel.icon}</span>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${panel.textColor}`}>
                {panel.label}
              </p>
            </div>
            {panel.value ? (
              <p className="text-sm text-zinc-200 leading-relaxed italic">&ldquo;{panel.value}&rdquo;</p>
            ) : (
              <p className="text-xs text-zinc-500 italic">{panel.empty}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
