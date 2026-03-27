'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BypassPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      router.push('/');
      router.refresh();
    } else {
      setError('Wrong password.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-2xl font-bold text-white">Early Access</h1>
        <p className="text-zinc-400 text-sm">Enter the password to skip the waitlist.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full fire-gradient text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  );
}
