import { LoadingSkeleton } from '@/components/ui';

const PRELOAD_STEPS = [
  'reading the opener + first-frame signals',
  'checking whether the hook earns a stop',
  'stack-ranking what to fix first',
  'packaging your rewrite + reshoot plan',
];

export default function AnalyzeLoading() {
  return (
    <main className="min-h-screen relative overflow-hidden px-4 py-10">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-orange-500/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-pink-500/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-6">
        <div className="rounded-[28px] border border-orange-500/20 bg-zinc-950/85 p-6 shadow-2xl shadow-orange-500/5 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                analysis in progress
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">building your go viral diagnosis</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                  we&apos;re not just generating a roast. we&apos;re figuring out whether the opener earns attention, what is dragging retention, and the cleanest fix to film next.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRELOAD_STEPS.map((step, index) => (
                  <div key={step} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
                    <span className="mr-2 text-orange-400">0{index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-[16rem] rounded-[24px] border border-zinc-800/80 bg-black/20 p-5">
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
                <span>expected output</span>
                <span className="text-orange-300">go viral pass</span>
              </div>
              <div className="space-y-3">
                {['hook diagnosis', 'priority fixes', 'clear score + verdict', 'filmable reshoot options'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm text-zinc-200">
                    <span className="text-lg">✦</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-950/75 p-5 backdrop-blur-xl">
            <LoadingSkeleton variant="custom" height="h-72" className="rounded-[24px]" />
          </div>
          <div className="space-y-4 rounded-[28px] border border-zinc-800/80 bg-zinc-950/75 p-5 backdrop-blur-xl">
            <LoadingSkeleton variant="custom" height="h-5" width="w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
