import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const bypass = request.cookies.get('rmt_bypass');

  if (bypass) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/waitlist';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /waitlist (the public pre-launch page)
     * - /bypass (password entry page)
     * - /api/bypass (bypass API routes)
     * - /_next (Next.js internals)
     * - /favicon.ico
     * - static assets (images, fonts, etc.)
     */
    '/((?!waitlist|bypass|api/bypass|_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
};
