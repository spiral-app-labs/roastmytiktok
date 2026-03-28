'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import UploadUI from '@/components/UploadUI'

export default function DashboardPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAccess() {
      // Check sub bypass cookie
      try {
        const bypassRes = await fetch('/api/sub-bypass/check')
        const bypassData = await bypassRes.json()
        if (bypassData.subBypassed) {
          setAuthorized(true)
          setChecking(false)
          return
        }
      } catch {
        // ignore
      }

      // Check Supabase session
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setAuthorized(true)
        setUserEmail(session.user.email ?? null)
        setChecking(false)
        return
      }

      // Neither — redirect to login
      router.push('/login?redirect=/dashboard')
    }

    checkAccess()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (checking) {
    return <main className="min-h-screen bg-[#080808]" />
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Dashboard header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <span className="font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            RoastMyTikTok
          </span>
        </div>
        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="text-sm text-zinc-500">{userEmail}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-4 py-1.5 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Upload UI */}
      <UploadUI />
    </div>
  )
}
