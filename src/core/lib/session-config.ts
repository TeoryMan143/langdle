/**
 * Everything about the shape and lifetime of a session, with no runtime
 * dependency: the proxy (edge middleware), the hono controller and the
 * `next/headers` helpers in `session.ts` all read it from here. A session
 * cookie written with anything other than `sessionCookieOptions` is a bug —
 * that is how the proxy ended up refreshing a cookie that never existed.
 */

export const SESSION_COOKIE = 'sessionToken';

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export function getSessionExpiry() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function sessionCookieOptions(expiresAt: Date = getSessionExpiry()) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  };
}
