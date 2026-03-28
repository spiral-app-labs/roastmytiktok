'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AGENTS } from '@/lib/agents';

function CountdownTimer({ launchDate }: { launchDate: string }) {
  const calcTimeLeft = useCallback(() => {
    const diff = new Date(launchDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [launchDate]);

  const [timeLeft, setTimeLeft] = useState(calcTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [calcTimeLeft]);

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-3 justify-center">
      {units.map((unit) => (
        <div key={unit.label} className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 min-w-[72px]">
          <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
            {String(unit.value).padStart(2, '0')}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function WaitlistLanding() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [slotsRemaining, setSlotsRemaining] = useState(
    parseInt(process.env.NEXT_PUBLIC_SLOTS_REMAINING || '47', 10)
  );

  const launchDate = process.env.NEXT_PUBLIC_LAUNCH_DATE || '2026-04-07T00:00:00Z';

  useEffect(() => {
    fetch('/api/waitlist')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.slotsRemaining === 'number') {
          setSlotsRemaining(data.slotsRemaining);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setStatus('success');
      setMessage(data.message);
      if (!data.alreadyJoined) {
        setSlotsRemaining((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 relative overflow-hidden">
      {/* Animated background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-orange-500/15 via-red-500/10 to-transparent blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-pink-500/10 via-orange-500/5 to-transparent blur-[100px] animate-pulse-slow" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-red-500/8 to-transparent blur-[80px]" />
      </div>

      {/* Floating embers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-orange-400/60 animate-ember-rise"
            style={{
              left: `${8 + i * 8}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${4 + (i % 3) * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl w-full pt-16 md:pt-24 pb-16 space-y-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wide uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Launching April 7th
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9]">
            <span className="text-white">Your TikTok</span>
            <br />
            <span className="text-white">is </span>
            <span className="fire-text">cringe.</span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-300">
            We watched it.{' '}
            <span className="fire-text">We have notes.</span>
          </h2>

          <p className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Upload your video. 6 AI agents tear it apart — frame by frame, word by word, beat by beat.
            Your hook, your lighting, your audio, your captions. Nothing gets a pass.
            Get the brutally honest feedback that will actually make you go viral.
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center space-y-3"
        >
          <p className="text-xs uppercase tracking-widest text-zinc-500">Roasting begins in</p>
          <CountdownTimer launchDate={launchDate} />
        </motion.div>

        {/* Email Capture */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-md mx-auto text-center space-y-4"
        >
          {status === 'success' ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-2">
              <div className="text-3xl">🔥</div>
              <p className="text-green-400 font-semibold">{message}</p>
              <p className="text-zinc-500 text-sm">We&apos;ll email you when it&apos;s time to get roasted.</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="fire-gradient text-white font-bold px-6 py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Joining...
                    </span>
                  ) : (
                    'Claim Your Spot'
                  )}
                </button>
              </form>
              {status === 'error' && (
                <p className="text-red-400 text-sm">{message}</p>
              )}
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-red-400 font-semibold">{slotsRemaining} spots left</span>
                <span className="text-zinc-600">— founding rate locked at signup</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Agent Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="space-y-6"
        >
          <h3 className="text-center text-xs uppercase tracking-widest text-zinc-500">
            6 agents. Zero mercy. These are the ones coming for your content.
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
                className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 text-left hover:border-orange-500/30 transition-all group hover:bg-zinc-900/80"
              >
                <div className="text-2xl mb-2">{agent.emoji}</div>
                <div className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                  {agent.name}
                </div>
                <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {agent.oneLiner}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Social Proof / How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="space-y-8"
        >
          <h3 className="text-center text-xs uppercase tracking-widest text-zinc-500">
            How it works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Drop your video',
                desc: 'Upload any TikTok. We\'ll handle the rest. Prepare yourself.',
              },
              {
                step: '02',
                title: '6 agents go to work',
                desc: 'Hook strength. Lighting. Transcript. Audio energy. Algorithm fit. Authenticity. Frame by frame, word by word.',
              },
              {
                step: '03',
                title: 'Watch the roast live',
                desc: 'Your video plays while agents drop comments in real time. Then a final verdict. No participation trophies.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 text-left"
              >
                <div className="text-orange-500/60 font-mono text-xs font-bold mb-3">{item.step}</div>
                <div className="text-white font-semibold text-sm mb-1">{item.title}</div>
                <div className="text-zinc-500 text-xs leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Viral hook section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-center space-y-6 py-8"
        >
          <div className="max-w-lg mx-auto space-y-4">
            <p className="text-lg md:text-xl text-zinc-300 font-semibold">
              &ldquo;But I already know my content is good&rdquo;
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Cool. So did every creator sitting at 200 views wondering why the algorithm hates them.
              Our agents have analyzed thousands of TikToks. They know exactly why yours isn&apos;t hitting.
              The question is: can you handle hearing it?
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { stat: '100+', label: 'Data points analyzed' },
              { stat: '6', label: 'AI agents' },
              { stat: '30s', label: 'To destroy your ego' },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-2xl font-black fire-text">{item.stat}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="text-center space-y-4 pb-8"
        >
          <p className="text-zinc-500 text-xs">
            No free tier. No sugarcoating. Just the truth about your content.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fire-gradient text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-lg"
          >
            Claim Your Spot
          </button>
          <p className="text-zinc-600 text-xs">
            {slotsRemaining} spots remaining at launch price
          </p>
        </motion.div>
      </div>
    </main>
  );
}
