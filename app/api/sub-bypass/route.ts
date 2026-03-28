import { NextRequest, NextResponse } from 'next/server'
import { BYPASS_COOKIE_NAME } from '@/lib/bypass'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.BYPASS_PASSWORD) {
    return NextResponse.json({ error: 'Invalid' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(BYPASS_COOKIE_NAME, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  res.cookies.set('rmt_paid_bypass', '1', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
