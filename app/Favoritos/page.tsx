'use client'
import Link from 'next/link'
import { Heart, Search } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

export default function FavoritosPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif" }}>
      <main style={{ paddingTop: 100, paddingBottom: 100, maxWidth: 600, margin: '0 auto', padding: '100px 20px 100px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 48, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 80, height: 80, background: '#F5F3FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Heart size={40} color="#8B5CF6" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F', marginBottom: 12, fontFamily: "'Fraunces', serif" }}>Mis Favoritos</h1>
          <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.5, marginBottom: 32 }}>Aún no tienes médicos favoritos</p>
          <Link href="/buscar" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#8B5CF6', color: '#fff', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 600 }}>
            <Search size={18} />Buscar especialistas
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}