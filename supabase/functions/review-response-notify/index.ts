import postgres from 'npm:postgres@3'

async function sendEmail(resendApiKey: string, opts: { to: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Salurama <resenas@salurama.com>',
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

// A propósito NUNCA incluye el texto de la respuesta — solo el aviso y un
// link a la reseña en el perfil público (Parte 2, punto 9).
function buildNotifyHtml(opts: { pacienteNombre: string; doctorNombre: string; reviewUrl: string }): string {
  const nombre = sanitize(opts.pacienteNombre)
  const doctor = sanitize(opts.doctorNombre)

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
              <h2 style="margin:0 0 16px;color:#1F2937;font-size:22px;">💬 Tu médico respondió tu reseña</h2>
              <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola, <strong>${nombre}</strong></p>
              <p style="margin:0 0 24px;color:#6B7280;line-height:1.6;">El <strong>Dr. ${doctor}</strong> respondió la reseña que dejaste. Puedes leerla en su perfil.</p>
              <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:50px;background:#1E3A5F;">
                <a href="${opts.reviewUrl}" style="display:inline-block;padding:14px 28px;color:white;text-decoration:none;font-size:14px;font-weight:600;">Ver la respuesta</a>
              </td></tr></table>
            </td></tr>
            <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

Deno.serve(async (req) => {
  // Mismo esquema de auth que citas-reminder: el gateway exige un
  // Authorization con formato reconocido para dejar pasar la petición, la
  // verificación real es el header dedicado X-Cron-Secret.
  const cronHeader = req.headers.get('X-Cron-Secret')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronHeader || !cronSecret || cronHeader !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const dbUrl = Deno.env.get('DB_POOLER_URL')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!dbUrl || !resendApiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing_env', dbUrl: !!dbUrl, resendApiKey: !!resendApiKey }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  let sql: ReturnType<typeof postgres>
  try {
    sql = postgres(dbUrl, { max: 1, prepare: false })
  } catch (err) {
    console.error('review-response-notify: error creando conexión:', err)
    return new Response(
      JSON.stringify({ ok: false, error: 'db_connect_failed', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  try {
    // Cron cada 5 min + umbral de 10 min ⇒ el envío real cae entre 10 y 15
    // min después de creada la respuesta. Si el médico la borra antes de que
    // el cron la recoja, la fila ya no existe aquí — el aviso queda
    // cancelado sin necesitar un mecanismo aparte (punto 8).
    const rows = await sql`
      SELECT rr.id AS response_id, c.paciente_nombre, c.paciente_email,
             d.full_name AS doctor_nombre, d.slug AS doctor_slug, r.id AS review_id
      FROM review_responses rr
      JOIN reviews r ON r.id = rr.review_id
      JOIN citas c ON c.id = r.cita_id
      JOIN doctors d ON d.id = rr.doctor_id
      WHERE rr.notified_at IS NULL
        AND rr.created_at <= now() - interval '10 minutes'
    `

    let sent = 0
    let failed = 0

    for (const row of rows) {
      try {
        await sendEmail(resendApiKey, {
          to: row.paciente_email,
          subject: `${row.doctor_nombre} respondió tu reseña`,
          html: buildNotifyHtml({
            pacienteNombre: row.paciente_nombre,
            doctorNombre: row.doctor_nombre,
            reviewUrl: `https://salurama.com/doctor/${row.doctor_slug}#review-${row.review_id}`,
          }),
        })

        await sql`UPDATE review_responses SET notified_at = now() WHERE id = ${row.response_id}`
        sent++
      } catch (err) {
        console.error(`review-response-notify: fallo en respuesta ${row.response_id}:`, err)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ ok: true, candidatos: rows.length, enviados: sent, fallidos: failed }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('review-response-notify: error fatal:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    await sql.end()
  }
})
