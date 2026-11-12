import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://pwcdwxhfypaxvtqydzcg.supabase.co https://challenges.cloudflare.com; connect-src 'self' https://pwcdwxhfypaxvtqydzcg.supabase.co wss://pwcdwxhfypaxvtqydzcg.supabase.co https://challenges.cloudflare.com; img-src 'self' data: blob: https://pwcdwxhfypaxvtqydzcg.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        ],
      },
      {
        // Los íconos de notificaciones push (public/sw.js) se descargan justo
        // en el momento de mostrar la notificación — a diferencia del resto
        // de /public, que Next.js sirve con max-age=0 (siempre revalida), a
        // estos les conviene quedar cacheados de forma permanente en el
        // navegador tras la primera descarga, para que solo la primera
        // notificación de cada dispositivo corra el riesgo de perder la
        // carrera contra el tiempo de espera del sistema operativo. Si el
        // ícono cambia alguna vez, hay que renombrar el archivo (mismo
        // criterio que los assets con hash de /_next/static/).
        source: '/notification-(icon|badge).png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/politica-de-cancelacion',
        destination: '/politica-cancelacion',
        permanent: true,
      },
      {
        source: '/medicos',
        destination: '/buscar',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;