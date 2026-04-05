'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion'

function LoginForm() {
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/dashboard'
  const intent = params.get('intent')
  const plan = params.get('plan')
  const isSubscribeIntent = intent === 'subscribe'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    })
    if (error) setError(error.message)
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#080808] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/8 via-pink-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-gradient-to-t from-red-500/5 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          <Link href="/" className="flex items-center gap-2 mb-3">
            <span className="text-3xl">🔥</span>
            <span className="text-2xl font-black bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent">
              RoastMyTikTok
            </span>
          </Link>
          <p className="text-zinc-600 text-sm">The analysis-first AI content coach</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-8 shadow-2xl shadow-black/50"
        >
          {isSubscribeIntent && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
              <p className="text-sm font-semibold text-orange-400">
                {plan === 'yearly' ? '🔥 Yearly beta plan selected' : '🔥 Monthly beta plan selected'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Sign in to save your plan choice and continue beta onboarding. billing is activated after sign-in, not through a fake checkout screen.</p>
            </div>
          )}
          <h1 className="text-xl font-bold text-white text-center mb-6">
            {isSubscribeIntent ? 'Sign in to continue to beta onboarding' : 'Sign in to continue'}
          </h1>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="text-5xl mb-4">📬</div>
              <p className="text-white font-semibold mb-1">Check your email</p>
              <p className="text-zinc-500 text-sm">
                Magic link sent to{' '}
                <span className="text-zinc-300">{email}</span>
              </p>
            </motion.div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 active:scale-[0.98] transition-all mb-6 shadow-md"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-900/60 px-3 text-zinc-600">or use email</span>
                </div>
              </div>

              {/* Magic link */}
              <form onSubmit={signInWithEmail} className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full px-4 py-3 rounded-xl fire-gradient text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send magic link'
                  )}
                </button>
              </form>

              <p className="text-[11px] text-zinc-600 text-center mt-5 leading-relaxed">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-zinc-400 hover:text-orange-400 underline underline-offset-2 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-zinc-400 hover:text-orange-400 underline underline-offset-2 transition-colors">
                  Privacy Policy
                </Link>.
              </p>
            </>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-zinc-600 text-xs mt-6"
        >
          <Link href="/" className="text-zinc-500 hover:text-orange-400 transition-colors">
            ← Back to home
          </Link>
        </motion.p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
