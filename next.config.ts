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
};

export default nextConfig;