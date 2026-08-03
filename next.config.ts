import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@salurama/hema-shared',
    '@salurama/hema-validator',
    '@salurama/hema-pdf',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pwcdwxhfypaxvtqydzcg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;