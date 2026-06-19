'use client'

import { useState } from 'react'
import { ScanLine, UploadCloud } from 'lucide-react'

// ─── Zona de drop para imagen/PDF de labs ────────────────────────────────────
// Sesión 9: solo placeholder visual. El OCR real (Google Cloud Document AI)
// llega en Sesión 10 — ver hema.lab_panels.ocr_image_path / ocr_raw_json.

export default function OcrDropzone() {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false) }}
      style={{
        border: `1.5px dashed ${isDragging ? '#7C3AED' : '#D1D5DB'}`,
        borderRadius: 14,
        padding: '20px 16px',
        textAlign: 'center',
        background: isDragging ? 'rgba(124,58,237,0.05)' : '#F9FAFB',
        marginBottom: 20,
        minHeight: 48,
      }}
    >
      <UploadCloud size={26} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
        Arrastra una imagen o PDF de tus laboratorios
      </p>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, color: '#7C3AED',
          background: 'rgba(124,58,237,0.1)', borderRadius: 20,
          padding: '3px 10px', marginTop: 4,
        }}
      >
        <ScanLine size={12} /> OCR disponible próximamente
      </span>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>
        Por ahora, captura los valores manualmente abajo
      </p>
    </div>
  )
}
