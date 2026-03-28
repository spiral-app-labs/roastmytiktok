import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== 'tiktok2026') {
    return NextResponse.json({ error: 'Invalid' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('rmt_sub_bypass', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
