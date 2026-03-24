'use client'

import Link from 'next/link'
import { ArrowLeft, Heart, Shield, Users, Target, Eye, Award } from 'lucide-react'

export default function NosotrosPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        h1, h2, h3 { font-family: "'Fraunces', serif"; }
        .container { max-width: 900px; margin: '0 auto'; padding: 24px 20px; }
        .card { background: '#fff'; borderRadius: 16px; padding: 32px; border: 1px solid '#E5E7EB'; marginBottom: 24px; }
        .section { marginBottom: 28px; }
        .section-title { fontSize: 20px; fontWeight: 700; color: '#3730A3'; marginBottom: 16px; }
        .text { fontSize: 15px; color: '#374151'; lineHeight: 1.8; marginBottom: 16px; }
        .grid { display: grid; gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'; gap: 16px; margin: 24px 0; }
        .value-card { background: '#F9FAFB'; padding: 24px; borderRadius: 14px; border: 1px solid '#E5E7EB'; }
        .icon-wrap { width: 48; height: 48; borderRadius: '50%'; background: '#EEF2FF'; display: 'flex'; alignItems: 'center'; justifyContent: 'center'; marginBottom: 12px; }
        .highlight { background: '#EEF2FF'; padding: 20px; borderRadius: 12px; border-left: 4px solid '#3730A3'; margin: 20px 0; }
        @media (max-width: 640px) { .card { padding: 24px 18px; } .grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="container">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6B7280', textDecoration: 'none', fontSize: 14, marginBottom: 20 }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>

        {/* HERO */}
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3730A3 0%, #F4623A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Heart size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1A1A2E', marginBottom: 12 }}>Sobre Salurama</h1>
          <p style={{ fontSize: 16, color: '#6B7280', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            Somos una plataforma mexicana comprometida con hacer accesible la salud de calidad para todos.
          </p>
        </div>

        {/* MISIÓN */}
        <div className="card">
          <h2 className="section-title">Nuestra Misión</h2>
          <p className="text">
            <strong>Democratizar el acceso a la salud en México</strong>, conectando pacientes con profesionales verificados de manera gratuita, transparente y segura.
          </p>
          <div className="highlight">
            <p style={{ fontSize: 15, color: '#374151', margin: 0 }}>
              Creemos que la visibilidad digital no debería ser una barrera para que los médicos encuentren pacientes, ni para que los pacientes encuentren al médico ideal.
            </p>
          </div>
        </div>

        {/* VISIÓN */}
        <div className="card">
          <h2 className="section-title">Nuestra Visión</h2>
          <p className="text">
            Ser el directorio médico más grande y confiable de México, donde <strong>todos los médicos</strong> (especialmente especialistas y subespecialistas) tengan acceso a una plataforma gratuita para conectar con sus pacientes.
          </p>
          <p className="text">
            Reconocemos que la industria de la salud tiene eslabones mucho más rentables como las farmacéuticas, seguros y laboratorios clínicos. Los médicos que atendemos pacientes somos el motor de toda la industria, pero no generamos tales capitales como las industrias que están alrededor de nuestro trabajo.
          </p>
          <p className="text">
            <strong>Salurama es la analogía de los campesinos que cultivan los alimentos:</strong> son los que menos ganan dinero, pero sin ellos no hay industria alimentaria. Así, la industria de la salud está soportada por los médicos, pero sin recibir lo justo. Plataformas como Doctoralia trasladan el costo de conectarte con los pacientes a los mismos médicos. <strong>Eso es injusto.</strong>
          </p>
          <p className="text">
            <strong>Nuestra visión es financiar la plataforma a través de las farmacéuticas, seguros y laboratorios,</strong> no a través de los médicos. El registro y perfil básico será <strong>GRATIS PARA SIEMPRE</strong> para médicos.
          </p>
        </div>

        {/* VALORES */}
        <div className="card">
          <h2 className="section-title">Nuestros Valores</h2>
          <div className="grid">
            <div className="value-card">
              <div className="icon-wrap">
                <Heart size={24} color="#3730A3" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Accesibilidad</h3>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Salud al alcance de todos, sin barreras económicas.</p>
            </div>
            <div className="value-card">
              <div className="icon-wrap">
                <Shield size={24} color="#3730A3" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Transparencia</h3>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Información verificada y clara para pacientes y médicos.</p>
            </div>
            <div className="value-card">
              <div className="icon-wrap">
                <Users size={24} color="#3730A3" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Equidad</h3>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Justicia para los médicos como pilar del sistema de salud.</p>
            </div>
            <div className="value-card">
              <div className="icon-wrap">
                <Target size={24} color="#3730A3" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Compromiso</h3>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Con México y con la salud de todos los mexicanos.</p>
            </div>
          </div>
        </div>

        {/* POR QUÉ GRATIS */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)' }}>
          <h2 className="section-title">¿Por qué es gratis para médicos?</h2>
          <p className="text">
            Porque creemos que <strong>los médicos no deberían pagar por ser visibles</strong>. Ustedes ya contribuyen al sistema de salud todos los días atendiendo pacientes.
          </p>
          <p className="text">
            Nuestro modelo de negocio se basa en:
          </p>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, marginBottom: 8 }}>Publicidad de farmacéuticas, laboratorios y aseguradoras</li>
            <li style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, marginBottom: 8 }}>Servicios premium opcionales (agenda avanzada, estadísticas, etc.)</li>
            <li style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>Colaboraciones con el sector salud</li>
          </ul>
          <p className="text">
            <strong>El directorio básico será gratuito para siempre.</strong> Sin suscripciones, sin comisiones ocultas.
          </p>
        </div>

        {/* EQUIPO */}
        <div className="card">
          <h2 className="section-title">Nuestro Equipo</h2>
          <p className="text">
            Salurama fue fundada por <strong>médicos para médicos y pacientes</strong>. Entendemos las necesidades de ambos lados porque las vivimos día a día.
          </p>
          <div style={{ background: '#F9FAFB', padding: 20, borderRadius: 12, marginTop: 16 }}>
            <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
              <strong>Fundador:</strong> Manuel Augusto Tapia Dávila<br/>
              <strong>Especialidad:</strong> Hematología<br/>
              <strong>Visión:</strong> Hacer justicia a los médicos mexicanos y facilitar el acceso a la salud para todos.
            </p>
          </div>
        </div>

        {/* CONTACTO */}
        <div className="card">
          <h2 className="section-title">Contacto</h2>
          <p className="text">
            ¿Tienes dudas, sugerencias o quieres colaborar con nosotros?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={18} color="#3730A3" />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Email</p>
                <a href="mailto:hola@salurama.com" style={{ fontSize: 15, color: '#3730A3', fontWeight: 600, textDecoration: 'none' }}>hola@salurama.com</a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="#3730A3" />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Ubicación</p>
                <p style={{ fontSize: 15, color: '#374151' }}>Ciudad de México, México</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)', color: '#fff' }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 12 }}>¿Eres médico?</h2>
          <p style={{ fontSize: 15, color: '#A5B4FC', marginBottom: 20, maxWidth: 500, margin: '0 auto 20px' }}>
            Únete a Salurama gratis y haz que más pacientes te encuentren.
          </p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4623A', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: '50px', fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            Registrarme gratis →
          </Link>
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 24, marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>
            © 2026 Salurama S.A.S. de C.V. (en constitución) · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  )
}