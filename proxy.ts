import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_REQUIRED_PREFIXES = ['/dashboard', '/settings', '/history', '/account', '/compare', '/calendar', '/analytics'];

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isProtected && !hasSupabaseSession(request)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api routes
     * - /auth/callback
     * - /_next (Next.js internals)
     * - /favicon.ico
     * - static assets (images, fonts, etc.)
     */
    '/((?!api|auth/callback|_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
};
