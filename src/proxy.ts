import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from './core/lib/session-config';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isApi = pathname.startsWith('/api');
  const isServerAction = request.headers.has('next-action');

  // Run next-intl for pages AND server actions
  if (!isApi && (request.method === 'GET' || isServerAction)) {
    const response = intlMiddleware(request);

    // Slide the cookie forward on every page view, so a user who keeps
    // playing is never signed out by an expiring cookie while the session
    // itself is still being renewed in the database.
    if (request.method === 'GET') {
      const token = request.cookies.get(SESSION_COOKIE)?.value;

      if (token) {
        response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
      }
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!trpc|_next|_vercel|.*\\..*).*)',
};
