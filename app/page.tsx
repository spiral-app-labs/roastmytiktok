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
  { text: 'My hook agent score was a 12. I cried. Then I fixed it. Now at 2M views.', handle: '@tiktoker_reformed' },
  { text: 'This thing called out my lighting before my followers even noticed. Brutal.', handle: '@content.creator.xyz' },
  { text: 'Got a 34/100. Best thing that ever happened to my channel.', handle: '@growingfast2024' },
];

const FEATURES = [
  { icon: '🎣', title: 'Hook Rewrite Workshop', desc: 'See why your first beat leaks and get stronger opener options you can actually say.' },
  { icon: '🎬', title: 'Reshoot Plan', desc: 'Concrete shot, text, and delivery guidance you can film right away.' },
  { icon: '🧠', title: 'Honest Hold Read', desc: 'Weak, mixed, or strong. No fake watch-time prophecy dressed up as science.' },
  { icon: '⚡', title: 'Fast Feedback', desc: 'Upload once, leave with a smarter first 3 seconds.' },
];

const HOOK_EXAMPLES = [
  {
    type: 'Visual + motion',
    strong: 'Open on the finished result, a fast zoom, or a dramatic before/after in frame 1.',
    weak: 'Start with a static selfie and a dead stare while you get into position.',
  },
  {
    type: 'Spoken curiosity',
    strong: '“this mistake is why your videos die at 300 views.”',
    weak: '“hey guys, so today i wanted to talk about...”',
  },
  {
    type: 'On-screen text',
    strong: 'Big text in frame 1: “3 things that kill retention instantly”',
    weak: 'Tiny text appears at 0:03 after the scroll already happened.',
  },
  {
    type: 'Attractiveness / pattern interrupt',
    strong: 'Unexpected prop, bold expression, outfit switch, or unusual angle that earns a pause.',
    weak: 'Nothing visually changes until the viewer is already gone.',
  },
]

// Particle positions (stable, SSR-safe — generated once)
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

        {/* Main content: two-column on desktop, stacked on mobile */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Left: Hero + features */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="space-y-8"
            >
              {/* Social proof bar */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm">
                <div className="flex -space-x-1">
                  {['🧑', '👩', '🧑💻'].map((e, i) => (
                    <span key={i} className="text-base">{e}</span>
                  ))}
                </div>
                <span className="text-zinc-300 text-sm font-medium">
                  <span className="text-orange-400 font-bold">847</span> TikToks roasted this week
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
                  stuck at{' '}
                  <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                    200 views
                  </span>
                  <br />
                  on tiktok?
                </h1>
                <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                  roastmytiktok shows why your opening dies, rewrites the hook, and gives you a reshoot plan you can film today.
                </p>
              </div>

              {/* Feature highlights */}
              <div id="how-it-works" className="grid grid-cols-2 gap-3 scroll-mt-28">
                {FEATURES.map((f) => (
                  <GlassCard key={f.title} variant="surface" className="p-3">
                    <div className="text-xl mb-1">{f.icon}</div>
                    <div className="text-white font-semibold text-sm">{f.title}</div>
                    <div className="text-zinc-500 text-xs mt-0.5 leading-snug">{f.desc}</div>
                  </GlassCard>
                ))}
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
                  {HOOK_EXAMPLES.map((example) => (
                    <div key={example.type} className="rounded-xl border border-zinc-800 bg-black/20 p-4">
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
            </motion.div>

            {/* Right: Password gate card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="space-y-5"
            >
              {/* Main card */}
              <GlassCard variant="highlighted" className="relative p-8 shadow-2xl shadow-black/50">
                {/* Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-pink-500/5 pointer-events-none" />

                <div className="relative space-y-6">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">🔥</div>
                    <h2 className="text-2xl font-black text-white">Exclusive Access</h2>
                    <p className="text-zinc-400 text-sm">
                      built for creators whose videos keep stalling before they ever get a fair shot.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter invite code"
                        className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-sm"
                      />
                    </div>

                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-red-400 text-sm text-center"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <GradientButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={loading || !password}
                      loading={loading}
                    >
                      {loading ? 'Verifying...' : 'Get Roasted →'}
                    </GradientButton>
                  </form>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-zinc-600 text-xs">what to expect</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  <div className="space-y-2">
                    {[
                      'hook rewrite workshop with better opener options',
                      'opening reshoot planner with concrete shot + text ideas',
                      'qualitative hold read that avoids fake precision',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-400">
                        <span className="text-orange-400 font-bold">✓</span>
                        {item}
                      </div>
                    ))}
                  </div>
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
      <div className="max-w-3xl mx-auto w-full px-4 pt-6">
        <AccountCTA />
      </div>
      <UploadQueueUI />
    </div>
  );
}
