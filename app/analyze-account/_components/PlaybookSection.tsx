'use client';

import { HistoryEntry } from '@/lib/history';
import { generatePlaybook } from './helpers';
import InsightCard from './InsightCard';
import BenchmarkBars from './BenchmarkBars';

interface PlaybookSectionProps {
  entries: HistoryEntry[];
}

export default function PlaybookSection({ entries }: PlaybookSectionProps) {
  const playbook = generatePlaybook(entries);
  const unlocked = entries.length >= 2;

  return (
    <div className="space-y-6">
      {!unlocked && (
        <div className="rounded-2xl border border-orange-400/20 bg-orange-500/[0.04] px-5 py-4">
          <p className="text-sm text-zinc-300">
            <span className="font-semibold text-white">Roast at least 2 videos</span>{' '}
            to unlock personalized insights. The more you roast, the sharper your playbook gets.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {playbook.map((item, i) => (
          <InsightCard key={`${item.type}-${i}`} item={item} index={i} />
        ))}
      </div>

      {entries.length >= 2 && <BenchmarkBars entries={entries} />}
    </div>
  );
}
