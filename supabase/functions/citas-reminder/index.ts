import postgres from 'npm:postgres@3'

async function sendEmail(resendApiKey: string, opts: { to: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Salurama <citas@salurama.com>',
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  })
  if (!res.ok) {
    throw new Error(`Resend HTTP ${res.status}: ${await res.text()}`)
  }
}

function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

function buildReminderHtml(opts: {
  pacienteNombre: string
  doctorNombre: string
  fechaFormateada: string
  hora: string
  clinicAddress: string | null
}): string {
  const nombre = sanitize(opts.pacienteNombre)
  const doctor = sanitize(opts.doctorNombre)
  const address = opts.clinicAddress ? sanitize(opts.clinicAddress) : ''

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
            <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
            </td></tr>
            <tr><td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;color:#1F2937;font-size:22px;">⏰ Recordatorio de tu cita mañana</h2>
              <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola, <strong>${nombre}</strong></p>
              <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Este es un recordatorio de tu cita con el <strong>Dr. ${doctor}</strong>.</p>
              <table width="100%" cellpadding="12" style="background:#F3F4F6;border-radius:8px;margin:20px 0;">
                <tr><td style="color:#374151;font-size:14px;">
                  <strong>📅 Fecha:</strong> ${opts.fechaFormateada}<br/>
                  <strong>🕐 Hora:</strong> ${opts.hora}${address ? `<br/><strong>📍 Consultorio:</strong> ${address}` : ''}
                </td></tr>
              </table>
              <p style="margin:0;color:#6B7280;line-height:1.6;">Si ya no puedes asistir, por favor contacta directamente al consultorio.</p>
            </td></tr>
            <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama &mdash; Verifica. Elige. Confía.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

Deno.serve(async (req) => {
  // Verificar que el request viene del cron: compara el bearer contra el service_role key.
  // (No se decodifica como JWT — este proyecto usa el formato nuevo `sb_secret_...`, no JWT.)
  const authHeader = req.headers.get('Authorization')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const dbUrl = Deno.env.get('SUPABASE_DB_URL')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!dbUrl || !resendApiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing_env', dbUrl: !!dbUrl, resendApiKey: !!resendApiKey }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  const sql = postgres(dbUrl, { max: 1 })
  try {
    // Ventana de 2h (23-25h) para tolerar granularidad horaria del cron sin duplicar
    // ni saltarse citas. reminder_sent_at IS NULL evita reenvíos si el cron reintenta.
    const rows = await sql`
      SELECT c.id, c.paciente_nombre, c.paciente_email, c.fecha, c.hora,
             d.full_name AS doctor_nombre, d.clinic_address
      FROM citas c
      JOIN doctors d ON d.id = c.medico_id
      WHERE c.estado = 'confirmed'
        AND c.reminder_sent_at IS NULL
        AND (c.fecha::text || ' ' || c.hora::text || '-06:00')::timestamptz
            BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
    `

    let sent = 0
    let failed = 0

    for (const cita of rows) {
      try {
        const fechaFormateada = new Date(`${cita.fecha}T00:00:00-06:00`).toLocaleDateString('es-MX', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
        const hora = String(cita.hora).slice(0, 5)

        await sendEmail(resendApiKey, {
          to: cita.paciente_email,
          subject: `Recordatorio: tu cita mañana con ${cita.doctor_nombre}`,
          html: buildReminderHtml({
            pacienteNombre: cita.paciente_nombre,
            doctorNombre: cita.doctor_nombre,
            fechaFormateada,
            hora,
            clinicAddress: cita.clinic_address,
          }),
        })

        await sql`UPDATE citas SET reminder_sent_at = now() WHERE id = ${cita.id}`
        sent++
      } catch (err) {
        console.error(`citas-reminder: fallo en cita ${cita.id}:`, err)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ ok: true, candidatos: rows.length, enviados: sent, fallidos: failed }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('citas-reminder: error fatal:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    await sql.end()
  }
})
