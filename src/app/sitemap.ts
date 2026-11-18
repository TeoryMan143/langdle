import type { MetadataRoute } from 'next';
import { siteUrl } from '@/core/lib/seo';

// One URL per page: the locale is negotiated (`localePrefix: 'never'`), so
// there are no per-locale alternates to list.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: siteUrl('/howtoplay'), changeFrequency: 'monthly', priority: 0.8 },
    {
      url: siteUrl('/data/public'),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];
}
