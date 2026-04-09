'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GradientButton } from '@/components/ui';
import { SampleDiagnosisPreview } from '@/components/SampleDiagnosisPreview';

const DIAGNOSIS_DIMENSIONS = [
  {
    title: 'Hook',
    score: '41/100',
    detail: 'Frame one does not tell the viewer why they should stop scrolling.',
  },
  {
    title: 'Pacing',
    score: '58/100',
    detail: 'The idea is useful, but the setup takes too long to reach the payoff.',
  },
  {
    title: 'Audio',
    score: '67/100',
    detail: 'Voice is clear, but the first line lands flat and lacks urgency.',
  },
  {
    title: 'Captions',
    score: '52/100',
    detail: 'On-screen text arrives after the first swipe decision is already made.',
  },
  {
    title: 'CTA',
    score: '71/100',
    detail: 'The ask is decent, but few viewers make it far enough to hear it.',
  },
];

const FIX_LOOP = [
  {
    step: '01',
    title: 'Upload the draft before you post',
    detail: 'Drop in the exact cut you plan to publish and let the system inspect the opening, pacing, text, and delivery.',
  },
  {
    step: '02',
    title: 'See the blocker ranked by impact',
    detail: 'Instead of a generic summary, you get one primary issue, supporting evidence, and what is secondary.',
  },
  {
    step: '03',
    title: 'Film the next take with a sharper brief',
    detail: 'Use the rewrite, reshoot note, and priority order to fix the next version before distribution dies.',
  },
];

const CREATOR_PROOF = [
  {
    label: 'Solo creators',
    detail: 'Use the diagnosis before posting to catch weak hooks and overlong setups while the video is still easy to fix.',
  },
  {
    label: 'Agencies and editors',
    detail: 'Use the report as a QC layer when several cuts are moving fast and subjective feedback is not enough.',
  },
  {
    label: 'In-house social teams',
    detail: 'Use the priority stack to align on the next take instead of arguing over five competing edits.',
  },
];

export default function Home() {
  const router = useRouter();

  const goToWorkspace = () => {
    router.push('/login?redirect=%2Fdashboard');
  };

  const scrollToSample = () => {
    document.getElementById('sample-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.15),transparent_36%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
        <div className="absolute -left-20 top-[18rem] h-72 w-72 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="absolute -right-12 top-[32rem] h-80 w-80 rounded-full bg-red-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <section className="grid gap-12 border-b border-white/6 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="max-w-2xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              Pre-post video diagnosis
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Find the virality blocker
              <span className="block bg-gradient-to-r from-orange-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
                before you hit post.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300 sm:text-xl">
              Upload a draft and get a ranked diagnosis of what hurts reach first, what to fix next, and how to film a stronger next take.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <GradientButton variant="primary" size="lg" className="sm:min-w-[210px]" onClick={goToWorkspace}>
                Upload a video
              </GradientButton>
              <GradientButton variant="secondary" size="lg" className="sm:min-w-[210px]" onClick={scrollToSample}>
                View sample result
              </GradientButton>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {DIAGNOSIS_DIMENSIONS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">{item.score}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            id="sample-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
            className="scroll-mt-28"
          >
            <SampleDiagnosisPreview />
          </motion.div>
        </section>

        <section id="how-it-works" className="grid gap-6 border-b border-white/6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">How it works</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">One blocker first. Then the fix loop.</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
              The product is built for the moment before distribution. It finds the biggest reason the post will stall, then gives you a sharper next take instead of a vague summary.
            </p>
          </div>

          <div className="grid gap-3">
            {FIX_LOOP.map((item) => (
              <div key={item.step} className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-start gap-4">
                  <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 py-16 lg:grid-cols-[1fr_0.95fr] lg:items-start">
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">Who it is for</p>
            <div className="mt-5 grid gap-4">
              {CREATOR_PROOF.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-orange-500/15 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">Launch posture</p>
            <h2 className="mt-3 text-3xl font-black text-white">Public product page. Auth-gated workspace.</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-300 sm:text-base">
              The landing page explains the product and shows the output. Upload lives behind sign-in so results stay attached to a real user instead of a hidden password.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-zinc-400">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">Free to try</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">Transparent onboarding</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">Diagnosis-first output</span>
            </div>
            <div className="mt-8">
              <GradientButton variant="primary" size="lg" onClick={goToWorkspace}>
                Sign in to analyze
              </GradientButton>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
