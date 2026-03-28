import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const bypassed = req.cookies.get('rmt_sub_bypass')?.value === '1'
  return NextResponse.json({ subBypassed: bypassed })
}
