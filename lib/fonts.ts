import { Fraunces, DM_Sans } from 'next/font/google'

// Auto-hospedadas por next/font (sin request a fonts.googleapis.com en
// runtime). Modo `variable`: exponen una custom property que cualquier
// estilo inline descendiente puede referenciar con var(--font-...), en vez
// de tener que aplicar .className a cada elemento individual.
export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '900'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})
