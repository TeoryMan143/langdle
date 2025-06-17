import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';

export default async function middleware(request: NextRequest) {
  const [, base] = request.nextUrl.pathname.split('/');

  if (request.method === 'POST') {
    console.log(request);
    return NextResponse.next();
  }

  const response = NextResponse.next();

  if (request.method === 'GET') {
    const token = request.cookies.get('session')?.value ?? null;
    if (token !== null) {
      response.cookies.set('session', token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  if (request.method === 'GET' && base !== 'api') {
    const handleI18Routing = createMiddleware(routing);
    const respose = handleI18Routing(request);
    return respose;
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!trpc|_next|_vercel|.*\\..*).*)',
};
