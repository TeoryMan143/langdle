import type { Metadata } from 'next';

/** Absolute URL of a path on the public site, for crawlers and JSON-LD. */
export function siteUrl(path = '/') {
  return new URL(path, process.env.NEXT_PUBLIC_BASE_URL).toString();
}

/**
 * Metadata for pages that only make sense to a signed-in user or mid-flow
 * (auth, account, admin). They stay crawlable, so crawlers can read the
 * noindex, but never show up in search results.
 */
export const NO_INDEX: Metadata = {
  robots: { index: false, follow: true },
};
