import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'See what\'s new in Go Viral - product updates, new features, and improvements.',
};

const ENTRIES = [
  {
    date: 'April 2026',
    tag: 'Updated',
    items: [
      { title: 'Truthful public copy pass', desc: 'Pricing, waitlist, and changelog copy now describe only the product behavior that is live today.' },
      { title: 'Roast result workflow', desc: 'Every roast still ends in a score, verdict, agent breakdowns, hook-specific feedback, and a concrete action plan.' },
      { title: 'History and comparison tools', desc: 'Saved roast history, video-to-video comparison, and account-level rollups remain available inside the app.' },
      { title: 'Score card downloads', desc: 'Results can still be exported as downloadable score-card images from the roast page.' },
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  New: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Improved: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Launch: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Updated: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
};

export default function ChangelogPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16 md:py-24 relative">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-orange-500/6 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold fire-text mb-3">Changelog</h1>
          <p className="text-zinc-400 text-lg">What&apos;s new in Go Viral</p>
        </div>

        <div className="space-y-12">
          {ENTRIES.map((entry) => (
            <section key={entry.date}>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-white">{entry.date}</h2>
                <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${TAG_STYLES[entry.tag] ?? TAG_STYLES.New}`}>
                  {entry.tag}
                </span>
              </div>
              <div className="space-y-4 border-l-2 border-zinc-800 pl-6">
                {entry.items.map((item) => (
                  <div key={item.title} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-zinc-800 border-2 border-zinc-700" />
                    <h3 className="text-sm font-semibold text-zinc-200">{item.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
