/** The query parameter that carries where to go back after signing in. */
export const NEXT_PARAM = 'next';

/**
 * The path to return to after signing in, if `value` is a safe one: an
 * internal path (`/data/es?tab=1`), never another origin (`//evil.com`,
 * `/\evil.com`, `https://…`).
 */
export function safeNextPath(value: string | null | undefined) {
  if (!value?.startsWith('/')) {
    return null;
  }

  if (value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }

  return value;
}

/** `path` with `?next=<next>` appended, or `path` alone without a next. */
export function withNext(path: string, next: string | null | undefined) {
  const safe = safeNextPath(next);

  if (!safe) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}${NEXT_PARAM}=${encodeURIComponent(safe)}`;
}

/**
 * Pages that need a session, by path (the locale is never in the URL), and
 * where a visitor without one goes. `/data/public` is the one open page of
 * `/data`; `/addpermission` only needs a session when it carries a token.
 */
function signedOutTarget(pathname: string, search: string) {
  if (pathname === '/addpermission') {
    return new URLSearchParams(search).has('token') ? '/signup' : null;
  }

  if (pathname === '/account') {
    return '/signin';
  }

  if (pathname === '/data' || pathname.startsWith('/data/')) {
    return pathname === '/data/public' ? null : '/signin';
  }

  return null;
}

/**
 * Where the proxy sends a request with no session cookie at all, or `null`
 * to let it through. Deciding there keeps the HTTP 307: once a page has
 * started streaming its `loading.tsx`, the page's own `redirect` can only
 * answer 200 and redirect from the browser. The pages still check the session
 * themselves, for cookies that are present but no longer valid.
 */
export function signedOutRedirect(pathname: string, search = '') {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const target = signedOutTarget(path, search);

  return target && withNext(target, `${path}${search}`);
}
