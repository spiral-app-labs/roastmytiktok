import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/bypass', '/api/bypass'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Check for bypass cookie
  const bypassed = req.cookies.get('rmt_bypass')?.value === '1';

  if (!bypassed) {
    const url = req.nextUrl.clone();
    url.pathname = '/bypass';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_next).*)'],
};
