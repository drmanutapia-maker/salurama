'use client'
import { useState } from 'react'
import { useCP } from '@/hooks/useCP'

export default function TestCP() {
  const [cp, setCp] = useState('')
  const { loading, error, cpData, search, formatCP } = useCP()

  const handleSearch = async () => {
    const result = await search(cp)
    console.log('Resultado:', result)
  }

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Test CP - Sepomex Local</h1>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Código Postal
        </label>
        <input
          type="text"
          value={cp}
          onChange={e => setCp(formatCP(e.target.value))}
          placeholder="06600"
          maxLength={5}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1.5px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 15,
          }}
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={loading || cp.length !== 5}
        style={{
          width: '100%',
          padding: '12px 20px',
          background: loading || cp.length !== 5 ? '#9CA3AF' : '#1E3A5F',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          cursor: loading || cp.length !== 5 ? 'not-allowed' : 'pointer',
          marginBottom: 16,
        }}
      >
        {loading ? 'Buscando...' : 'Buscar CP'}
      </button>

      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #EF4444',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 14, color: '#EF4444', margin: 0 }}>{error}</p>
        </div>
      )}

      {cpData && (
        <div style={{
          background: '#F0FFF4',
          border: '1px solid #059669',
          borderRadius: 8,
          padding: '16px',
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', marginBottom: 12 }}>
            ✅ CP Encontrado
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p><strong>Estado:</strong> {cpData.estado}</p>
            <p><strong>Municipio:</strong> {cpData.municipio}</p>
            <p><strong>Ciudad:</strong> {cpData.ciudad}</p>
            <p><strong>Colonias ({cpData.colonias.length}):</strong></p>
            <ul style={{ marginLeft: 20, fontSize: 13 }}>
              {cpData.colonias.map((c, i) => (
                <li key={i}>{c.nombre}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}