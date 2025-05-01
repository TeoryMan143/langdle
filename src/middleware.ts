import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';
import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';

const csrfProtect = createCsrfProtect({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
  },
});

export default async function middleware(request: NextRequest) {
  const [, base] = request.nextUrl.pathname.split('/');

  if (request.method === 'GET' && base !== 'api') {
    const handleI18Routing = createMiddleware(routing);
    const respose = handleI18Routing(request);
    return respose;
  }
  const response = NextResponse.next();

  // csrf protection
  try {
    await csrfProtect(request, response);
  } catch (err) {
    if (err instanceof CsrfError)
      return new NextResponse('invalid csrf token', { status: 403 });
    throw err;
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!trpc|_next|_vercel|.*\\..*).*)',
};
