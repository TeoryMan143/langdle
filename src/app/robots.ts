import type { MetadataRoute } from 'next';
import { siteUrl } from '@/core/lib/seo';

// Private pages are kept out of the results by their own `noindex`, not here:
// a page disallowed in robots.txt is never fetched, so its noindex is never
// seen and it can still be listed from links alone.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: siteUrl('/sitemap.xml'),
  };
}
