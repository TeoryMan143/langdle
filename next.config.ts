import './src/core/env';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // iOS only reads the association file when it is served as JSON.
  headers: async () => [
    {
      source: '/.well-known/apple-app-site-association',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
    },
  ],
  // Language requests carry a flag image (2 MB max) through a server action.
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  webpack: config => {
    config.externals.push('@node-rs/argon2', '@node-rs/bcrypt');
    return config;
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
