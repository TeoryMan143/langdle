import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ClientRequestInfo } from '@/core/types';

type HeaderGetter = (name: string) => string | null | undefined;

/** The headers that describe a client; the `x-vercel-ip-*` ones are Vercel's. */
const CLIENT_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'user-agent',
  'accept-language',
  'referer',
  'x-vercel-ip-country',
  'x-vercel-ip-country-region',
  'x-vercel-ip-city',
  'x-vercel-ip-latitude',
  'x-vercel-ip-longitude',
  'x-vercel-ip-timezone',
] as const;

type ClientHeader = (typeof CLIENT_HEADERS)[number];

/**
 * A server action calls the API from the server, and the edge in front of the
 * API overwrites the standard headers with the server's own, so the browser's
 * travel under this prefix instead.
 */
const FORWARDED_PREFIX = 'x-langdle-client-';
const FORWARD_KEY_HEADER = 'x-langdle-forward-key';

/** Long enough for any real user agent, short enough to keep a log small. */
const MAX_HEADER_LENGTH = 512;

/**
 * Proves a forwarded set of headers comes from our own server: anyone could
 * send them otherwise and choose the IP they are logged with.
 */
function forwardKey() {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update('langdle-client-forward')
    .digest('base64url');
}

function isTrustedForward(get: HeaderGetter) {
  const key = get(FORWARD_KEY_HEADER);

  if (!key) {
    return false;
  }

  const given = Buffer.from(key);
  const expected = Buffer.from(forwardKey());

  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The headers a server action adds to its API request so the API logs the
 * browser instead of the server: the client headers of the incoming request,
 * renamed, plus the key that makes the API trust them.
 */
export function forwardClientHeaders(get: HeaderGetter) {
  const headers: Record<string, string> = {
    [FORWARD_KEY_HEADER]: forwardKey(),
  };

  for (const name of CLIENT_HEADERS) {
    const value = get(name);

    if (value) {
      headers[`${FORWARDED_PREFIX}${name}`] = value;
    }
  }

  return headers;
}

/** Vercel URI-encodes the city (`S%C3%A3o%20Paulo`). */
function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function coordinate(value: string | undefined) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Describes the client of an API request: the forwarded headers of a server
 * action when it carries a valid key, the request's own headers otherwise
 * (the mobile app, or anything else calling the API directly).
 */
export function readClientInfo(get: HeaderGetter): ClientRequestInfo {
  const prefix = isTrustedForward(get) ? FORWARDED_PREFIX : '';

  const read = (name: ClientHeader) => {
    const value = get(`${prefix}${name}`)?.trim();
    return value ? value.slice(0, MAX_HEADER_LENGTH) : undefined;
  };

  // The first address is the client's; the rest are the proxies it went through.
  const ip =
    read('x-forwarded-for')?.split(',')[0]?.trim() || read('x-real-ip');
  const city = read('x-vercel-ip-city');

  return {
    ip,
    userAgent: read('user-agent'),
    acceptLanguage: read('accept-language'),
    referer: read('referer'),
    country: read('x-vercel-ip-country'),
    region: read('x-vercel-ip-country-region'),
    city: city && decode(city),
    latitude: coordinate(read('x-vercel-ip-latitude')),
    longitude: coordinate(read('x-vercel-ip-longitude')),
    timezone: read('x-vercel-ip-timezone'),
  };
}
