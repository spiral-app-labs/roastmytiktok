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
        background: `radial-gradient(circle, rgba(${color},0.4) 0%, transparent 70%)`,
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 10, -10, 0],
        opacity: [0.3, 0.7, 0.3],
        scale: [1, 1.2, 1],
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

const TESTIMONIALS = [
  { text: 'I was stuck at 180 views for months. The reshoot planner showed me my opener was dead — refilmed it in 10 minutes and broke 12K.', handle: '@tiktoker_reformed' },
  { text: 'The hook breakdown literally showed me I had no hook at all. Just a greeting. Fixed it, next video did 40x my average.', handle: '@content.creator.xyz' },
  { text: 'Got a 34/100. Best thing that ever happened to my channel. The rewrite workshop gave me three openers I could film that day.', handle: '@growingfast2024' },
];

const FEATURES = [
  { icon: '🧠', title: 'Analysis-first diagnosis', desc: 'See exactly why the opener loses people before you waste time tweaking the wrong thing.' },
  { icon: '🎣', title: 'Hook rewrite workshop', desc: 'Get better first-line and first-frame options you can actually say on camera.' },
  { icon: '🎬', title: 'Reshoot plan', desc: 'Concrete shot, text, and delivery guidance you can film right away.' },
  { icon: '🗺️', title: 'Clear next step', desc: 'Know whether to keep iterating free, create an account, or choose a paid beta plan.' },
];

const SUCCESS_STORIES = [
  {
    handle: '@brayden.creates',
    before: '180 views avg',
    after: '12K on next video',
    fix: 'Dead opener → pattern-interrupt hook',
    quote: 'The reshoot planner showed me my opener was dead — refilmed it in 10 minutes.',
  },
  {
    handle: '@liftwithlaura',
    before: '220 views avg',
    after: '47K on next video',
    fix: 'No text hook → bold on-screen text frame 1',
    quote: 'I had no hook at all. Just a greeting. Fixed it, next video did 40x my average.',
  },
  {
    handle: '@techwithterry',
    before: '310 views avg',
    after: '8.2K on next video',
    fix: 'Buried payoff → curiosity gap opener',
    quote: 'Got a 34/100. Best thing that ever happened to my channel.',
  },
];

const HOOK_EXAMPLES = [
  {
    type: 'Visual hook',
    strong: 'Open on the finished result, a fast zoom, or a dramatic before/after in frame 1.',
    weak: 'Start with a static selfie and a dead stare while you get into position.',
  },
  {
    type: 'Spoken hook',
    strong: '"this mistake is why your videos die at 300 views."',
    weak: '"hey guys, so today i wanted to talk about..."',
  },
  {
    type: 'Text hook (on-screen)',
    strong: 'Bold text in frame 1: "3 things that kill retention instantly" — readable on mute.',
    weak: 'Tiny text appears at 0:03, after the scroll already happened.',
  },
  {
    type: 'Motion hook',
    strong: 'Something moves in the first half-second — jump cut, zoom, fast pan, or action already in progress.',
    weak: 'Opener settles in slowly while you adjust the camera or walk into frame.',
  },
  {
    type: 'Curiosity hook',
    strong: 'Name the surprising outcome, unexpected take, or payoff gap before you explain anything.',
    weak: 'Start with context and backstory — the payoff is buried behind a warm-up.',
  },
  {
    type: 'Attractiveness / pattern interrupt',
    strong: 'Unexpected prop, bold expression, outfit switch, or unusual angle that earns a pause.',
    weak: 'Nothing visually changes until the viewer is already gone.',
  },
  {
    type: 'Motion hook',
    strong: 'Cut mid-action: something is already happening in frame one before the viewer decides whether to stay.',
    weak: 'Camera settles in for 2 seconds while you find your angle. The scroll already happened.',
  },
  {
    type: 'Curiosity hook',
    strong: '"the reason your videos cap at 200 is almost never the content itself."',
    weak: '"hey, today I wanted to share something about TikTok growth with you."',
  },
]

// Particle positions (stable, SSR-safe - generated once)
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  size: 40 + (i * 17 % 80),
  delay: (i * 0.4) % 3,
  duration: 4 + (i * 0.7 % 4),
  color: i % 2 === 0 ? '251,146,60' : '236,72,153',
}));

