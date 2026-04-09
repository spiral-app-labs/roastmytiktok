export function SampleDiagnosisPreview() {
  const dimensions = [
    { label: 'Hook', score: 41, state: 'Critical' },
    { label: 'Pacing', score: 58, state: 'Needs work' },
    { label: 'Audio', score: 67, state: 'Stable' },
    { label: 'Captions', score: 52, state: 'Late' },
    { label: 'CTA', score: 71, state: 'Secondary' },
  ];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_32%)]" />

      <div className="relative rounded-[1.6rem] border border-white/8 bg-black/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">Sample diagnosis</p>
            <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">This video dies in the opening setup.</h3>
          </div>
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">Overall score</p>
            <p className="mt-1 text-3xl font-black text-white">56</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.4rem] border border-white/8 bg-zinc-950/70 p-4">
            <div className="aspect-[9/16] rounded-[1.2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(40,40,42,0.85),rgba(10,10,10,0.96))] p-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Frame reference</span>
                <span>00:01.8</span>
              </div>

              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">Virality blocker</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-white">
                  The first spoken line sounds like context, not a promise: &quot;So today I wanted to walk through three things...&quot;
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Frame note</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  Wide desk shot, no text in frame one, hands still, payoff only appears after the viewer has already decided whether to stay.
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Rewrite</p>
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    &quot;This one mistake is why useful videos stall under 500 views.&quot;
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">Next take</p>
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    Start on the finished result, push the caption into frame one, and cut the setup down by two beats.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Priority stack</p>
                  <p className="mt-1 text-sm text-zinc-300">Fix the opening before polishing support layers.</p>
                </div>
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                  P1
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {dimensions.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-zinc-500">{item.state}</p>
                    </div>
                    <span className="text-sm font-semibold text-zinc-300">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Projected outcome</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                If the first-frame promise lands earlier, the system expects stronger first-batch retention and a cleaner chance of reaching the CTA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
