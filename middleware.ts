import { NextRequest, NextResponse } from 'next/server';

// Routes that should be accessible without bypass
const PUBLIC_PATHS = [
  '/waitlist',
  '/bypass',
  '/api/bypass',
];

const ASSET_PREFIXES = [
  '/_next',
  '/favicon.ico',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static assets and Next.js internals
  if (ASSET_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Check for bypass cookie
  const bypassed = req.cookies.get('rmt_bypass')?.value === '1';

  if (!bypassed) {
    // Redirect to waitlist
    const url = req.nextUrl.clone();
    url.pathname = '/waitlist';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
