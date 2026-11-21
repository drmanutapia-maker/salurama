import localFont from 'next/font/local'

// Archivos woff2 descargados de Google Fonts (subset latin).
// Ambas son fuentes variables: un solo archivo cubre todos los pesos.
export const fraunces = localFont({
  src: [
    { path: '../public/fonts/fraunces.woff2', weight: '600 900', style: 'normal' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
})

export const dmSans = localFont({
  src: [
    { path: '../public/fonts/dm-sans.woff2', weight: '300 700', style: 'normal' },
  ],
  variable: '--font-dm-sans',
  display: 'swap',
})
