// Backfill de cifrado para chat_mensajes/chat_archivos (Parte 5 del proyecto
// de cifrado del chat médico-paciente). Cifra lo que quedó en texto plano /
// binario original antes de que las rutas API empezaran a cifrar.
//
// Idempotente: cada fila se re-evalúa contra el mismo criterio que usa el
// código de lectura en producción (mensajes: prefijo "v1."; archivos: si
// descifrarBuffer() falla, no está cifrado) — correrlo dos veces no hace
// nada la segunda vez.
//
// Modo dry-run por defecto (solo reporta, no modifica nada). Usa --apply
// para aplicar los cambios de verdad. Usa --sala-id=<uuid> para limitar el
// alcance a una sola sala (útil para pruebas o para revisar una conversación
// puntual sin tocar el resto).
//
// IMPORTANTE: correr con --apply solo después de que el código de las
// Partes 0-4 ya esté desplegado en producción — si se corre antes, deja
// mensajes/archivos existentes cifrados mientras el código viejo en
// producción todavía no sabe descifrarlos.
//
// Uso:
//   npx tsx scripts/backfill-chat-encryption.ts                    (dry-run, todo)
//   npx tsx scripts/backfill-chat-encryption.ts --apply             (aplica, todo)
//   npx tsx scripts/backfill-chat-encryption.ts --apply --sala-id=<uuid>  (aplica, una sala)

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { cifrar, cifrarBuffer, descifrarBuffer } from '@/lib/chat/crypto'

const APPLY = process.argv.includes('--apply')
const SALA_ID_FLAG = process.argv.find(a => a.startsWith('--sala-id='))
const SALA_ID = SALA_ID_FLAG ? SALA_ID_FLAG.split('=')[1] : null
const BATCH_SIZE = 500

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function registrarLog(tabla: 'chat_mensajes' | 'chat_archivos', filaId: string) {
  const { error } = await supabase.from('chat_backfill_cifrado_log').insert({ tabla, fila_id: filaId })
  if (error) {
    console.error(`  ! No se pudo registrar en el log de auditoría (${tabla}/${filaId}):`, error.message)
  }
}

async function backfillMensajes() {
  console.log('\n=== chat_mensajes ===')
  let desde = 0
  let totalPendientes = 0
  let totalMigrados = 0

  while (true) {
    let query = supabase
      .from('chat_mensajes')
      .select('id, contenido')
      .order('created_at', { ascending: true })
      .range(desde, desde + BATCH_SIZE - 1)
    if (SALA_ID) query = query.eq('sala_id', SALA_ID)

    const { data, error } = await query
    if (error) throw new Error(`select chat_mensajes: ${error.message}`)
    if (!data || data.length === 0) break

    for (const fila of data) {
      if (fila.contenido.startsWith('v1.')) continue // ya cifrado

      totalPendientes++
      console.log(`  pendiente: ${fila.id}`)

      if (APPLY) {
        const { error: updateError } = await supabase
          .from('chat_mensajes')
          .update({ contenido: cifrar(fila.contenido) })
          .eq('id', fila.id)
        if (updateError) {
          console.error(`  ! Error cifrando mensaje ${fila.id}:`, updateError.message)
          continue
        }
        await registrarLog('chat_mensajes', fila.id)
        totalMigrados++
      }
    }

    if (data.length < BATCH_SIZE) break
    desde += BATCH_SIZE
  }

  console.log(`  Total pendientes: ${totalPendientes}${APPLY ? ` (migrados: ${totalMigrados})` : ' (dry-run, nada se modificó)'}`)
}

async function backfillArchivos() {
  console.log('\n=== chat_archivos ===')
  let desde = 0
  let totalPendientes = 0
  let totalMigrados = 0

  while (true) {
    let query = supabase
      .from('chat_archivos')
      .select('id, storage_path')
      .order('created_at', { ascending: true })
      .range(desde, desde + BATCH_SIZE - 1)
    if (SALA_ID) query = query.eq('sala_id', SALA_ID)

    const { data, error } = await query
    if (error) throw new Error(`select chat_archivos: ${error.message}`)
    if (!data || data.length === 0) break

    for (const fila of data) {
      const { data: descargado, error: downloadError } = await supabase.storage
        .from('chat-archivos')
        .download(fila.storage_path)
      if (downloadError || !descargado) {
        console.error(`  ! No se pudo descargar ${fila.id} (${fila.storage_path}):`, downloadError?.message)
        continue
      }
      const bufferCrudo = Buffer.from(await descargado.arrayBuffer())

      let yaEstaCifrado = true
      try {
        descifrarBuffer(bufferCrudo)
      } catch {
        yaEstaCifrado = false
      }
      if (yaEstaCifrado) continue

      totalPendientes++
      console.log(`  pendiente: ${fila.id} (${fila.storage_path})`)

      if (APPLY) {
        const bufferCifrado = cifrarBuffer(bufferCrudo)
        const { error: uploadError } = await supabase.storage
          .from('chat-archivos')
          .upload(fila.storage_path, bufferCifrado, { contentType: 'application/octet-stream', upsert: true })
        if (uploadError) {
          console.error(`  ! Error cifrando archivo ${fila.id}:`, uploadError.message)
          continue
        }
        await registrarLog('chat_archivos', fila.id)
        totalMigrados++
      }
    }

    if (data.length < BATCH_SIZE) break
    desde += BATCH_SIZE
  }

  console.log(`  Total pendientes: ${totalPendientes}${APPLY ? ` (migrados: ${totalMigrados})` : ' (dry-run, nada se modificó)'}`)
}

async function main() {
  console.log(
    APPLY
      ? `MODO: aplicando cambios reales (--apply)${SALA_ID ? ` — limitado a sala ${SALA_ID}` : ''}`
      : 'MODO: dry-run (solo reporte, nada se modifica — usa --apply para ejecutar de verdad)'
  )
  await backfillMensajes()
  await backfillArchivos()
}

main().catch(err => {
  console.error('ERROR:', err)
  process.exit(1)
})
