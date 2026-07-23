import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Deprecado 2026-07-22: el médico ya no puede cambiar su especialidad
// principal por su cuenta (era el único llamador de este endpoint, en
// editar-perfil — bloque "Editar consejo" retirado). Ese cambio ahora solo
// lo hace un admin en /admin/medicos. Este archivo queda desactivado en vez
// de borrado (permisos de la sesión que lo escribió no permiten `rm`) —
// seguro borrarlo por completo en cualquier momento.
export async function POST() {
  return NextResponse.json({ error: 'Este endpoint fue retirado. La especialidad principal ya no se edita desde el dashboard del médico.' }, { status: 410 })
}
