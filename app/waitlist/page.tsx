'use client';

import { useState } from 'react';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Store in localStorage for now
    const existing = JSON.parse(localStorage.getItem('rmt_waitlist') || '[]');
    existing.push({ email, timestamp: Date.now() });
    localStorage.setItem('rmt_waitlist', JSON.stringify(existing));

    setSubmitted(true);
  };

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      window.location.href = '/bypass';
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,146,60,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(236,72,153,0.1),transparent)]" />
      </div>

      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="inline-block cursor-default select-none"
          aria-label="RoastMyTikTok"
        >
          <span className="text-5xl">🔥</span>
        </button>

        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              RoastMyTikTok
            </span>
          </h1>
          <p className="text-zinc-300 text-lg font-medium">
            Your TikTok is cringe. Watch AI prove it.
          </p>
        </div>

        {/* Coming Soon badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-orange-400 text-sm font-semibold">Coming Soon</span>
        </div>

        {/* Description */}
        <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto">
          9 specialized AI agents will tear apart your TikTok and hand you a blueprint to go viral.
          Get early access when we launch.
        </p>

        {/* Email signup */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-sm"
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Join the Waitlist
            </button>
          </form>
        ) : (
          <div className="space-y-2 py-4">
            <p className="text-orange-400 font-semibold">You&apos;re on the list! 🎉</p>
            <p className="text-zinc-500 text-sm">We&apos;ll let you know when it&apos;s your turn to get roasted.</p>
          </div>
        )}

        {/* Subtle footer link */}
        <p className="text-zinc-700 text-xs pt-8">
          Already have an invite?{' '}
          <a href="/bypass" className="text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2">
            Enter code
          </a>
        </p>
      </div>
    </main>
  );
}
