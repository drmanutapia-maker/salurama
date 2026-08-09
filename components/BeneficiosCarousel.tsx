'use client'
import { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import {
  UserCircle, ShieldCheck, Image as ImageIcon, CalendarCheck, MessageCircle,
  Star, BarChart2, Award, ChevronLeft, ChevronRight, CheckCircle,
  Bell, Lock, Smartphone, LogOut,
} from 'lucide-react'
import BaculoEsculapio from '@/components/icons/BaculoEsculapio'

// Microinteracciones de cada tarjeta: reciben `active` (true solo cuando esa
// tarjeta está centrada en el carrusel) y usan `key` para forzar un remount
// cada vez que se activan, así las animaciones CSS vuelven a correr desde cero.

function DemoPerfil({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 0' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', opacity: active ? 1 : 0, animation: active ? 'popIn 0.4s ease-out both' : undefined }} />
      <div style={{ width: 110, height: 9, borderRadius: 5, background: '#E5E7EB', opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.4s ease-out both' : undefined, animationDelay: '120ms' }} />
      <div style={{ width: 80, height: 7, borderRadius: 4, background: '#E5E7EB', opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.4s ease-out both' : undefined, animationDelay: '220ms' }} />
      <div style={{ display: 'flex', gap: 2, opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.4s ease-out both' : undefined, animationDelay: '320ms' }}>
        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} color="#F59E0B" fill="#F59E0B" />)}
      </div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, padding: '3px 9px 3px 7px', borderRadius: 99,
          background: '#2A9D8F', opacity: active ? 1 : 0,
          animation: active ? 'popIn 0.4s ease-out 520ms both, pulseRing 1.4s ease-out 920ms' : undefined,
        }}
      >
        <BaculoEsculapio size={11} color="#fff" />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>Perfil completo</span>
      </div>
    </div>
  )
}

function DemoAgenda({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, padding: '14px 12px' }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const isSelected = i === 9
        return (
          <div
            key={i}
            style={{
              aspectRatio: '1/1', borderRadius: 6,
              background: isSelected ? '#2A9D8F' : '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: isSelected && active ? 'pulseRing 1.4s ease-out 0.3s' : undefined,
            }}
          >
            {isSelected && <CheckCircle size={11} color="#fff" style={{ opacity: active ? 1 : 0, transition: 'opacity .3s .5s' }} />}
          </div>
        )
      })}
    </div>
  )
}

function DemoVerificacion({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 110 }}>
      <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'linear-gradient(135deg,#2A9D8F,#1E7A6F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12l5 5L20 6" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={32} strokeDashoffset={active ? 0 : 32}
            style={{ transition: active ? 'stroke-dashoffset 0.7s ease-out 0.15s' : 'none' }}
          />
        </svg>
      </div>
    </div>
  )
}

