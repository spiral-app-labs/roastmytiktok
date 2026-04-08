'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import UploadQueueUI from '@/components/UploadQueueUI';
import { AccountCTA } from '@/components/AccountCTA';
import { SampleDiagnosisPreview } from '@/components/SampleDiagnosisPreview';
import { GradientButton } from '@/components/ui';

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
    detail: 'Use the sample result as a QC layer when several cuts are moving fast and subjective feedback is not enough.',
  },
  {
    label: 'In-house social teams',
    detail: 'Use the priority stack to align on the next take instead of arguing over five competing edits.',
  },
];

const ACCESS_OPTIONS = [
  {
    title: 'Start with diagnosis',
    detail: 'Sign in to upload a draft, run a limited beta diagnosis, and save results to your workspace.',
    cta: 'Analyze my video',
  },
  {
    title: 'Already in the beta',
    detail: 'Have an invite code already? Enter it after you commit so the landing page can stay product-first.',
    cta: 'Enter invite code',
  },
];

export default function Home() {
  const [bypassed, setBypassed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    fetch('/api/bypass/check')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setBypassed(data.bypassed === true);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bypassed) return;

    fetch('/api/usage')
      .then((response) => response.json())
      .then((data) => {
        const snapshot = data?.usage;
        if (snapshot) {
          setUsage({
            used: snapshot.totals.roastsInWindow,
            limit: snapshot.caps.roastLimit ?? 3,
          });
        }
      })
      .catch(() => {});
  }, [bypassed]);

  const openGate = () => {
    setError('');
    setPassword('');
    setIsGateOpen(true);
  };

  const closeGate = () => {
    if (loading) return;
    setIsGateOpen(false);
    setError('');
  };

  const goToLogin = () => {
    router.push('/login?redirect=%2Fdashboard');
  };

  const scrollToSample = () => {
    const section = document.getElementById('sample-result');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setBypassed(true);
        setIsGateOpen(false);
        router.refresh();
      } else {
        setError('Invite code not recognized. Sign in or use a valid beta code.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!checked) {
    return <main className="min-h-screen bg-[#080808]" />;
  }

  if (!bypassed) {
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
                <GradientButton variant="primary" size="lg" className="sm:min-w-[210px]" onClick={openGate}>
                  Upload a video
                </GradientButton>
                <GradientButton variant="secondary" size="lg" className="sm:min-w-[210px]" onClick={scrollToSample}>
                  View sample result
                </GradientButton>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-400">
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">Hook, pacing, audio, captions, CTA</span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">Priority-ranked fixes</span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">Private beta access after click</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
              className="lg:justify-self-end"
            >
              <SampleDiagnosisPreview />
            </motion.div>
          </section>

          <section id="diagnose" className="grid gap-6 border-b border-white/6 py-20 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">What we diagnose</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                The first-screen review should feel like evidence, not vibes.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
                Each dimension is scored independently so you can see what is actually killing reach versus what only needs cleanup later.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {DIAGNOSIS_DIMENSIONS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/8 bg-white/[0.035] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
                      {item.score}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="sample-result" className="grid gap-8 border-b border-white/6 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="order-2 lg:order-1">
              <SampleDiagnosisPreview />
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">Sample result</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A result page built around the fix, not the spectacle.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
                The diagnostic surface leads with the blocker, shows evidence from the draft, and narrows the next take into something filmable the same day.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-3xl border border-orange-500/15 bg-orange-500/[0.06] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Primary blocker</p>
                  <p className="mt-2 text-lg font-semibold text-white">The hook spends 1.8 seconds getting oriented instead of making a promise.</p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Evidence callout</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    Timestamped proof anchors the recommendation: frame one is a desk-wide shot, the payoff only appears at `00:03`, and the first spoken line sounds like setup instead of tension.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Next take brief</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    The result pairs a stronger opening line with a reshoot instruction so the next version has a clear first frame, faster payoff, and a more visible caption stack.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="border-b border-white/6 py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">How the fix loop works</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Diagnose the draft. Fix the priority. Post the stronger cut.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {FIX_LOOP.map((item) => (
                <div key={item.step} className="rounded-3xl border border-white/8 bg-white/[0.035] p-6">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">{item.step}</span>
                  <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="creator-proof" className="border-b border-white/6 py-20">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">Creator proof</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Built for teams that need the next take to be clearer, not louder.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
                  The product works best when the goal is concrete: identify the blocker, rewrite the opening, and ship the improved cut with fewer debates.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {CREATOR_PROOF.map((item) => (
                  <div key={item.label} className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                    <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="pricing" className="py-20">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">Pricing and access</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Access starts with a real product action, not a homepage gate.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
                  The first click moves you into sign-in or beta access. Public marketing stays focused on the diagnosis itself.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {ACCESS_OPTIONS.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/8 bg-white/[0.035] p-6">
                    <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.detail}</p>
                    <div className="mt-6">
                      <GradientButton variant={item.title === 'Start with diagnosis' ? 'primary' : 'secondary'} size="lg" onClick={openGate}>
                        {item.cta}
                      </GradientButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <AnimatePresence>
          {isGateOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
              onClick={closeGate}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#111111] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Continue to diagnosis</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Start with sign-in or use your beta code.</h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeGate}
                    className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  The landing page stays public and product-led. Access decisions happen here, after the user commits to analyzing a real video.
                </p>

                <div className="mt-6 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">New to Go Viral?</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Sign in to upload a draft, save diagnoses, and continue into the private beta flow.
                  </p>
                  <div className="mt-4">
                    <GradientButton variant="primary" size="lg" className="w-full" onClick={goToLogin}>
                      Analyze my video
                    </GradientButton>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <label htmlFor="invite-code" className="text-sm font-semibold text-white">
                    Already have beta access?
                  </label>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Enter your invite code to unlock upload immediately.
                  </p>

                  <input
                    id="invite-code"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter invite code"
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-orange-500/40 focus:outline-none"
                  />

                  <div className="mt-4">
                    <GradientButton
                      type="submit"
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      disabled={loading || !password.trim()}
                      loading={loading}
                    >
                      Unlock beta
                    </GradientButton>
                  </div>

                  {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  return (
    <div className="flex flex-col items-stretch">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-8 sm:pt-10">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            Diagnosis workspace ready
          </div>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
            Check your video
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent"> before you post.</span>
          </h1>
          <p className="mx-auto max-w-lg text-base text-zinc-400">
            Upload your draft before posting to TikTok or Reels. Get a ranked diagnosis, stronger hook options, and a next-take brief you can film today.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
          {[
            { icon: '01', text: 'Primary blocker' },
            { icon: '02', text: 'Hook rewrite' },
            { icon: '03', text: 'Reshoot brief' },
            { icon: '04', text: 'Priority stack' },
          ].map((item) => (
            <span key={item.text} className="flex items-center gap-2">
              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                {item.icon}
              </span>
              <span>{item.text}</span>
            </span>
          ))}
        </div>

        <AccountCTA />

        {usage && usage.used > 0 && (
          usage.used >= usage.limit ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <span>Daily diagnosis limit reached ({usage.used}/{usage.limit} used).</span>
              <a href="/pricing" className="font-semibold text-amber-200 underline underline-offset-2 transition-colors hover:text-white">
                Upgrade
              </a>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 px-4 py-2.5 text-center text-sm text-zinc-400">
              {usage.used} of {usage.limit} diagnoses used today
            </div>
          )
        )}
      </div>

      <UploadQueueUI />
    </div>
  );
}
