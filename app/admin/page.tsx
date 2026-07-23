import { redirect } from 'next/navigation'

// /admin ya no tiene pantalla propia — toda la gestión de médicos y sus
// estadísticas viven en /admin/medicos (ver history: tener dos paneles
// separados fue lo que causó que se desincronizaran). La autenticación de
// admin ya la resuelve app/admin/layout.tsx (portero server-side) ANTES de
// que este componente se ejecute, así que solo hace falta mandar al destino
// real — un usuario sin sesión de admin nunca llega hasta aquí, el layout ya
// lo redirigió a "/".
export default function AdminPage() {
  redirect('/admin/medicos')
}