function DemoMerito({ active }: { active: boolean }) {
  const items = ['Perfil completo', 'Cédula verificable', 'Buenas reseñas']
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px' }}>
      <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#2A9D8F,#1E3A5F)', width: active ? '100%' : '0%', transition: 'width 0.9s ease-out' }} />
      </div>
      {items.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: active ? 1 : 0, transition: `opacity .3s ${300 + i * 180}ms` }}>
          <CheckCircle size={13} color="#2A9D8F" />
          <span style={{ fontSize: 11, color: '#374151' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function DemoChat({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px' }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '75%', background: '#F3F4F6', borderRadius: '10px 10px 10px 2px', padding: '6px 10px', fontSize: 11, color: '#374151', opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.35s ease-out both' : undefined, animationDelay: '0ms' }}>
        Hola doctor, ¿llevo algún estudio?
      </div>
      <div style={{ alignSelf: 'flex-end', maxWidth: '75%', background: '#1E3A5F', color: '#fff', borderRadius: '10px 10px 2px 10px', padding: '6px 10px', fontSize: 11, opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.35s ease-out both' : undefined, animationDelay: '260ms' }}>
        Con tu último análisis basta
      </div>
      <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 3, background: '#F3F4F6', borderRadius: 10, padding: '7px 10px', opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.35s ease-out both' : undefined, animationDelay: '520ms' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#9CA3AF', animation: active ? 'dotBounce 1.2s ease-in-out infinite' : undefined, animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  )
}

function DemoNotificaciones({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 0' }}>
      <div style={{ position: 'relative' }}>
        <Bell
          size={30} color="#8B5CF6"
          style={{ opacity: active ? 1 : 0, animation: active ? 'popIn 0.35s ease-out both, bellRing 0.6s ease-in-out 0.55s' : undefined }}
        />
        <span
          style={{
            position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: '#DC2626',
            opacity: active ? 1 : 0, animation: active ? 'popIn 0.3s ease-out 0.55s both' : undefined,
          }}
        />
      </div>
      {/* Silueta de celular recibiendo una notificacion, en vez de la
          palabra "push" (jerga tecnica que un medico comun no reconoce) —
          es el elemento visual protagonista de la tarjeta, sin etiqueta de
          texto debajo (el correo ya se menciona en el cuerpo de la tarjeta). */}
      <div style={{ position: 'relative', width: 56, height: 92, borderRadius: 12, border: '2.5px solid #C7C9D1', background: '#fff', opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.4s ease-out 0.9s both' : undefined }}>
        <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: 16, height: 3, borderRadius: 2, background: '#D1D5DB' }} />
        <div
          style={{
            position: 'absolute', left: 5, right: 5, top: 18,
            display: 'flex', alignItems: 'center', gap: 5, background: '#F5F3FF', borderRadius: 7, padding: '5px 6px',
            opacity: active ? 1 : 0, animation: active ? 'notifDrop 0.4s ease-out 1.2s both' : undefined,
          }}
        >
          <Bell size={12} color="#8B5CF6" />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#DDD6FE' }} />
        </div>
      </div>
    </div>
  )
}

function DemoResenas({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i} size={20} color="#F59E0B" fill="#F59E0B"
            style={{
              opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(0.5)',
              transition: `opacity .3s ${i * 100}ms, transform .3s ${i * 100}ms`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: '#9CA3AF', opacity: active ? 1 : 0, transition: 'opacity .3s 600ms' }}>Reseñas reales</span>
    </div>
  )
}

function DemoEstadisticas({ active }: { active: boolean }) {
  const heights = [40, 65, 50, 85]
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100, padding: '10px 16px' }}>
      {heights.map((h, i) => (
        <div key={i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
          <div
            style={{
              width: '100%', height: active ? `${h}%` : '0%', borderRadius: '4px 4px 0 0',
              background: '#8B5CF6', transition: `height 0.6s ease-out ${i * 90}ms`,
            }}
          />
        </div>
      ))}
    </div>
  )
}

function DemoGaleria({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, padding: '14px 6px' }}>
      {['#FDE68A', '#A7F3D0', '#BFDBFE', '#FBCFE8'].map((c, i) => (
        <div
          key={c}
          style={{
            aspectRatio: '1/1', borderRadius: 8, background: c,
            opacity: active ? 1 : 0, animation: active ? 'popIn 0.35s ease-out both' : undefined, animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  )
}

function DemoSeguridad({ active }: { active: boolean }) {
  return (
    <div key={active ? 'on' : 'off'} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.35s ease-out both' : undefined, animationDelay: '0ms' }}>
        <Smartphone size={14} color="#1E3A5F" />
        <span style={{ fontSize: 11, color: '#374151' }}>Este dispositivo</span>
        <CheckCircle size={12} color="#2A9D8F" style={{ marginLeft: 'auto' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: active ? 1 : 0, animation: active ? 'fadeUp 0.35s ease-out both' : undefined, animationDelay: '220ms' }}>
        <Smartphone size={14} color="#D1D5DB" />
        <span style={{ fontSize: 11, color: '#D1D5DB', textDecoration: 'line-through' }}>Dispositivo desconocido</span>
        <LogOut
          size={12} color="#DC2626" style={{ marginLeft: 'auto', opacity: active ? 1 : 0, animation: active ? 'popIn 0.3s ease-out 500ms both' : undefined }}
        />
      </div>
    </div>
  )
}

interface Benefit {
  icon: React.ReactNode
  bg: string
  title: string
  body: string
  boldLine: string
  Demo: (props: { active: boolean }) => React.ReactElement
}

const BENEFITS: Benefit[] = [
  {
    icon: <UserCircle size={22} color="#8B5CF6" />, bg: '#F5F3FF', title: 'Tu perfil, siempre visible',
    body: 'Foto, especialidad, ubicación, horarios, mapa, seguros, tarifas. Todo lo que un paciente necesita para decidir agendar contigo.',
    boldLine: 'Cuando tu perfil esté completo y hayas atendido tu primera consulta, se mostrará una insignia que indica que eres un médico activo en Salurama.',
    Demo: DemoPerfil,
  },
  {
    icon: <CalendarCheck size={22} color="#1E3A5F" />, bg: '#E8ECF3', title: 'Agenda de citas en línea',
    body: 'Tus pacientes agendan directo desde tu perfil, sin llamadas ni mensajes de ida y vuelta.',
    boldLine: 'Tu agenda es inteligente: nunca se duplican citas, y te llega un aviso a tu correo en cuanto tu paciente confirma.',
    Demo: DemoAgenda,
  },
  {
    icon: <ShieldCheck size={22} color="#2A9D8F" />, bg: '#E8F7F5', title: 'Cédula y especialidad verificables',
    body: 'Tu perfil incluye botones directos a la SEP y al consejo de tu especialidad (CONACEM).',
    boldLine: 'Tus pacientes verifican tu cédula y certificación ellos mismos, en fuentes oficiales.',
    Demo: DemoVerificacion,
  },
  {
    icon: <Award size={22} color="#1E3A5F" />, bg: '#E8ECF3', title: 'Posicionamiento por mérito',
    body: 'Entre más completo esté tu perfil, más consultas atiendas, y más activo estés en la plataforma, mejor se posiciona tu perfil frente a otros médicos de tu especialidad.',
    boldLine: 'Tu visibilidad se gana con tu actividad profesional, no con tu presupuesto.',
    Demo: DemoMerito,
  },
  {
    icon: <MessageCircle size={22} color="#2A9D8F" />, bg: '#E8F7F5', title: 'Chat directo con tus pacientes',
    body: 'Una vez confirmada la cita, pueden platicar directo dentro de Salurama. Manda indicaciones, comparte documentos y resuelve dudas antes de la consulta.',
    boldLine: 'El chat se cierra automáticamente 72 horas después de marcar la consulta como atendida.',
    Demo: DemoChat,
  },
  {
    icon: <Bell size={22} color="#8B5CF6" />, bg: '#F5F3FF', title: 'Notificaciones',
    body: 'Nunca te pierdas un mensaje. Recibe avisos por correo y notificaciones directo en tu celular cuando un paciente confirme su cita o te escriba en el chat.',
    boldLine: 'Te enteras al instante, aunque no tengas Salurama abierto en ese momento.',
    Demo: DemoNotificaciones,
  },
  {
    icon: <Star size={22} color="#D97706" />, bg: '#FFFBEB', title: 'Reseñas reales',
    body: 'Solo pacientes que tuvieron una cita real pueden dejar reseña.',
    boldLine: 'Puedes responder públicamente a cada reseña, y nuestra IA vigila que todo el contenido cumpla nuestras políticas.',
    Demo: DemoResenas,
  },
  {
    icon: <BarChart2 size={22} color="#8B5CF6" />, bg: '#F5F3FF', title: 'Estadísticas y comparativa de especialidad',
    body: 'Consulta tus vistas, tasa de confirmación y calificación mes a mes. Compárate contra médicos de tu misma especialidad, a nivel nacional y en tu ciudad.',
    boldLine: 'Descarga tus reportes completos en PDF o Excel cuando quieras.',
    Demo: DemoEstadisticas,
  },
  {
    icon: <ImageIcon size={22} color="#D97706" />, bg: '#FFFBEB', title: 'Galería de tu consultorio',
    body: 'Sube hasta 10 fotos de tu consultorio o equipo.',
    boldLine: 'Los pacientes eligen con más confianza cuando pueden ver dónde los vas a atender.',
    Demo: DemoGaleria,
  },
  {
    icon: <Lock size={22} color="#1E3A5F" />, bg: '#E8ECF3', title: 'Seguridad de tu cuenta',
    body: 'Tienes control total sobre quién accede a tu cuenta. Guarda tu inicio de sesión en tus dispositivos de confianza hasta por 7 días.',
    boldLine: 'Cierra remotamente la sesión de cualquier dispositivo, en cuanto detectes un acceso que no reconoces.',
    Demo: DemoSeguridad,
  },
]

interface CtaLink {
  label: string
  href: string
}

interface BeneficiosCarouselProps {
  title?: string
  ctaTitle?: string
  ctaSubtitle?: string
  primaryCta: CtaLink
  secondaryCta?: CtaLink
}

export default function BeneficiosCarousel({
  title = 'Lo que Salurama hace por ti',
  ctaTitle = '¿Listo para aprovechar todo esto?',
  ctaSubtitle = 'Completa tu perfil para que los pacientes te encuentren con toda la información que necesitan.',
  primaryCta,
  secondaryCta,
}: BeneficiosCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'center', loop: false, containScroll: 'trimSnaps' })

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    setScrollSnaps(emblaApi.scrollSnapList())
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-4px);opacity:1} }
        @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(42,157,143,0.55)} 70%{box-shadow:0 0 0 9px rgba(42,157,143,0)} 100%{box-shadow:0 0 0 0 rgba(42,157,143,0)} }
        @keyframes bellRing { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(12deg)} 60%{transform:rotate(-8deg)} 80%{transform:rotate(4deg)} }
        @keyframes notifDrop { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
        .benefit-slide { flex: 0 0 86%; min-width: 0; padding: 0 6px; }
        @media (min-width: 768px) { .benefit-slide { flex: 0 0 60%; } }
        @media (min-width: 1100px) { .benefit-slide { flex: 0 0 46%; } }
        .embla-viewport { overflow: hidden; }
        .embla-container { display: flex; }
        .carousel-arrow { width: 38px; height: 38px; border-radius: 50%; border: 1px solid #E5E7EB; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .carousel-arrow:disabled { opacity: 0.35; cursor: not-allowed; }
        .carousel-dot { width: 7px; height: 7px; border-radius: 50%; background: #D1D5DB; border: none; cursor: pointer; padding: 0; transition: all .25s; }
        .carousel-dot.active { width: 20px; border-radius: 4px; background: #1E3A5F; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827' }}>{title}</h1>
        </div>

        <div className="fade-up" style={{ marginBottom: 16 }}>
          <div className="embla-viewport" ref={emblaRef}>
            <div className="embla-container">
              {BENEFITS.map((b, i) => {
                const active = i === selectedIndex
                const Demo = b.Demo
                return (
                  <div className="benefit-slide" key={b.title}>
                    <div
                      style={{
                        background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', padding: 22,
                        display: 'flex', flexDirection: 'column', gap: 14, height: '100%',
                        transform: active ? 'scale(1)' : 'scale(0.96)', opacity: active ? 1 : 0.6,
                        transition: 'transform 0.3s ease, opacity 0.3s ease',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {b.icon}
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 900, color: '#111827', marginBottom: 6 }}>{b.title}</p>
                        <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{b.body}</p>
                        <p style={{ fontSize: 13, color: '#111827', lineHeight: 1.6, fontWeight: 700, marginTop: 8 }}>{b.boldLine}</p>
                      </div>
                      <div style={{ background: '#F9FAFB', borderRadius: 12, marginTop: 'auto' }}>
                        <Demo active={active} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 40 }}>
          <button className="carousel-arrow" onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label="Anterior">
            <ChevronLeft size={18} color="#374151" />
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {scrollSnaps.map((_, i) => (
              <button key={i} className={`carousel-dot ${i === selectedIndex ? 'active' : ''}`} onClick={() => emblaApi?.scrollTo(i)} aria-label={`Ir a la tarjeta ${i + 1}`} />
            ))}
          </div>
          <button className="carousel-arrow" onClick={() => emblaApi?.scrollNext()} disabled={!canNext} aria-label="Siguiente">
            <ChevronRight size={18} color="#374151" />
          </button>
        </div>

        <div className="fade-up" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 900, color: '#111827', marginBottom: 8 }}>{ctaTitle}</p>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>{ctaSubtitle}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={primaryCta.href} style={{ background: '#1E3A5F', color: '#fff', textDecoration: 'none', borderRadius: 50, padding: '11px 22px', fontSize: 13, fontWeight: 600 }}>
              {primaryCta.label}
            </a>
            {secondaryCta && (
              <a href={secondaryCta.href} style={{ background: '#F3F4F6', color: '#374151', textDecoration: 'none', borderRadius: 50, padding: '11px 22px', fontSize: 13, fontWeight: 600 }}>
                {secondaryCta.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
