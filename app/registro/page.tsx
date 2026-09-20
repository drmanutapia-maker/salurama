import type { Metadata } from 'next'
import RegistroMedicoClient from './RegistroMedicoClient'

// La página real es un Client Component ('use client' en RegistroMedicoClient.tsx
// -- necesita estado de formulario, useEffect, etc.) y un Client Component no
// puede exportar `metadata` en el App Router. Sin este wrapper de Server
// Component, esta ruta heredaba el <title> por default del layout raíz
// ("Salurama. Verifica. Elige. Confía.") -- así fue como terminó siendo el
// texto de un sitelink de Google que en realidad lleva al registro de
// médicos, sin comunicar esa acción.
export const metadata: Metadata = {
  title: 'Registro médico',
  description: 'Estamos construyendo el directorio médico de México 100% gratuito. Regístrate, crea tu perfil verificable con tu cédula profesional, recibe reseñas de pacientes reales y recibe citas directo en tu agenda.',
}

export default function RegistroPage() {
  return <RegistroMedicoClient />
}