export default function Home() {
  const [bypassed, setBypassed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
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

  // Cycle testimonials
  useEffect(() => {
    if (bypassed || !checked) return;
    const t = setInterval(() => {
      setActiveTestimonial((p) => (p + 1) % TESTIMONIALS.length);
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
        {/* Animated gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,146,60,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(236,72,153,0.08),transparent)]" />
          {PARTICLES.map((p) => (
            <Particle key={p.id} {...p} />
          ))}
        </div>

        {/* Beta status */}
        <div className="relative z-10 px-6 py-5">
          <div className="ml-auto flex w-fit items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-400 text-xs font-semibold">Private Beta</span>
          </div>
        </div>

        {/* Above-fold hero — unmissable headline + URL paste field */}
        <div className="relative z-10 px-4 pt-8 pb-12 sm:pt-12 sm:pb-16 flex flex-col items-center text-center">
          {/* Social proof bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm mb-6"
          >
            <div className="flex -space-x-1">
              {['🧑', '👩', '🧑💻'].map((e, i) => (
                <span key={i} className="text-base">{e}</span>
              ))}
            </div>
            <span className="text-zinc-300 text-sm font-medium">
              <span className="text-orange-400 font-bold">2,847</span> videos roasted &middot; <span className="text-orange-400 font-bold">847</span> creators past 200 views
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-4"
          >
            stuck at{' '}
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              200 views
            </span>
            {' '}on tiktok?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-zinc-400 text-lg sm:text-xl leading-relaxed max-w-2xl mb-6"
          >
            get a sharp diagnosis of why your video stalls, what the hook is missing, and the fastest fix to test next. roasty when useful, analytical where it counts.
          </motion.p>

          {/* Prominent URL paste field */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-xl mb-6"
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
                    className="w-full bg-zinc-900/80 border-2 border-zinc-700/60 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all text-base"
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
                  {loading ? 'Verifying...' : 'Unlock Beta →'}
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="w-full max-w-5xl mb-8"
          >
            <div className="grid grid-cols-1 gap-3 text-left lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-950/70 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-400">what you get back</p>
                    <h3 className="mt-2 text-2xl font-black text-white">a clearer read on why this post dies or spreads</h3>
                  </div>
                  <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-2xl">🔥</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { title: 'hook diagnosis', desc: 'frame-one clarity, scroll-stop strength, and the exact reason the opener leaks attention.' },
                    { title: 'priority order', desc: 'what to fix first, what is secondary, and what is not actually the problem.' },
                    { title: 'clean score + verdict', desc: 'a sharper summary you can scan in seconds instead of deciphering a wall of ai text.' },
                    { title: 'filmable next take', desc: 'rewrite and reshoot guidance you can actually test today.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                      <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-3">
                {[
                  { step: '1', title: 'unlock beta', desc: 'enter your invite code to get inside the private product.' },
                  { step: '2', title: 'create your account', desc: 'sign in with google or magic link so your roasts, history, and plan choice stay attached to you.' },
                  { step: '3', title: 'pick your path', desc: 'start free for limited roasts or choose a monthly/yearly beta plan. billing is staged through beta onboarding, not fake in-app checkout.' },
                ].map((item) => (
                  <div key={item.step} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 border border-orange-500/25 text-sm font-bold text-orange-400">
                        {item.step}
                      </div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">{item.title}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* What you get — inline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 mb-8"
          >
            {[
              { icon: '🧠', text: 'Drop-off diagnosis' },
              { icon: '🎣', text: 'Hook rewrites' },
              { icon: '🎬', text: 'Reshoot plan' },
              { icon: '🗺️', text: 'Clear beta path' },
            ].map((f) => (
              <span key={f.text} className="flex items-center gap-1.5">
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </span>
            ))}
          </motion.div>
        </div>

        {/* Below-fold content */}
        <div className="relative z-10 flex-1 px-4 pb-16">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

            {/* Left: Features + agents + success stories */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              {/* Feature highlights */}
              <div id="how-it-works" className="scroll-mt-28 rounded-[28px] border border-zinc-800/80 bg-zinc-950/55 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-zinc-500 text-[11px] uppercase tracking-[0.24em] font-semibold">why creators keep using it</p>
                    <h3 className="mt-1 text-xl font-black text-white">less generic advice, more diagnosis you can act on</h3>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-300">
                    <span>analysis-first</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FEATURES.map((f) => (
                    <GlassCard key={f.title} variant="surface" className="p-4 border border-zinc-800/70 bg-black/20">
                      <div className="text-xl mb-2">{f.icon}</div>
                      <div className="text-white font-semibold text-sm">{f.title}</div>
                      <div className="text-zinc-500 text-sm mt-1.5 leading-relaxed">{f.desc}</div>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* Agent previews */}
              <div id="agents" className="space-y-2 scroll-mt-28">
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">Who&apos;s judging you</p>
                <div className="flex flex-wrap gap-2">
                  {AGENTS_PREVIEW.slice(0, 4).map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300"
                    >
                      <span>{a.emoji}</span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center px-2.5 py-1.5 rounded-lg bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-500">
                    +5 more agents
                  </div>
                </div>
              </div>

              {/* Success stories — social proof */}
              <div className="space-y-3">
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">200 views → viral</p>
                <div className="grid grid-cols-1 gap-3">
                  {SUCCESS_STORIES.map((s) => (
                    <GlassCard key={s.handle} variant="surface" className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-400 font-bold line-through">{s.before}</span>
                          <span className="text-zinc-600">→</span>
                          <span className="text-emerald-400 font-bold">{s.after}</span>
                        </div>
                      </div>
                      <p className="text-zinc-300 text-xs italic leading-relaxed">&ldquo;{s.quote}&rdquo;</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-zinc-600 text-xs font-medium">{s.handle}</span>
                        <span className="text-[10px] text-zinc-700 bg-zinc-900 rounded-full px-2 py-0.5">{s.fix}</span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right: Hook school + testimonials */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="space-y-5"
            >
              <GlassCard variant="surface" className="p-5 lg:p-6 border border-orange-500/20 bg-gradient-to-br from-zinc-900/90 to-zinc-950/80">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-orange-400 font-semibold mb-2">hook school</p>
                    <h3 className="text-white text-xl font-black">the first 2-3 seconds decide whether any later advice matters.</h3>
                    <p className="text-zinc-400 text-sm mt-2 max-w-xl">
                      if the opener flops, viewers never stay long enough for your CTA, caption, or payoff to do their job.
                      strong hooks buy attention. weak hooks kill everything downstream.
                    </p>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-2 min-w-[180px] text-center text-[11px]">
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                      <div className="text-red-400 font-bold">0-1s</div>
                      <div className="text-zinc-500 mt-1">stop scroll</div>
                    </div>
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
                      <div className="text-yellow-400 font-bold">1-3s</div>
                      <div className="text-zinc-500 mt-1">earn retention</div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                      <div className="text-emerald-400 font-bold">after</div>
                      <div className="text-zinc-500 mt-1">then CTA helps</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {HOOK_EXAMPLES.slice(0, 4).map((example, idx) => (
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

              {/* Testimonial rotator */}
              <div className="relative h-20 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTestimonial}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0"
                  >
                    <GlassCard variant="surface" className="h-full p-4">
                      <p className="text-zinc-300 text-xs italic leading-relaxed">
                        &ldquo;{TESTIMONIALS[activeTestimonial].text}&rdquo;
                      </p>
                      <p className="text-zinc-500 text-xs mt-1.5 font-medium">{TESTIMONIALS[activeTestimonial].handle}</p>
                    </GlassCard>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col items-stretch">
      <div className="max-w-3xl mx-auto w-full px-4 pt-8 sm:pt-10 space-y-5">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700/50 text-xs text-zinc-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            6 AI agents ready to roast
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            Stuck at{' '}
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">200 views</span>?
          </h1>
          <p className="text-zinc-400 text-base max-w-lg mx-auto">
            Upload a TikTok or paste a link. Get an analysis-first diagnosis, stronger hook options, and a reshoot plan you can film today.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
          {[
            { icon: '🧠', text: 'Drop-off diagnosis' },
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
      </div>
      <UploadQueueUI />
    </div>
  );
}
