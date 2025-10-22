import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAppRoute = path.startsWith('/app');
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup');

  // Check for auth token in cookie (we'll set this on the client)
  const authCookie = request.cookies.get('hive_authenticated');
  const isAuthenticated = authCookie?.value === 'true';

  // Redirect unauthenticated users trying to access app routes
  if (isAppRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/signup'],
};
