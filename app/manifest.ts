import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Salurama: Directorio médico en México',
    short_name: 'Salurama',
    description: 'Directorio médico en México. Verifica credenciales, lee reseñas y agenda tu cita.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F9FAFB',
    theme_color: '#1E3A5F',
    icons: [
      // 'sizes: any' es para iconos vectoriales -- en un PNG de tamano fijo
      // Chrome puede no reconocerlo como el icono grande (512x512, minimo
      // exigido para poder instalar), asi que se declara el tamano real.
      { src: '/favicon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
