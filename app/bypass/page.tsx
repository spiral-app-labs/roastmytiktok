'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function BypassForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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
      const nextPath = searchParams.get('next');
      const destination = nextPath?.startsWith('/') ? nextPath : '/dashboard';
      router.push(destination);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || 'Wrong password.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,146,60,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(236,72,153,0.1),transparent)]" />
      </div>

      <div className="relative z-10 max-w-sm w-full text-center space-y-8">
        <span className="text-5xl">🔥</span>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              RoastMyTikTok
            </span>
          </h1>
          <p className="text-zinc-400 text-sm">Enter the password to access early preview.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-sm"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 text-sm"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function BypassPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#080808]" />}>
      <BypassForm />
    </Suspense>
  );
}
