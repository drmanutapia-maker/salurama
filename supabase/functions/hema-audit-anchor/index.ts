import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import postgres from 'npm:postgres@3'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Acepta tanto JWT clásico (payload.role === 'service_role') como el formato
// nuevo de llaves de Supabase (sb_secret_.../sb_publishable_...), que no son
// JWT — decodificarlas con atob(token.split('.')[1]) truena sin capturar
// (mismo bug ya corregido en citas-reminder el 2026-08-04). Nunca lanza: un
// token con formato inesperado simplemente no cuenta como service_role.
function isServiceRoleToken(authHeader: string): boolean {
  const token = authHeader.replace('Bearer ', '')

  if (token.startsWith('sb_secret_')) return true
  if (token.startsWith('sb_publishable_')) return false

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  // Verificar que el request viene del cron (service_role ya validado por el runtime)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !isServiceRoleToken(authHeader)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const dbUrl = Deno.env.get('DB_POOLER_URL')!

  // Anchor covers yesterday's entries — cron fires at 00:01 UTC so "yesterday"
  // is unambiguous and all prior day's writes are already committed.
  const today = new Date()
  const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1))
  const anchorDate = yesterday.toISOString().slice(0, 10)

  // prepare: false — requisito del modo transacción del pooler (Supavisor):
  // no soporta prepared statements, cada conexión puede caer en un backend
  // de Postgres distinto entre queries.
  let sql: ReturnType<typeof postgres>
  try {
    sql = postgres(dbUrl, { max: 1, prepare: false })
  } catch (err) {
    console.error('hema-audit-anchor: error creando conexión:', err)
    return new Response(
      JSON.stringify({ ok: false, error: 'db_connect_failed', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  try {
    // Idempotent: pg_cron could retry on transient failure
    const [existing] = await sql`
      SELECT id FROM hema.audit_anchors
      WHERE anchor_date = ${anchorDate}::date
    `
    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'already_anchored', anchorDate }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Period start: day after the last anchor, or epoch if this is the first run
    const [lastAnchor] = await sql`
      SELECT (anchor_date + interval '1 day')::date::text AS next_start
      FROM hema.audit_anchors
      ORDER BY anchor_date DESC
      LIMIT 1
    `
    const periodFrom = lastAnchor
      ? `${lastAnchor.next_start}T00:00:00.000Z`
      : '2000-01-01T00:00:00.000Z'
    const periodTo = `${anchorDate}T23:59:59.999Z`

    // Fetch all audit entries in the period, ordered for deterministic hashing
    const entries = await sql`
      SELECT
        id, tenant_id, user_id, action, entity, entity_id,
        before_json, after_json, ip_address, user_agent,
        prev_row_hash, row_hash, created_at
      FROM hema.audit_log
      WHERE created_at >= ${periodFrom}::timestamptz
        AND created_at <= ${periodTo}::timestamptz
      ORDER BY created_at ASC, id ASC
    `

    // Cumulative SHA-256: hash all per-row hashes concatenated in order.
    // If any row_hash was tampered with (RULE-protected but belt-and-suspenders),
    // the cumulative hash changes → detected on verification.
    const encoder = new TextEncoder()
    const combined = entries.map((e: { row_hash: string }) => e.row_hash).join('')
    const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combined))
    const digestBytes = new Uint8Array(digestBuffer)
    const digestHex = Array.from(digestBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const snapshot = {
      schema_version: 1,
      anchor_date: anchorDate,
      period_from: periodFrom,
      period_to: periodTo,
      entry_count: entries.length,
      cumulative_hash: digestHex,
      generated_at: new Date().toISOString(),
      entries,
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const snapshotPath = `${anchorDate}/snapshot.json`

    const { error: uploadErr } = await supabase.storage
      .from('hema-audit-anchors')
      .upload(snapshotPath, JSON.stringify(snapshot, null, 2), {
        contentType: 'application/json',
        upsert: false,
      })
    if (uploadErr) throw new Error(`Storage snapshot: ${uploadErr.message}`)

    // POST raw 32-byte SHA-256 digest to OpenTimestamps calendar pool.
    // Response is an incomplete OTS proof binary (~2 KB).
    // The proof upgrades to "complete" automatically when Bitcoin confirms
    // the Merkle tree root (~1 h). Verifiable offline with: ots verify proof.ots
    // OTS failure is non-fatal — Storage hash chain is already tamper-evident.
    let otsProofB64: string | null = null
    try {
      const otsRes = await fetch('https://a.pool.opentimestamps.org/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: digestBytes,
      })
      if (otsRes.ok) {
        const otsBytes = new Uint8Array(await otsRes.arrayBuffer())
        otsProofB64 = toBase64(otsBytes)
        await supabase.storage
          .from('hema-audit-anchors')
          .upload(`${anchorDate}/proof.ots`, otsBytes, {
            contentType: 'application/octet-stream',
            upsert: false,
          })
      } else {
        console.warn(`OTS HTTP ${otsRes.status} — proceeding without blockchain anchor`)
      }
    } catch (otsErr) {
      console.warn('OTS non-fatal error:', otsErr)
    }

    // RULE prevents UPDATE/DELETE on this table (including service_role)
    await sql`
      INSERT INTO hema.audit_anchors (anchor_date, row_hash, storage_path, ots_proof)
      VALUES (${anchorDate}::date, ${digestHex}, ${snapshotPath}, ${otsProofB64})
    `

    return new Response(
      JSON.stringify({
        ok: true,
        anchorDate,
        entryCount: entries.length,
        cumulativeHash: digestHex,
        otsAnchored: otsProofB64 !== null,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('hema-audit-anchor: error fatal:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    await sql.end()
  }
})
