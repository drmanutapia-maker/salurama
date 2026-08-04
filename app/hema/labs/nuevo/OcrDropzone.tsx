'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle2, FileText, Loader2, ScanLine, UploadCloud, X } from 'lucide-react'
import { uploadLabImage } from '../actions'

interface OcrDropzoneProps {
  patientId: string
  imagePath: string | null
  onImageUploaded: (path: string) => void
  onImageRemoved: () => void
}

export default function OcrDropzone({ patientId, imagePath, onImageUploaded, onImageRemoved }: OcrDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<{ name: string; url: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setPreview({ name: file.name, url })

    const fd = new FormData()
    fd.set('patient_id', patientId)
    fd.set('file', file)

    startTransition(async () => {
      const result = await uploadLabImage(fd)
      if (result.success) {
        onImageUploaded(result.imagePath)
      } else {
        setError(result.error)
        setPreview(null)
      }
    })
  }

  function handleRemove() {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setError(null)
    onImageRemoved()
    if (inputRef.current) inputRef.current.value = ''
  }

  if (imagePath && preview) {
    return (
      <div style={{ border: '1.5px solid #BBF7D0', background: '#F0FDF4', borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        {preview.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={20} color="#16A34A" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} /> Imagen guardada
          </p>
          <p style={{ fontSize: 12, color: '#15803D', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview.name}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <X size={16} color="#6B7280" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleFile(file)
      }}
      onClick={() => !isPending && inputRef.current?.click()}
      style={{
        border: `1.5px dashed ${isDragging ? '#7C3AED' : '#D1D5DB'}`,
        borderRadius: 14,
        padding: '20px 16px',
        textAlign: 'center',
        background: isDragging ? 'rgba(124,58,237,0.05)' : '#F9FAFB',
        marginBottom: 20,
        minHeight: 48,
        cursor: isPending ? 'wait' : 'pointer',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file) }}
        style={{ display: 'none' }}
      />

      {isPending ? (
        <Loader2 size={26} color="#7C3AED" style={{ margin: '0 auto 8px', animation: 'spin 0.8s linear infinite' }} />
      ) : (
        <UploadCloud size={26} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
      )}
      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
        {isPending ? 'Subiendo...' : 'Arrastra o toca para subir una imagen o PDF de tus laboratorios'}
      </p>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, color: '#7C3AED',
          background: 'rgba(124,58,237,0.1)', borderRadius: 20,
          padding: '3px 10px', marginTop: 4,
        }}
      >
        <ScanLine size={12} /> OCR automático próximamente
      </span>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>
        Se guarda como referencia: captura los valores manualmente abajo
      </p>

      {error && (
        <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 10 }}>{error}</p>
      )}
    </div>
  )
}
