import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  BYPASS_COOKIE_NAME,
  BYPASS_ENTRY_PATH,
  BYPASS_SUCCESS_PATH,
  hasBypassAccess,
} from '@/lib/bypass';

// Routes that require auth (bypass cookie OR Supabase session)
const AUTH_REQUIRED_PREFIXES = ['/dashboard', '/settings', '/history', '/account'];

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );
}

function isAuthenticated(request: NextRequest): boolean {
  return hasBypassAccess(request.cookies.get(BYPASS_COOKIE_NAME)?.value)
    || hasSupabaseSession(request);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const bypassed = hasBypassAccess(request.cookies.get(BYPASS_COOKIE_NAME)?.value);

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = bypassed ? BYPASS_SUCCESS_PATH : BYPASS_ENTRY_PATH;
    if (!bypassed) {
      url.searchParams.set('next', pathname + search);
    }
    return NextResponse.redirect(url);
  }

  if (pathname === BYPASS_ENTRY_PATH) {
    if (bypassed) {
      const destination = request.nextUrl.searchParams.get('next');
      const url = request.nextUrl.clone();
      url.pathname = destination?.startsWith('/') ? destination : BYPASS_SUCCESS_PATH;
      url.search = '';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Protected routes: require bypass OR Supabase auth
  const isProtected = AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isProtected && !isAuthenticated(request)) {
    const url = request.nextUrl.clone();
    url.pathname = BYPASS_ENTRY_PATH;
    url.search = '';
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  if (bypassed) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = BYPASS_ENTRY_PATH;
  url.search = '';
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /bypass (password entry page)
     * - /api/bypass (bypass API routes)
     * - /_next (Next.js internals)
     * - /favicon.ico
     * - static assets (images, fonts, etc.)
     */
    '/((?!bypass|api/bypass|_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
};
