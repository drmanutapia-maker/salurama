'use client'
import { X, ExternalLink, MapPin } from 'lucide-react'

interface GoogleMapsModalProps {
  address: string
  city: string
  onClose: () => void
}

export default function GoogleMapsModal({ address, city, onClose }: GoogleMapsModalProps) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + city)}`
  
  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.7)', 
        zIndex: 3000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 20 
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          background: '#fff', 
          borderRadius: 16, 
          padding: 0, 
          maxWidth: 800, 
          width: '100%', 
          maxHeight: '90vh', 
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeUp 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            background: 'rgba(255,255,255,0.95)', 
            border: 'none', 
            borderRadius: '50%', 
            width: 36, 
            height: 36, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <X size={18} color="#1A1A2E" />
        </button>
        
        {/* Mapa Embed */}
        <iframe
          width="100%"
          height="500"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address + ', ' + city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        />
        
        {/* Footer con dirección y botón */}
        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
            <MapPin size={16} color="#3730A3" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{address}, {city}</p>
          </div>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6, 
              background: '#3730A3', 
              color: '#fff', 
              borderRadius: 8, 
              padding: '8px 16px', 
              fontSize: 13, 
              fontWeight: 600, 
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#4F46E5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3730A3'}
          >
            <ExternalLink size={14} /> Abrir en Google Maps
          </a>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}