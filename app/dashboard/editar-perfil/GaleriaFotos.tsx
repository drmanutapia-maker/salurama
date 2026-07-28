'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import imageCompression from 'browser-image-compression'
import { Plus, Trash2, Lock, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import { isPlusTier } from '@/lib/planGates'

interface GalleryPhoto {
  id: string
  storage_path: string
  photo_url: string
  caption: string | null
  position: number
}

const MAX_PHOTOS = 10

export default function GaleriaFotos({ doctorId, doctorSlug, pricingTier }: { doctorId: string; doctorSlug: string; pricingTier: string }) {
  const router = useRouter()
  const isPlus = isPlusTier(pricingTier)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => {
    let active = true
    supabase
      .from('doctor_gallery_photos')
      .select('id, storage_path, photo_url, caption, position')
      .eq('doctor_id', doctorId)
      .order('position')
      .then(({ data }) => {
        if (active) { setPhotos(data || []); setLoading(false) }
      })
    return () => { active = false }
  }, [doctorId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Selecciona una imagen válida'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB'); return }
    if (photos.length >= MAX_PHOTOS) { setError(`Máximo ${MAX_PHOTOS} fotos`); return }

    setUploading(true)
    setError('')
    let uploadedPath: string | null = null
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      })

      const ext = file.name.split('.').pop()
      const path = `${doctorId}/${doctorSlug}-${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage.from('doctor-gallery').upload(path, compressedFile)
      if (uploadError) throw uploadError
      uploadedPath = path

      const { data: urlData } = supabase.storage.from('doctor-gallery').getPublicUrl(path)
      const nextPosition = photos.length > 0 ? Math.max(...photos.map(p => p.position)) + 10 : 10

      const { data: inserted, error: insertError } = await supabase
        .from('doctor_gallery_photos')
        .insert({ doctor_id: doctorId, storage_path: path, photo_url: urlData.publicUrl, position: nextPosition })
        .select('id, storage_path, photo_url, caption, position')
        .single()

      if (insertError) throw insertError
      setPhotos(prev => [...prev, inserted])
      showToast('Foto agregada', 'success')
    } catch (err) {
      console.error('Error:', err)
      // La imagen ya se subió a Storage pero el registro en la base falló
      // (ej. corte de conexión) — borrarla para no dejar un archivo huérfano
      // sin fila en doctor_gallery_photos.
      if (uploadedPath) {
        await supabase.storage.from('doctor-gallery').remove([uploadedPath]).catch(() => {})
      }
      setError('No se pudo guardar la foto. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const confirmDelete = async () => {
    if (!photoToDelete) return
    const photo = photoToDelete
    setPhotoToDelete(null)
    setUploading(true)
    try {
      await supabase.storage.from('doctor-gallery').remove([photo.storage_path])
      const { error: deleteError } = await supabase.from('doctor_gallery_photos').delete().eq('id', photo.id)
      if (deleteError) throw deleteError
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      showToast('Foto eliminada', 'success')
    } catch (err) {
      console.error('Error:', err)
      showToast('No se pudo eliminar la foto', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= photos.length) return
    const reordered = [...photos]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setPhotos(reordered)
    try {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('doctor_gallery_photos').update({ position: index }).eq('id', reordered[index].id),
        supabase.from('doctor_gallery_photos').update({ position: targetIndex }).eq('id', reordered[targetIndex].id),
      ])
      if (e1 || e2) throw e1 || e2
      showToast('Guardado', 'success')
    } catch (err) {
      console.error('Error:', err)
      showToast('No se pudo guardar el orden', 'error')
    }
  }

  const handleCaptionBlur = async (photo: GalleryPhoto, caption: string) => {
    if (caption === (photo.caption || '')) return
    const { error: updateError } = await supabase.from('doctor_gallery_photos').update({ caption: caption || null }).eq('id', photo.id)
    if (updateError) {
      console.error('Error:', updateError)
      showToast('No se pudo guardar la descripción', 'error')
      return
    }
    setPhotos(prev => prev.map(p => (p.id === photo.id ? { ...p, caption } : p)))
    showToast('Guardado', 'success')
  }

  if (loading) return null

  const Toast = toast && (
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

  const DeleteModal = photoToDelete && (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setPhotoToDelete(null) }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>¿Eliminar esta foto?</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setPhotoToDelete(null)}
            style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )

  if (!isPlus) {
    if (photos.length === 0) {
      return (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Galería de fotos</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Disponible en el plan Plus.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/plan')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Lock size={14} /> Mejorar a Plus
          </button>
        </div>
      )
    }
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1.5px solid #E5E7EB' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Galería de fotos</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
          Tu plan actual no incluye galería — estas fotos ya no se muestran en tu perfil público. Puedes borrarlas, pero no agregar nuevas.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden' }}>
              <img src={photo.photo_url} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => setPhotoToDelete(photo)}
                disabled={uploading}
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, background: 'rgba(220,38,38,0.9)', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', padding: 0 }}
                title="Eliminar foto"
              >
                <Trash2 size={11} color="#fff" />
              </button>
            </div>
          ))}
        </div>
        {Toast}
        {DeleteModal}
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1.5px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Galería de fotos</p>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{photos.length}/{MAX_PHOTOS}</span>
      </div>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Fotos de tu consultorio o equipo, visibles en tu perfil público.</p>

      {error && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
        {photos.map((photo, index) => (
          <div key={photo.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '1/1' }}>
              <img src={photo.photo_url} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                onClick={() => setPhotoToDelete(photo)}
                disabled={uploading}
                style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, background: 'rgba(220,38,38,0.9)', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', padding: 0 }}
                title="Eliminar foto"
              >
                <Trash2 size={12} color="#fff" />
              </button>
              <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', gap: 4 }}>
                <button
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0 || uploading}
                  style={{ width: 22, height: 22, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: index === 0 || uploading ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1, padding: 0 }}
                  title="Mover antes"
                >
                  <ChevronLeft size={13} color="#fff" />
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  disabled={index === photos.length - 1 || uploading}
                  style={{ width: 22, height: 22, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: index === photos.length - 1 || uploading ? 'not-allowed' : 'pointer', opacity: index === photos.length - 1 ? 0.4 : 1, padding: 0 }}
                  title="Mover después"
                >
                  <ChevronRight size={13} color="#fff" />
                </button>
              </div>
            </div>
            <input
              type="text"
              defaultValue={photo.caption || ''}
              onBlur={e => handleCaptionBlur(photo, e.target.value)}
              placeholder="Descripción (opcional)"
              maxLength={140}
              style={{ width: '100%', border: 'none', borderTop: '1px solid #E5E7EB', padding: '8px 10px', fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#374151', outline: 'none' }}
            />
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ aspectRatio: '1/1', border: '1.5px dashed #D1D5DB', borderRadius: 10, background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
          >
            <Plus size={20} color="#6B7280" />
            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{uploading ? 'Subiendo...' : 'Agregar foto'}</span>
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      {Toast}
      {DeleteModal}
    </div>
  )
}
