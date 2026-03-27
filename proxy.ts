import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const waitlistMode = process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true';
  const hasBypass = request.cookies.get('rmt_bypass')?.value === '1';
  const { pathname } = request.nextUrl;

  // If waitlist mode is off or user has bypass, let everything through
  if (!waitlistMode || hasBypass) {
    return NextResponse.next();
  }

  // Allow these routes through even in waitlist mode
  const allowedPaths = ['/bypass', '/api/', '/_next/', '/favicon.ico'];
  if (allowedPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // The home page handles its own waitlist rendering via env var check,
  // so let it through
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Block all other routes — redirect to home (which shows waitlist)
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
