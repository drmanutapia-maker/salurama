import Link from 'next/link'

export default function DoctorNotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;700&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F', marginBottom: 8 }}>Perfil no encontrado</h2>
        <p style={{ color: '#6B7280', marginBottom: 20, fontSize: 14 }}>Este perfil no existe o no está disponible.</p>
        <Link href="/" style={{ background: '#8B5CF6', color: '#fff', padding: '11px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Ir al inicio</Link>
      </div>
    </div>
  )
}
