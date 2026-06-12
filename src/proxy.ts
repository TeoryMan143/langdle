import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isApi = pathname.startsWith('/api');
  const isServerAction = request.headers.has('next-action');

  // Run next-intl for pages AND server actions
  if (!isApi && (request.method === 'GET' || isServerAction)) {
    const response = intlMiddleware(request);

    if (request.method === 'GET') {
      const token = request.cookies.get('session')?.value;

      if (token) {
        response.cookies.set('session', token, {
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
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
