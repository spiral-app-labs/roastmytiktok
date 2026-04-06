import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'See what\'s new in Go Viral — product updates, new features, and improvements.',
};

const ENTRIES = [
  {
    date: 'April 2026',
    tag: 'Improved',
    items: [
      { title: 'Results page overhaul', desc: 'Redesigned score hero with animated ring, letter grade, and expandable agent findings. Priority-styled action plan with staggered animations.' },
      { title: 'Dashboard overhaul', desc: 'Growth story with animated stat cards, score trend chart, dimension improvement breakdown, and chronic issues tracker.' },
      { title: 'Shareable score card', desc: 'Download a Spotify Wrapped–style score card or share directly to Stories. Available on the results page after every analysis.' },
      { title: 'Per-agent deep dives gated to paid', desc: 'Free users see the overall score and top findings. Paid users unlock the full per-agent breakdown.' },
    ],
  },
  {
    date: 'March 2026',
    tag: 'New',
    items: [
      { title: 'Batch upload queue', desc: 'Upload up to 5 videos at once and process them sequentially. Track progress for each video in real time.' },
      { title: 'Account-level analysis', desc: 'Connect your TikTok handle to see score trends, weakest dimensions, and tier benchmarks across all your roasts.' },
      { title: 'Usage counter', desc: 'Free roast count shown on the home page so you always know how many analyses you have left.' },
      { title: 'Upgrade CTA on results', desc: 'Contextual upgrade prompt on the results page at the highest-intent moment.' },
    ],
  },
  {
    date: 'February 2026',
    tag: 'Improved',
    items: [
      { title: 'Hook rewrite workshop v2', desc: 'Detected hook type, 6-lens hook anatomy, and a step-by-step rewrite workflow with filmable directions.' },
      { title: 'Reshoot planner', desc: 'Concrete A/B/C take options with spoken line, visual direction, camera framing, timing, and text overlay.' },
      { title: 'Hold-strength read', desc: 'Qualitative watch-strength assessment based on opening beats — honest about what it can and can\'t predict.' },
      { title: 'First-glance diagnostic', desc: 'Frame-one gut check: mute-mode readability, scroll-stop signal, and visual clarity.' },
    ],
  },
  {
    date: 'January 2026',
    tag: 'Launch',
    items: [
      { title: 'Go Viral beta launch', desc: '6 specialized AI agents analyze your TikTok video and diagnose why viewers leave, with actionable reshoot plans.' },
      { title: 'Hook-first analysis mode', desc: 'When the hook is weak, all other feedback is deprioritized — because nothing else matters until the opener lands.' },
      { title: 'Chronic issue detection', desc: 'Tracks recurring problems across roasts and escalates the feedback intensity when the same mistake keeps showing up.' },
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  New: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Improved: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Launch: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
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
