'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  MapPin,
  Stethoscope,
  Shield,
  Star,
  MessageCircle,
} from 'lucide-react'
import { STATES, getStateLabel } from '@/lib/locations'
import BottomNav from '@/components/BottomNav'
import type { EspecialistaHomepage } from '@/lib/homepageEspecialistas'
import EspecialidadAutocomplete from '@/components/ui/EspecialidadAutocomplete'

// ─── Constantes ────────────────────────────────────────────────────────────────

const MAS_BUSCADAS = [
  'Oncología',
  'Cardiología',
  'Dermatología',
  'Psiquiatría',
  'Ginecología y Obstetricia',
  'Pediatría',
  'Cirugía Plástica y Reconstructiva',
  'Oftalmología',
  'Geriatría',
  'Gastroenterología',
]

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { to { transform: rotate(360deg); } }

.fade-up { animation: fadeUp 0.4s ease-out; }
.fade-in { animation: fadeIn 0.3s ease-out; }

  h1, h2, h3, h4, h5, h6 { font-family: 'Fraunces', serif; }

.btn-violeta {
    background: #8B5CF6;
    color: white;
    border: none;
    transition: all 0.2s ease;
  }
.btn-violeta:hover {
    background: #7C3AED;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }

.chip:hover {
    background: #8B5CF6;
    color: white;
    border-color: #8B5CF6;
    transform: translateY(-2px);
  }

.card-medico {
    transition: all 0.3s ease;
    border: 1px solid #2A9D8F;
  }
.card-medico:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(42, 157, 143, 0.15);
    border-color: #8B5CF6;
  }

