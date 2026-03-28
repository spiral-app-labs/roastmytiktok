import { NextRequest, NextResponse } from 'next/server'
import { BYPASS_COOKIE_NAME, hasBypassAccess } from '@/lib/bypass'

export async function GET(req: NextRequest) {
  const bypassed = hasBypassAccess(req.cookies.get(BYPASS_COOKIE_NAME)?.value)
  return NextResponse.json({ subBypassed: bypassed })
}
