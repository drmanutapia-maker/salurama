'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ReactMarkdown from 'react-markdown'
import BackButton from '@/components/BackButton'
import {
  CheckCircle, AlertCircle, Plus, Pencil, Eye, ExternalLink,
  ArrowLeft, MessageCircleQuestion, FileText,
} from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────────────────────

type EstadoArticulo = 'borrador' | 'revision' | 'publicado'
type EstadoPregunta = 'nueva' | 'usada' | 'descartada'

interface Articulo {
  id: string
  slug: string
  titulo: string
  resumen: string
  contenido: string
  especialidad: string
  imagen_portada_url: string | null
  autor_nombre: string | null
  revisor_nombre: string | null
  estado: EstadoArticulo
  publicado_at: string | null
  created_at: string
  updated_at: string
}

interface Pregunta {
  id: string
  articulo_id: string
  pregunta: string
  nombre: string | null
  estado: EstadoPregunta
  created_at: string
  blog_articulos: { titulo: string } | null
}

type ArticuloFiltro = 'todos' | EstadoArticulo
type PreguntaFiltro = 'todos' | EstadoPregunta

const FORM_VACIO = {
  id: null as string | null,
  slug: '',
  titulo: '',
  resumen: '',
  contenido: '',
  especialidad: '',
  imagen_portada_url: '',
  autor_nombre: 'Salurama',
  revisor_nombre: 'Manuel Tapia Dávila',
  estado: 'borrador' as EstadoArticulo,
  publicado_at: null as string | null,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function estadoArticuloBadge(estado: EstadoArticulo) {
  if (estado === 'publicado') return { bg: '#ECFDF5', color: '#059669', border: '#D1FAE5', label: 'Publicado' }
  if (estado === 'revision')  return { bg: '#FFFBEB', color: '#D97706', border: '#FEF3C7', label: 'En revisión' }
  return                             { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', label: 'Borrador' }
}

function estadoPreguntaBadge(estado: EstadoPregunta) {
  if (estado === 'usada')       return { bg: '#ECFDF5', color: '#059669', border: '#D1FAE5', label: 'Usada' }
  if (estado === 'descartada')  return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', label: 'Descartada' }
  return                               { bg: '#EFF6FF', color: '#2563EB', border: '#DBEAFE', label: 'Nueva' }
}

function Badge({ bg, color, border, label }: { bg: string; color: string; border: string; label: string }) {
  return (
    <span style={{ display: 'inline-block', background: bg, color, border: `1px solid ${border}`, borderRadius: 50, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
      {label}
    </span>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────
//
// Sin login propio: app/admin/layout.tsx ya es el gate real (sesión +
// membresía en `admins`), server-side, antes de que llegue una sola línea de
// HTML. Duplicar un formulario de login aquí solo sumaría al problema ya
// anotado de paneles de admin fragmentados — ver memoria del proyecto.
export default function AdminBlog() {
  const [tab, setTab] = useState<'articulos' | 'preguntas'>('articulos')
  const [vista, setVista] = useState<'lista' | 'editor'>('lista')

  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [especialidadesSugeridas, setEspecialidadesSugeridas] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)

  const [filtroArticulo, setFiltroArticulo] = useState<ArticuloFiltro>('todos')
  const [filtroPregunta, setFiltroPregunta] = useState<PreguntaFiltro>('nueva')

  const [form, setForm] = useState(FORM_VACIO)
  const [slugTocado, setSlugTocado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [previewArticulo, setPreviewArticulo] = useState<Articulo | null>(null)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  function mostrarToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function cargarArticulos() {
    const { data, error } = await supabase.from('blog_articulos').select('*').order('created_at', { ascending: false })
    if (error) { mostrarToast('error', 'No se pudieron cargar los artículos.'); return }
    setArticulos((data ?? []) as Articulo[])
  }

  async function cargarPreguntas() {
    const { data, error } = await supabase
      .from('blog_preguntas')
      .select('*, blog_articulos(titulo)')
      .order('created_at', { ascending: false })
    if (error) { mostrarToast('error', 'No se pudieron cargar las preguntas.'); return }
    setPreguntas((data ?? []) as unknown as Pregunta[])
  }

  async function cargarEspecialidadesSugeridas() {
    // Solo para autocompletar el <input> de especialidad con nombres reales
    // ya en uso en el directorio — el campo sigue siendo texto libre, no un
    // <select> cerrado, para no sumar una tercera copia de la lista CONACEM
    // (ya duplicada en BuscarClient.tsx y app/page.tsx).
    const { data } = await supabase.from('doctors').select('specialty').not('specialty', 'is', null)
    const unicas = Array.from(new Set((data ?? []).map(d => d.specialty).filter(Boolean))) as string[]
    setEspecialidadesSugeridas(unicas.sort((a, b) => a.localeCompare(b, 'es')))
  }

  useEffect(() => {
    Promise.all([cargarArticulos(), cargarPreguntas(), cargarEspecialidadesSugeridas()]).finally(() => setCargando(false))
  }, [])

  const articulosVisibles = useMemo(
    () => filtroArticulo === 'todos' ? articulos : articulos.filter(a => a.estado === filtroArticulo),
    [articulos, filtroArticulo]
  )
  const preguntasVisibles = useMemo(
    () => filtroPregunta === 'todos' ? preguntas : preguntas.filter(p => p.estado === filtroPregunta),
    [preguntas, filtroPregunta]
  )

  const counts = {
    borrador: articulos.filter(a => a.estado === 'borrador').length,
    revision: articulos.filter(a => a.estado === 'revision').length,
    publicado: articulos.filter(a => a.estado === 'publicado').length,
  }
  const preguntaCounts = {
    nueva: preguntas.filter(p => p.estado === 'nueva').length,
    usada: preguntas.filter(p => p.estado === 'usada').length,
    descartada: preguntas.filter(p => p.estado === 'descartada').length,
  }

  // ── Editor ─────────────────────────────────────────────────────────────────

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setSlugTocado(false)
    setVista('editor')
  }

  function abrirEdicion(a: Articulo) {
    setForm({
      id: a.id,
      slug: a.slug,
      titulo: a.titulo,
      resumen: a.resumen,
      contenido: a.contenido,
      especialidad: a.especialidad,
      imagen_portada_url: a.imagen_portada_url ?? '',
      autor_nombre: a.autor_nombre ?? '',
      revisor_nombre: a.revisor_nombre ?? '',
      estado: a.estado,
      publicado_at: a.publicado_at,
    })
    setSlugTocado(true)
    setVista('editor')
  }

  function cerrarEditor() {
    setVista('lista')
    setForm(FORM_VACIO)
  }

  async function guardarArticulo() {
    if (!form.titulo.trim() || !form.slug.trim() || !form.resumen.trim() || !form.contenido.trim() || !form.especialidad.trim()) {
      mostrarToast('error', 'Completa título, slug, resumen, contenido y especialidad.')
      return
    }

    setGuardando(true)
    const publicadoAt = form.estado === 'publicado' ? (form.publicado_at || new Date().toISOString()) : form.publicado_at

    const payload = {
      slug: form.slug.trim(),
      titulo: form.titulo.trim(),
      resumen: form.resumen.trim(),
      contenido: form.contenido,
      especialidad: form.especialidad.trim(),
      imagen_portada_url: form.imagen_portada_url.trim() || null,
      autor_nombre: form.autor_nombre.trim() || null,
      revisor_nombre: form.revisor_nombre.trim() || null,
      estado: form.estado,
      publicado_at: publicadoAt,
    }

    const { error } = form.id
      ? await supabase.from('blog_articulos').update(payload).eq('id', form.id)
      : await supabase.from('blog_articulos').insert(payload)

    setGuardando(false)

    if (error) {
      mostrarToast('error', error.code === '23505' ? 'Ya existe un artículo con ese slug.' : 'No se pudo guardar el artículo.')
      return
    }

    mostrarToast('success', form.id ? 'Artículo actualizado.' : 'Artículo creado.')
    await cargarArticulos()
    cerrarEditor()
  }

  async function cambiarEstadoArticulo(a: Articulo, nuevoEstado: EstadoArticulo) {
    const publicadoAt = nuevoEstado === 'publicado' ? (a.publicado_at || new Date().toISOString()) : a.publicado_at
    const { error } = await supabase.from('blog_articulos').update({ estado: nuevoEstado, publicado_at: publicadoAt }).eq('id', a.id)
    if (error) { mostrarToast('error', 'No se pudo cambiar el estado.'); return }
    mostrarToast('success', 'Estado actualizado.')
    cargarArticulos()
  }

  async function cambiarEstadoPregunta(p: Pregunta, nuevoEstado: EstadoPregunta) {
    const { error } = await supabase.from('blog_preguntas').update({ estado: nuevoEstado }).eq('id', p.id)
    if (error) { mostrarToast('error', 'No se pudo actualizar la pregunta.'); return }
    cargarPreguntas()
  }

  // ── Render: loading ──────────────────────────────────────────────────────────

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%' }} />
    </div>
  )

  // ── Render: editor de artículo ──────────────────────────────────────────────

  if (vista === 'editor') {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .campo { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #E5E7EB; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #111827; outline: none; }
          .campo:focus { border-color: #1E3A5F; }
          .etiqueta { display: block; font-size: 12px; font-weight: 700; color: #4B5563; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        `}</style>

        {toast && <Toast toast={toast} />}

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 80px' }}>
          <button onClick={cerrarEditor} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#1E3A5F', fontSize: 14, fontWeight: 600, marginBottom: 20, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
            <ArrowLeft size={18} /> Volver al listado
          </button>

          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: '#0D1829', marginBottom: 24 }}>
            {form.id ? 'Editar artículo' : 'Nuevo artículo'}
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="etiqueta">Título</label>
              <input
                className="campo"
                value={form.titulo}
                onChange={e => {
                  const titulo = e.target.value
                  setForm(f => ({ ...f, titulo, slug: slugTocado ? f.slug : slugify(titulo) }))
                }}
                placeholder="¿Qué es una biopsia de médula ósea?"
              />
            </div>

            <div>
              <label className="etiqueta">Slug (URL)</label>
              <input
                className="campo"
                value={form.slug}
                onChange={e => { setSlugTocado(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })) }}
              />
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>salurama.com/blog/{form.slug || '...'}</p>
            </div>

            <div>
              <label className="etiqueta">Especialidad</label>
              <input
                className="campo"
                list="especialidades-sugeridas"
                value={form.especialidad}
                onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))}
                placeholder="Hematología"
              />
              <datalist id="especialidades-sugeridas">
                {especialidadesSugeridas.map(e => <option key={e} value={e} />)}
              </datalist>
            </div>

            <div>
              <label className="etiqueta">Resumen (para el listado y meta description)</label>
              <textarea
                className="campo"
                rows={2}
                value={form.resumen}
                onChange={e => setForm(f => ({ ...f, resumen: e.target.value }))}
                maxLength={300}
              />
            </div>

            <div>
              <label className="etiqueta">Contenido (Markdown)</label>
              <textarea
                className="campo"
                rows={16}
                value={form.contenido}
                onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                style={{ fontFamily: "'DM Sans', monospace", fontSize: 13.5, lineHeight: 1.6 }}
              />
            </div>

            <div>
              <label className="etiqueta">Imagen de portada (URL, opcional)</label>
              <input className="campo" value={form.imagen_portada_url} onChange={e => setForm(f => ({ ...f, imagen_portada_url: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="etiqueta">Autor</label>
                <input className="campo" value={form.autor_nombre} onChange={e => setForm(f => ({ ...f, autor_nombre: e.target.value }))} />
              </div>
              <div>
                <label className="etiqueta">Revisor</label>
                <input className="campo" value={form.revisor_nombre} onChange={e => setForm(f => ({ ...f, revisor_nombre: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="etiqueta">Estado</label>
              <select className="campo" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoArticulo }))} style={{ cursor: 'pointer' }}>
                <option value="borrador">Borrador</option>
                <option value="revision">En revisión</option>
                <option value="publicado">Publicado</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={guardarArticulo}
                disabled={guardando}
                style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setPreviewArticulo({ ...FORM_VACIO, ...form, id: form.id || 'preview', created_at: '', updated_at: '' } as Articulo)}
                style={{ background: '#fff', color: '#1E3A5F', border: '1.5px solid #1E3A5F', borderRadius: 50, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Eye size={16} /> Vista previa
              </button>
            </div>
          </div>
        </div>

        {previewArticulo && <PreviewModal articulo={previewArticulo} onClose={() => setPreviewArticulo(null)} />}
      </div>
    )
  }

  // ── Render: listado ──────────────────────────────────────────────────────────

  return (
    <>
      {toast && <Toast toast={toast} />}

      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .fpill { padding: 7px 15px; border: 1.5px solid; border-radius: 50px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
          .act-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 50px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s; white-space: nowrap; background: #fff; }
          .fila-blog { background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 16px 18px; }
        `}</style>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 80px' }}>
          <div style={{ marginBottom: 8 }}>
            <BackButton fallback="/admin/medicos" label="Volver" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: '#0D1829' }}>
                Blog para pacientes
              </h1>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
                {counts.publicado} publicados · {counts.revision} en revisión · {counts.borrador} borradores
              </p>
            </div>
            {tab === 'articulos' && (
              <button
                onClick={abrirNuevo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 50, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                <Plus size={17} /> Nuevo artículo
              </button>
            )}
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1.5px solid #E5E7EB' }}>
            <button
              onClick={() => setTab('articulos')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 4px', marginBottom: -1.5, border: 'none', borderBottom: `2px solid ${tab === 'articulos' ? '#1E3A5F' : 'transparent'}`, background: 'none', color: tab === 'articulos' ? '#1E3A5F' : '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              <FileText size={16} /> Artículos ({articulos.length})
            </button>
            <button
              onClick={() => setTab('preguntas')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 4px', marginLeft: 20, marginBottom: -1.5, border: 'none', borderBottom: `2px solid ${tab === 'preguntas' ? '#1E3A5F' : 'transparent'}`, background: 'none', color: tab === 'preguntas' ? '#1E3A5F' : '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              <MessageCircleQuestion size={16} /> Preguntas de lectores
              {preguntaCounts.nueva > 0 && (
                <span style={{ background: '#2563EB', color: '#fff', borderRadius: 50, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>{preguntaCounts.nueva}</span>
              )}
            </button>
          </div>

          {/* ── Tab: artículos ── */}
          {tab === 'articulos' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {(['todos', 'borrador', 'revision', 'publicado'] as ArticuloFiltro[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltroArticulo(f)}
                    className="fpill"
                    style={{
                      background: filtroArticulo === f ? '#1E3A5F' : '#fff',
                      color: filtroArticulo === f ? '#fff' : '#4B5563',
                      borderColor: filtroArticulo === f ? '#1E3A5F' : '#E5E7EB',
                    }}
                  >
                    {f === 'todos' ? 'Todos' : estadoArticuloBadge(f).label}
                  </button>
                ))}
              </div>

              {articulosVisibles.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: 14 }}>No hay artículos en este filtro.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {articulosVisibles.map(a => {
                    const badge = estadoArticuloBadge(a.estado)
                    return (
                      <div key={a.id} className="fila-blog">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{a.titulo}</p>
                            <p style={{ fontSize: 12.5, color: '#6B7280' }}>{a.especialidad} · {formatFecha(a.publicado_at ?? a.created_at)}</p>
                          </div>
                          <Badge {...badge} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="act-btn" style={{ borderColor: '#E5E7EB', color: '#4B5563' }} onClick={() => abrirEdicion(a)}>
                            <Pencil size={12} /> Editar
                          </button>
                          <button className="act-btn" style={{ borderColor: '#E5E7EB', color: '#4B5563' }} onClick={() => setPreviewArticulo(a)}>
                            <Eye size={12} /> Vista previa
                          </button>
                          {a.estado === 'publicado' && (
                            <a className="act-btn" style={{ borderColor: '#D1FAE5', color: '#059669', textDecoration: 'none' }} href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink size={12} /> Ver en vivo
                            </a>
                          )}
                          {a.estado === 'borrador' && (
                            <button className="act-btn" style={{ borderColor: '#FEF3C7', color: '#D97706' }} onClick={() => cambiarEstadoArticulo(a, 'revision')}>
                              Enviar a revisión
                            </button>
                          )}
                          {a.estado === 'revision' && (
                            <button className="act-btn" style={{ borderColor: '#D1FAE5', color: '#059669' }} onClick={() => cambiarEstadoArticulo(a, 'publicado')}>
                              Publicar
                            </button>
                          )}
                          {a.estado === 'publicado' && (
                            <button className="act-btn" style={{ borderColor: '#E5E7EB', color: '#6B7280' }} onClick={() => cambiarEstadoArticulo(a, 'borrador')}>
                              Despublicar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Tab: preguntas ── */}
          {tab === 'preguntas' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {(['todos', 'nueva', 'usada', 'descartada'] as PreguntaFiltro[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltroPregunta(f)}
                    className="fpill"
                    style={{
                      background: filtroPregunta === f ? '#1E3A5F' : '#fff',
                      color: filtroPregunta === f ? '#fff' : '#4B5563',
                      borderColor: filtroPregunta === f ? '#1E3A5F' : '#E5E7EB',
                    }}
                  >
                    {f === 'todos' ? 'Todas' : estadoPreguntaBadge(f).label}
                  </button>
                ))}
              </div>

              {preguntasVisibles.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: 14 }}>No hay preguntas en este filtro.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {preguntasVisibles.map(p => {
                    const badge = estadoPreguntaBadge(p.estado)
                    return (
                      <div key={p.id} className="fila-blog">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14.5, color: '#111827', marginBottom: 6, lineHeight: 1.5 }}>{p.pregunta}</p>
                            <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                              {p.nombre || 'Anónimo'} · sobre "{p.blog_articulos?.titulo || 'artículo eliminado'}" · {formatFecha(p.created_at)}
                            </p>
                          </div>
                          <Badge {...badge} />
                        </div>
                        {p.estado === 'nueva' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="act-btn" style={{ borderColor: '#D1FAE5', color: '#059669' }} onClick={() => cambiarEstadoPregunta(p, 'usada')}>
                              Marcar usada
                            </button>
                            <button className="act-btn" style={{ borderColor: '#E5E7EB', color: '#6B7280' }} onClick={() => cambiarEstadoPregunta(p, 'descartada')}>
                              Descartar
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewArticulo && <PreviewModal articulo={previewArticulo} onClose={() => setPreviewArticulo(null)} />}
    </>
  )
}

function Toast({ toast }: { toast: { type: 'success' | 'error'; msg: string } }) {
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
      color: toast.type === 'success' ? '#059669' : '#DC2626',
      border: `1px solid ${toast.type === 'success' ? '#D1FAE5' : '#FEE2E2'}`,
      borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', pointerEvents: 'none',
    }}>
      {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {toast.msg}
    </div>
  )
}

// Preview interno: los artículos en borrador/revisión no tienen ruta pública
// (404 a propósito), así que la vista previa se renderiza aquí mismo con el
// mismo componente de markdown que usa /blog/[slug], en vez de intentar
// abrir una URL que todavía no existe para el público.
function PreviewModal({ articulo, onClose }: { articulo: Articulo; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, maxWidth: 680, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 'clamp(24px, 5vw, 40px)' }}
      >
        <style>{`
          .preview-md p { margin-bottom: 16px; line-height: 1.75; color: #374151; }
          .preview-md h2 { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 900; color: #1E3A5F; margin: 24px 0 10px; }
          .preview-md ul, .preview-md ol { margin: 0 0 16px 22px; }
        `}</style>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          {articulo.especialidad || 'Sin especialidad'}
        </p>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, color: '#1E3A5F', lineHeight: 1.25, marginBottom: 16 }}>
          {articulo.titulo || 'Sin título'}
        </h1>
        {articulo.imagen_portada_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={articulo.imagen_portada_url} alt={articulo.titulo} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 14, marginBottom: 20 }} />
        )}
        <div className="preview-md">
          <ReactMarkdown>{articulo.contenido || '_Sin contenido todavía._'}</ReactMarkdown>
        </div>
        <button
          onClick={onClose}
          style={{ marginTop: 16, background: '#F3F4F6', border: 'none', borderRadius: 50, padding: '10px 22px', fontSize: 13, fontWeight: 700, color: '#4B5563', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
