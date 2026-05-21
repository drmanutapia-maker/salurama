'use client'
import Link from 'next/link'
import { Calendar, Search } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

export default function CitasPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", paddingBottom: 100 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap'); h1{font-family:'Fraunces',serif}`}</style>
      
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1E3A5F', textAlign: 'center' }}>Mis Citas</h1>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 48, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 80, height: 80, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Calendar size={40} color="#2A9D8F" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>No tienes citas agendadas</h2>
          <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.5, marginBottom: 32 }}>
            Cuando agendes tu primera cita, aparecerá aquí con todos los detalles
          </p>
          <Link href="/buscar" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #2A9D8F 0%, #218377 100%)', color: '#fff', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
            <Search size={18} />Agendar primera cita
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}