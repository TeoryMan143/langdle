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
