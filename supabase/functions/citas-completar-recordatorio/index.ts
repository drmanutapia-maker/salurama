import postgres from 'npm:postgres@3'

Deno.serve(async (req) => {
  // Mismo esquema de auth que citas-reminder y citas-reminder-2h: header
  // dedicado X-Cron-Secret contra CRON_SECRET (no Authorization — el gateway
  // de Supabase exige ahí un JWT reconocido antes de que la petición llegue
  // al código, sin importar verify_jwt).
  const cronHeader = req.headers.get('X-Cron-Secret')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronHeader || !cronSecret || cronHeader !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const dbUrl = Deno.env.get('DB_POOLER_URL')
  const internalSecret = Deno.env.get('INTERNAL_API_SECRET')
  const appUrl = Deno.env.get('NEXT_PUBLIC_URL') || 'https://salurama.com'

  if (!dbUrl || !internalSecret) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing_env', dbUrl: !!dbUrl, internalSecret: !!internalSecret }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // prepare: false — requisito del modo transacción del pooler (Supavisor):
  // no soporta prepared statements, cada conexión puede caer en un backend
  // de Postgres distinto entre queries.
  let sql: ReturnType<typeof postgres>
  try {
    sql = postgres(dbUrl, { max: 1, prepare: false })
  } catch (err) {
    console.error('[completar-recordatorio] error creando conexión:', err)
    return new Response(
      JSON.stringify({ ok: false, error: 'db_connect_failed', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    // Ventana de 30min centrada en 2h después de la cita (1h45-2h15 pasados).
    // completar_reminder_sent_at IS NULL evita reenvíos si el cron reintenta.
    const rows = await sql`
      SELECT
        c.id,
        c.paciente_nombre,
        c.fecha,
        c.hora,
        d.id    AS medico_id,
        d.email AS medico_email
      FROM citas c
      JOIN doctors d ON d.id = c.medico_id
      WHERE c.estado = 'confirmed'
        AND c.completar_reminder_sent_at IS NULL
        AND (c.fecha::text || ' ' || c.hora::text || '-06:00')::timestamptz
            BETWEEN now() - interval '2 hours 15 minutes'
                AND now() - interval '1 hour 45 minutes'
    `

    let procesadas = 0

    for (const cita of rows) {
      try {
        const res = await fetch(`${appUrl}/api/citas/recordatorio-completar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': internalSecret,
          },
          body: JSON.stringify({
            citaId: cita.id,
            medicoId: cita.medico_id,
            pacienteNombre: cita.paciente_nombre,
            medicoEmail: cita.medico_email,
          }),
        })

        if (!res.ok) {
          console.error(`[completar-recordatorio] API respondió ${res.status} para cita ${cita.id}`)
          continue
        }

        await sql`
          UPDATE citas
          SET completar_reminder_sent_at = now()
          WHERE id = ${cita.id}
        `

        procesadas++
      } catch (err) {
        console.error(`[completar-recordatorio] fallo en cita ${cita.id}:`, err)
      }
    }

    return new Response(
      JSON.stringify({ ok: true, candidatas: rows.length, procesadas }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[completar-recordatorio] error fatal:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  } finally {
    await sql.end()
  }
})
