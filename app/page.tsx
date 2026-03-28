'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WaitlistLanding from '@/components/WaitlistLanding';
import Link from 'next/link';

// Waitlist is active until NEXT_PUBLIC_LAUNCH_DATE (ISO UTC string, e.g. "2026-04-06T16:00:00Z")
const LAUNCH_DATE = process.env.NEXT_PUBLIC_LAUNCH_DATE
  ? new Date(process.env.NEXT_PUBLIC_LAUNCH_DATE)
  : null;

function isPreLaunch(): boolean {
  if (!LAUNCH_DATE) return false;
  return new Date() < LAUNCH_DATE;
}

function MarketingHome() {
  const [annual, setAnnual] = useState(false);
  const router = useRouter();

  const price = (base: number) =>
    annual ? Math.round(base * 0.5) : base;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <span className="font-bold text-lg bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            RoastMyTikTok
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-8">
          🔥 AI-powered TikTok feedback
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
          Your TikToks deserve{' '}
          <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            brutal honesty.
          </span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          AI agents roast your content frame-by-frame. Hook score, structure analysis, viral
          benchmarks. Stop guessing why your videos flop.
        </p>
        <Link
          href="/login"
          className="inline-block bg-[#f97316] hover:bg-orange-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-orange-500/20"
        >
          Get roasted →
        </Link>
        <p className="text-zinc-600 text-sm mt-4">No credit card required to start</p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-zinc-500 text-center mb-14">Three steps to finding out why your content flops</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Upload or paste',
              desc: 'Upload a video file or paste a TikTok URL. We handle the rest.',
              icon: '📤',
            },
            {
              step: '02',
              title: 'AI agents analyze',
              desc: 'Six agents tear apart your hook, pacing, script, and viral patterns.',
              icon: '🤖',
            },
            {
              step: '03',
              title: 'Get your roast',
              desc: 'Score, brutal feedback, and an exact fix list. No fluff.',
              icon: '🔥',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center hover:border-orange-500/30 transition-colors"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <div className="text-orange-400 font-mono text-sm font-bold mb-2">{item.step}</div>
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Pricing</h2>
        <p className="text-zinc-500 text-center mb-8">Pick the plan that matches how serious you are</p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-orange-500' : 'bg-zinc-700'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? 'translate-x-7' : 'translate-x-1'}`}
            />
          </button>
          <span className={`text-sm font-medium flex items-center gap-2 ${annual ? 'text-white' : 'text-zinc-500'}`}>
            Annual
            {annual && (
              <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                Save 50%
              </span>
            )}
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Creator */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-1">Creator</h3>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold">${price(19)}</span>
                <span className="text-zinc-500 mb-1">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400">
                {[
                  '15 video roasts/month',
                  '1 account analysis/month',
                  'Hook + structure scoring',
                  '30-day history & trend benchmarks',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login"
              className="mt-auto block text-center bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Get started →
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-zinc-900/60 border-2 border-[#f97316] rounded-2xl p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f97316] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
              ⭐ Most Popular
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-1">Pro</h3>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold">${price(49)}</span>
                <span className="text-zinc-500 mb-1">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400">
                {[
                  '100 video roasts/month',
                  '5 account analyses/month',
                  'Audio & script analysis',
                  'Viral playbook recommendations',
                  'PDF export + shareable links',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login"
              className="mt-auto block text-center bg-[#f97316] hover:bg-orange-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Go Pro →
            </Link>
          </div>

          {/* Unlimited */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-1">Unlimited</h3>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold">${price(99)}</span>
                <span className="text-zinc-500 mb-1">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400">
                {[
                  'Unlimited everything',
                  'Competitor account comparison',
                  'Team seats (2 included)',
                  'White-label PDF reports',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login"
              className="mt-auto block text-center bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Go Unlimited →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 text-center text-zinc-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span>🎵</span>
          <span className="font-semibold text-zinc-500">RoastMyTikTok</span>
        </div>
        <p>© 2026 Spiral App Labs. Zero mercy guaranteed.</p>
      </footer>
    </div>
  );
}

export default function Home() {
  const waitlistMode = isPreLaunch();
  const [bypassed, setBypassed] = useState(!waitlistMode);
  const [checked, setChecked] = useState(!waitlistMode);

  useEffect(() => {
    if (!waitlistMode) return;

    // Check for bypass cookie via API (httpOnly cookie can't be read client-side)
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
  }, [waitlistMode]);

  if (!checked) {
    return <main className="min-h-screen" />;
  }

  if (waitlistMode && !bypassed) {
    return <WaitlistLanding />;
  }

  return <MarketingHome />;
}
