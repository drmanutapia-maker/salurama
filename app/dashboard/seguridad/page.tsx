import { redirect } from 'next/navigation'

// El contenido real (sesiones + credenciales biométricas) se movió a
// SeccionSeguridad dentro de /dashboard/configuracion -- este redirect
// existe para no romper links ya publicados/guardados a esta URL (ej. el
// botón "Ir a activar" del banner de huella en DashboardNavClient.tsx).
export default function SeguridadRedirect() {
  redirect('/dashboard/configuracion')
}
