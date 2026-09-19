import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/command', '/warehouse', '/driver'];
// Routes that camp officers can access via /field
// Note: /field is also protected but via role check, not blanket redirect

/**
 * SETU Route Protection Middleware
 *
 * LOCAL_ADAPTER: In production, validate the Cognito JWT from cookies/headers
 * instead of the sessionStorage check. Middleware runs on the edge and cannot
 * read sessionStorage directly — use HTTP-only cookies for the session in prod.
 *
 * For local dev, we use a simple cookie (setu_session_exists) that the login
 * page sets/clears as a signal to middleware. The actual session data stays in
 * sessionStorage (client-only). This is acceptable for a hackathon demo.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie (set by login page after successful auth)
  const sessionCookie = request.cookies.get('setu_session');

  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route)) ||
    pathname.startsWith('/field') ||
    pathname.startsWith('/warehouse') ||
    pathname.startsWith('/driver');

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/command/:path*', '/field/:path*', '/warehouse/:path*', '/driver/:path*'],
};
