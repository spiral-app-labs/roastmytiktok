'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import UploadQueueUI from '@/components/UploadQueueUI';
import { AccountCTA } from '@/components/AccountCTA';
import { GlassCard, GradientButton } from '@/components/ui';

// Floating particle for background
function Particle({ delay, duration, x, y, size, color }: { delay: number; duration: number; x: number; y: number; size: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(${color},0.35) 0%, transparent 70%)`,
      }}
      animate={{
        y: [0, -35, 0],
        x: [0, 12, -8, 0],
        opacity: [0.2, 0.6, 0.2],
        scale: [1, 1.25, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

const AGENTS_PREVIEW = [
  { emoji: '💀', name: 'Hook Agent', desc: 'Judges your first 3 seconds' },
  { emoji: '🎨', name: 'Visual Agent', desc: 'Rates your cinematography (or lack of it)' },
  { emoji: '🔮', name: 'Algorithm Agent', desc: 'Predicts your FYP fate' },
  { emoji: '💰', name: 'Conversion Agent', desc: 'Destroys your CTA strategy' },
  { emoji: '👁️', name: 'Authenticity Agent', desc: 'Detects cringe at molecular level' },
  { emoji: '🎧', name: 'Audio Agent', desc: 'Performs autopsies on audio choices' },
];



const FEATURES = [
  {
    icon: '📉',
    title: 'Drop-off diagnosis',
    problem: 'Your analytics shows where viewers leave.',
    fix: 'We show why — and what to change in the first 3 seconds.',
  },
  {
    icon: '🎣',
    title: 'Hook rewrite workshop',
    problem: 'Weak openers are the #1 reason videos die at 200 views.',
    fix: 'Get 3+ stronger hooks you can say on camera today.',
  },
  {
    icon: '🎬',
    title: 'Reshoot planner',
    problem: 'Knowing what's wrong isn't enough.',
    fix: 'Concrete shot, text, and delivery guidance to film right now.',
  },
  {
    icon: '🔬',
    title: '6-agent deep analysis',
    problem: 'Generic AI feedback misses what actually kills retention.',
    fix: 'Six specialized agents each tear apart a different dimension.',
  },
];

const HOOK_EXAMPLES = [
  {
    type: 'Spoken hook',
    strong: '"this mistake is why your videos die at 300 views."',
    weak: '"hey guys, so today i wanted to talk about..."',
  },
  {
    type: 'Visual hook',
    strong: 'Open on the finished result or a fast zoom in frame 1.',
    weak: 'Static selfie and a dead stare while you get into position.',
  },
  {
    type: 'Text hook (on-screen)',
    strong: 'Bold text in frame 1: "3 things that kill retention instantly"',
    weak: 'Tiny text appears at 0:03, after the scroll already happened.',
  },
  {
    type: 'Curiosity hook',
    strong: '"the reason your videos cap at 200 is almost never the content itself."',
    weak: '"hey, today I wanted to share something about TikTok growth with you."',
  },
];

// Particle positions (stable, SSR-safe)
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  size: 50 + (i * 17 % 90),
  delay: (i * 0.4) % 3,
  duration: 5 + (i * 0.7 % 4),
  color: i % 3 === 0 ? '251,146,60' : i % 3 === 1 ? '236,72,153' : '139,92,246',
}));

export default function Home() {
  const [bypassed, setBypassed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/bypass/check')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setBypassed(data.bypassed === true);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Fetch usage when bypassed
  useEffect(() => {
    if (!bypassed) return;
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => {
        const snap = data?.usage;
        if (snap) {
          setUsage({
            used: snap.totals.roastsInWindow,
            limit: snap.caps.roastLimit ?? 3,
          });
        }
      })
      .catch(() => {});
  }, [bypassed]);

  // Cycle testimonials
  useEffect(() => {
    if (bypassed || !checked) return;
    const t = setInterval(() => {
    }, 4000);
    return () => clearInterval(t);
  }, [bypassed, checked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/bypass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setBypassed(true);
      router.refresh();
    } else {
      setError('Wrong password. This is a private beta.');
      setLoading(false);
    }
  };

  if (!checked) {
    return <main className="min-h-screen bg-[#080808]" />;
  }

  if (!bypassed) {
    return (
      <main className="min-h-screen bg-[#080808] overflow-hidden relative flex flex-col">
        {/* Rich layered background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Primary glow — stronger than before */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-10%,rgba(251,146,60,0.18),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_85%_85%,rgba(236,72,153,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_10%_70%,rgba(139,92,246,0.07),transparent)]" />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(rgba(251,146,60,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.5) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          />
          {PARTICLES.map((p) => (
            <Particle key={p.id} {...p} />
          ))}
        </div>

        {/* Top bar */}
        <div className="relative z-10 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-lg tracking-tight">Go Viral</span>
            <span className="text-zinc-600 text-xs font-medium">with AI</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-400 text-xs font-semibold">Private Beta</span>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 px-4 pt-8 pb-12 sm:pt-14 sm:pb-16 flex flex-col items-center text-center">

          {/* Social proof pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm mb-8"
          >
            <div className="flex -space-x-1">
              {['🧑', '👩', '🧑‍💻'].map((e, i) => (
                <span key={i} className="text-base">{e}</span>
              ))}
            </div>
            <span className="text-zinc-300 text-sm font-medium">
              <span className="text-orange-400 font-bold">2,847</span> videos analyzed &middot; <span className="text-emerald-400 font-bold">847</span> creators past 200 views
            </span>
          </motion.div>

          {/* Main headline — pain-point-first */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.03] tracking-tight mb-5"
          >
            stop guessing why your
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-pink-500 bg-clip-text text-transparent">
              videos don&apos;t go viral
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="text-zinc-400 text-lg sm:text-xl leading-relaxed max-w-2xl mb-3"
          >
            Our AI analyzes your first 3 seconds and shows you exactly why viewers are leaving — then gives you stronger hooks and a reshoot plan you can film today.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-600 text-sm mb-8"
          >
            roasty when useful, precise where it counts.
          </motion.p>

          {/* Beta unlock form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="w-full max-w-xl mb-8"
          >
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter invite code to unlock private beta"
                    aria-label="Beta invite code"
                    className="w-full bg-zinc-900/80 border-2 border-zinc-700/60 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all text-base backdrop-blur-sm"
                  />
                </div>
                <GradientButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="sm:px-8 whitespace-nowrap"
                  disabled={loading || !password}
                  loading={loading}
                >
                  {loading ? 'Verifying...' : 'Go Viral →'}
                </GradientButton>
              </div>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-red-400 text-sm text-center mt-3"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-600 mb-10"
          >
            {[
              { icon: '🔒', text: 'No card required' },
              { icon: '⚡', text: 'Results in ~60s' },
              { icon: '🎯', text: 'Analysis-first, not generic AI fluff' },
              { icon: '🔥', text: '6 specialized agents' },
            ].map((f) => (
              <span key={f.text} className="flex items-center gap-1.5">
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </span>
            ))}
          </motion.div>

          {/* Before/after + steps grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-5xl mb-8"
          >
            <div className="grid grid-cols-1 gap-3 text-left lg:grid-cols-[1.15fr_0.85fr]">
              {/* What you get card */}
              <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-400">what you get back</p>
                    <h3 className="mt-2 text-2xl font-black text-white">a clear read on why this post dies or spreads</h3>
                  </div>
                  <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-2xl shrink-0">🔥</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: '📉', title: 'hook diagnosis', desc: 'frame-one clarity, scroll-stop strength, and the exact reason the opener leaks attention.' },
                    { icon: '🎯', title: 'priority fixes', desc: 'what to fix first, what is secondary, and what is not actually the problem.' },
                    { icon: '📊', title: 'clean score + verdict', desc: 'a sharper summary you can scan in seconds — not a wall of AI text.' },
                    { icon: '🎬', title: 'filmable next take', desc: 'rewrite and reshoot guidance you can actually test today.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-zinc-800 bg-black/25 p-4 flex gap-3">
                      <span className="text-lg mt-0.5 shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-3">
                {[
                  { step: '1', icon: '🔑', title: 'unlock beta', desc: 'enter your invite code to get inside the private product.' },
                  { step: '2', icon: '👤', title: 'create your account', desc: 'sign in with google or magic link so your results stay attached to you.' },
                  { step: '3', icon: '🚀', title: 'pick your path', desc: 'start free for limited analyses or choose a monthly beta plan.' },
                ].map((item) => (
                  <div key={item.step} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-sm flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 border border-orange-500/25 text-sm font-bold text-orange-400 shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-300">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Below-fold content */}
        <div className="relative z-10 flex-1 px-4 pb-20">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Left: Features + agents + success stories */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Problem → fix features */}
              <div id="how-it-works" className="scroll-mt-28 rounded-[28px] border border-zinc-800/80 bg-zinc-950/55 p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-zinc-500 text-[11px] uppercase tracking-[0.24em] font-semibold">why creators keep using it</p>
                  <h3 className="mt-1 text-xl font-black text-white">problem → fix → expected result</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FEATURES.map((f) => (
                    <GlassCard key={f.title} variant="surface" className="p-4 border border-zinc-800/70 bg-black/20">
                      <div className="text-xl mb-2">{f.icon}</div>
                      <div className="text-white font-semibold text-sm mb-2">{f.title}</div>
                      <div className="text-zinc-600 text-xs mb-1.5">{f.problem}</div>
                      <div className="text-zinc-300 text-xs leading-relaxed">
                        <span className="text-orange-400 font-semibold">→ </span>{f.fix}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* Agent previews */}
              <div id="agents" className="space-y-2 scroll-mt-28">
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">6 agents judging your video</p>
                <div className="flex flex-wrap gap-2">
                  {AGENTS_PREVIEW.map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300 hover:border-orange-500/30 transition-colors"
                    >
                      <span>{a.emoji}</span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-zinc-600 text-xs">Each agent specializes in a different dimension of what makes or kills a video.</p>
              </div>

            </motion.div>

            {/* Right: Hook school + testimonials */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.42, ease: 'easeOut' }}
              className="space-y-5"
            >
              {/* Hook school */}
              <GlassCard variant="surface" className="p-5 lg:p-6 border border-orange-500/20 bg-gradient-to-br from-zinc-900/90 to-zinc-950/80">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-orange-400 font-semibold mb-2">hook school</p>
                    <h3 className="text-white text-xl font-black">your first 3 seconds decide everything.</h3>
                    <p className="text-zinc-400 text-sm mt-2 max-w-xl">
                      analytics shows where they leave. Go Viral shows <span className="text-zinc-200 font-medium">why</span> and what to change.
                      if the opener flops, your CTA, caption, and payoff never get a chance.
                    </p>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-2 min-w-[180px] text-center text-[11px] shrink-0">
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                      <div className="text-red-400 font-bold">0–1s</div>
                      <div className="text-zinc-500 mt-1">stop scroll</div>
                    </div>
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
                      <div className="text-yellow-400 font-bold">1–3s</div>
                      <div className="text-zinc-500 mt-1">earn retention</div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                      <div className="text-emerald-400 font-bold">3s+</div>
                      <div className="text-zinc-500 mt-1">CTA works</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {HOOK_EXAMPLES.map((example, idx) => (
                    <div key={`${example.type}-${idx}`} className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">{example.type}</p>
                      <div className="space-y-2 text-sm">
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                          <span className="text-emerald-400 font-semibold">strong:</span>{' '}
                          <span className="text-zinc-200">{example.strong}</span>
                        </div>
                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                          <span className="text-red-400 font-semibold">weak:</span>{' '}
                          <span className="text-zinc-300">{example.weak}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>


              {/* Trust / money-back strip */}
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="text-emerald-400 text-base">✓</span>
                  <span>No card required to start</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="text-emerald-400 text-base">✓</span>
                  <span>Cancel anytime during beta</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="text-emerald-400 text-base">✓</span>
                  <span>goviralwith.ai</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    );
  }

  // Logged-in / bypassed state
  return (
    <div className="flex flex-col items-stretch">
      <div className="max-w-3xl mx-auto w-full px-4 pt-8 sm:pt-10 space-y-5">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700/50 text-xs text-zinc-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            6 AI agents ready
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            stop guessing.{' '}
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">go viral.</span>
          </h1>
          <p className="text-zinc-400 text-base max-w-lg mx-auto">
            Upload a TikTok or paste a link. Get an analysis-first diagnosis, stronger hook options, and a reshoot plan you can film today.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
          {[
            { icon: '📉', text: 'Drop-off diagnosis' },
            { icon: '🎣', text: 'Hook rewrites' },
            { icon: '🎬', text: 'Reshoot plan' },
            { icon: '📊', text: 'Score + grade' },
          ].map((f) => (
            <span key={f.text} className="flex items-center gap-1.5">
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </span>
          ))}
        </div>
        <AccountCTA />
        {usage && usage.used > 0 && (
          usage.used >= usage.limit ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center justify-between gap-3">
              <span>Daily limit reached ({usage.used}/{usage.limit} roasts used) — upgrade for unlimited</span>
              <a href="/pricing" className="shrink-0 font-semibold text-amber-200 underline underline-offset-2 hover:text-white transition-colors">Upgrade</a>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-400 text-center">
              {usage.used} of {usage.limit} free roasts used today
            </div>
          )
        )}
      </div>
      <UploadQueueUI />
    </div>
  );
}