.nav-link:hover { color: #8B5CF6; }

  @media (min-width: 768px) {
  .desktop-only { display: flex!important; }
  .mobile-only { display: none!important; }
  }
  @media (max-width: 767px) {
  .desktop-only { display: none!important; }
  .mobile-only { display: flex!important; }
  }
`

export default function HomeClient({
  especialistas,
}: {
  especialistas: EspecialistaHomepage[]
}) {
  const router = useRouter()

  const [inputValue, setInputValue] = useState('')
  const [selectedState, setSelectedState] = useState('')

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams()
    if (inputValue.trim()) params.set('especialidad', inputValue.trim())
    if (selectedState) params.set('estado', selectedState)
    router.push(`/buscar?${params.toString()}`)
  }, [inputValue, selectedState, router])

  const handleChipClick = (esp: string) => {
    const params = new URLSearchParams()
    params.set('especialidad', esp)
    if (selectedState) params.set('estado', selectedState)
    router.push(`/buscar?${params.toString()}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{PAGE_STYLES}</style>

      <main style={{ paddingTop: 80, paddingBottom: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <section className="fade-up" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 20px 40px', textAlign: 'center' }}>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 900, color: '#1E3A5F' }}>Salu</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 600, color: '#2A9D8F' }}>rama</span>
            </div>

            <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 900, color: '#1E3A5F', marginBottom: 32, lineHeight: 1.2 }}>
              Verifica credenciales y agenda con confianza
            </h1>

            <div style={{ maxWidth: 900, margin: '0 auto 40px' }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 400px', minWidth: 280 }}>
                  <EspecialidadAutocomplete
                    value={inputValue}
                    onChange={v => {
                      setInputValue(v)
                    }}
                    placeholder="Especialidad o médico"
                    inputStyle={{
                      width: '100%',
                      height: 56,
                      padding: '0 24px',
                      borderRadius: 16,
                      border: '1.5px solid #2A9D8F',
                      fontSize: 15,
                      fontFamily: "'DM Sans', sans-serif",
                      background: '#fff',
                      outline: 'none',
                      boxShadow: '0 2px 8px rgba(42,157,143,.08)',
                    }}
                  />
                </div>

                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} style={{ height: 56, width: '100%', maxWidth: 200, padding: '0 36px 0 16px', borderRadius: 16, border: '1.5px solid #2A9D8F', fontSize: 15, fontFamily: "'DM Sans', sans-serif", background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', boxShadow: '0 2px 8px rgba(42,157,143,.08)', flexShrink: 0 }}>
                  <option value="">Todos los estados</option>
                  {STATES.map((state) => (<option key={state} value={state}>{getStateLabel(state)}</option>))}
                </select>

                <button onClick={handleSearch} style={{ height: 56, padding: '0 28px', background: '#8B5CF6', border: 'none', borderRadius: 16, color: 'white', fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(139,92,246,.3)', flexShrink: 0, whiteSpace: 'nowrap' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#7C3AED'; e.currentTarget.style.transform = 'translateY(-1px)' }} onMouseLeave={(e) => { e.currentTarget.style.background = '#8B5CF6'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <Search size={18} /> Buscar
                </button>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Especialidades más buscadas:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 900, margin: '0 auto' }}>
                {MAS_BUSCADAS.map((esp) => (
                  <button key={esp} onClick={() => handleChipClick(esp)} className="chip" style={{ background: '#fff', border: '1px solid #2A9D8F', borderRadius: 50, padding: '8px 16px', fontSize: 13, color: '#4A5568', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s ease' }}>
                    {esp}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="fade-up" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#1E3A5F', marginBottom: 8 }}>Nuestros especialistas</h2>
            </div>

            {especialistas.length > 0? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                {especialistas.map((medico) => (
                  <Link key={medico.id} href={`/doctor/${medico.slug ?? medico.id}`} className="card-medico" style={{ background: '#fff', borderRadius: 16, padding: 20, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {medico.photo_url? (<img src={medico.photo_url} alt={medico.full_name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />) : (<div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24, color: '#fff', flexShrink: 0 }}>{(medico.full_name || '?')[0].toUpperCase()}</div>)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{medico.full_name}</h3>
                        <p style={{ fontSize: 14, color: '#6B7280' }}>{medico.specialty}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280' }}><MapPin size={14} />{medico.ciudad}, {getStateLabel(medico.estado || '')}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 20px', background: '#F9FAFB', borderRadius: 16, border: '1px dashed #D1D5DB' }}>
                <div style={{ width: 64, height: 64, background: '#F5F3FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Stethoscope size={32} color="#8B5CF6" /></div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1E3A5F', marginBottom: 8 }}>Aún no hay médicos registrados</h3>
                <p style={{ fontSize: 15, color: '#6B7280', maxWidth: 500, margin: '0 auto' }}>Sé el primero en unirte a nuestra plataforma</p>
                <Link href="/registro" className="btn-violeta" style={{ display: 'inline-block', marginTop: 20, padding: '12px 32px', borderRadius: 50, textDecoration: 'none', fontWeight: 600 }}>Registrarme como médico</Link>
              </div>
            )}
          </section>

          <section className="fade-up" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#1E3A5F', marginBottom: 8 }}>¿Por qué <span style={{ color: '#2A9D8F' }}>Salurama</span>?</h2>
              <p style={{ fontSize: 15, color: '#6B7280' }}>Herramientas para tomar decisiones informadas</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div className="card-medico" style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: '#F5F3FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Shield size={32} color="#8B5CF6" /></div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>Verifica en SEP/CONACEM</h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Accede a portales oficiales para verificar credenciales antes de agendar</p>
              </div>
              <div className="card-medico" style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Star size={32} color="#F59E0B" /></div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>Reseñas de pacientes reales</h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Solo pacientes que agendaron cita pueden dejar reseñas</p>
              </div>
              <div className="card-medico" style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><MessageCircle size={32} color="#059669" /></div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>Habla con tu médico</h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Chatea directo con tu médico dentro de Salurama tras confirmar tu cita, sin salir de la plataforma.</p>
              </div>
            </div>
          </section>

          <section className="fade-up" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ background: '#1E3A5F', borderRadius: 20, padding: 'clamp(32px,5vw,48px) 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <Stethoscope size={26} color="#fff" />
              </div>
              <h2 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, color: '#fff', marginBottom: 10 }}>
                ¿Eres médico y quieres estar aquí?
              </h2>
              <p style={{ fontSize: 15, color: '#C5D0E0', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 24px' }}>
                Perfil con cédula verificable, chat directo con tus pacientes, reseñas reales y estadísticas de tu especialidad. Descubre todo lo que Salurama hace por ti.
              </p>
              <Link
                href="/beneficios"
                style={{ display: 'inline-block', background: '#2A9D8F', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: 50, fontSize: 15 }}
              >
                Ver beneficios →
              </Link>
            </div>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}