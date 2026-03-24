'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Mail, MapPin } from 'lucide-react'

export default function AvisoPrivacidad() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        h1, h2, h3 { font-family: "'Fraunces', serif"; }
        .container { max-width: 800px; margin: 0 auto; padding: 24px 20px; }
        .card { background: #fff; borderRadius: 16px; padding: 32px; border: 1px solid #E5E7EB; }
        .section { marginBottom: 28px; }
        .section-title { fontSize: 18px; fontWeight: 700; color: '#3730A3'; marginBottom: 12px; }
        .text { fontSize: 14px; color: '#374151'; lineHeight: 1.7; marginBottom: 12px; }
        .list { paddingLeft: 20px; marginBottom: 12px; }
        .list li { fontSize: 14px; color: '#374151'; lineHeight: 1.7; marginBottom: 6px; }
        .highlight { background: '#EEF2FF'; padding: 16px; borderRadius: 10px; border-left: 4px solid #3730A3; margin: 16px 0; }
        @media (max-width: 640px) { .card { padding: 24px 18px; } }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', gap: 12 }}>
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

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="#3730A3" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 }}>Aviso de Privacidad</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Última actualización: 21 de marzo de 2026</p>
            </div>
          </div>

          <div className="highlight">
            <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
              <strong>Salurama S.A.S. de C.V. (en constitución)</strong>, con domicilio fiscal en México, es responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">1. Datos personales que recabamos</h2>
            
            <p className="text"><strong>De usuarios (pacientes):</strong></p>
            <ul className="list">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Teléfono</li>
              <li>Ubicación (ciudad)</li>
              <li>Historial de búsquedas en la plataforma</li>
              <li>Dirección IP y datos de navegación</li>
            </ul>

            <p className="text"><strong>De médicos/profesionales:</strong></p>
            <ul className="list">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Teléfono</li>
              <li>Cédula profesional (7-8 dígitos)</li>
              <li>Especialidad médica</li>
              <li>Ciudad y estado de ejercicio</li>
              <li>Dirección del consultorio (opcional)</li>
              <li>Costo de consulta (opcional)</li>
              <li>Fotografía de perfil (opcional)</li>
              <li>Descripción profesional (opcional)</li>
            </ul>

            <div className="highlight" style={{ background: '#DCFCE7', borderLeftColor: '#059669' }}>
              <p style={{ fontSize: 14, color: '#065F46', margin: 0 }}>
                <strong>Datos que NO recabamos:</strong> Información clínica de pacientes, diagnósticos médicos, historial médico personal, datos financieros completos, datos biométricos.
              </p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">2. Finalidades del tratamiento</h2>
            
            <p className="text"><strong>Finalidades primarias (necesarias para el servicio):</strong></p>
            <ul className="list">
              <li>Crear y administrar cuentas de usuario</li>
              <li>Mostrar perfiles de profesionales de la salud</li>
              <li>Facilitar contacto entre pacientes y médicos</li>
              <li>Operación del directorio médico</li>
              <li>Verificación de cédulas profesionales ante la SEP</li>
            </ul>

            <p className="text"><strong>Finalidades secundarias (requieren consentimiento):</strong></p>
            <ul className="list">
              <li>Marketing y publicidad de servicios relacionados</li>
              <li>Análisis de uso de la plataforma</li>
              <li>Mejora del servicio</li>
              <li>Estadísticas agregadas y anónimas</li>
            </ul>
          </div>

          <div className="section">
            <h2 className="section-title">3. Transferencia de datos</h2>
            
            <p className="text">Sus datos podrán ser compartidos con:</p>
            <ul className="list">
              <li><strong>Profesionales de la salud registrados</strong> (para facilitar contacto)</li>
              <li><strong>Proveedores tecnológicos:</strong>
                <ul className="list">
                  <li>Supabase Inc. (base de datos) - Estados Unidos</li>
                  <li>Vercel Inc. (hosting) - Estados Unidos</li>
                  <li>Mapbox Inc. (mapas) - Estados Unidos</li>
                  <li>Google LLC (analytics) - Estados Unidos</li>
                  <li>Amazon Web Services (servidores) - Estados Unidos</li>
                </ul>
              </li>
              <li><strong>Autoridades competentes</strong> (por orden judicial o legal)</li>
            </ul>

            <div className="highlight">
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                Algunos de nuestros proveedores están ubicados en Estados Unidos de América. Estas transferencias se realizan bajo contratos de protección de datos conforme al artículo 37 de la LFPDPPP. Al utilizar nuestra plataforma, usted consiente expresamente estas transferencias internacionales de datos.
              </p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">4. Derechos ARCO</h2>
            
            <p className="text">Usted tiene derecho a:</p>
            <ul className="list">
              <li><strong>Acceder</strong> a sus datos personales</li>
              <li><strong>Rectificar</strong> datos inexactos o incompletos</li>
              <li><strong>Cancelar</strong> sus datos cuando considere innecesarios</li>
              <li><strong>Oponerse</strong> al tratamiento para fines específicos</li>
            </ul>

            <div className="highlight">
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                <strong>Procedimiento:</strong> Enviar solicitud por email a <strong>privacidad@salurama.com</strong> incluyendo nombre completo, email registrado, derecho que desea ejercer y copia de identificación oficial. Recibirá respuesta en <strong>10 días hábiles</strong>.
              </p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">5. Medidas de seguridad</h2>
            
            <p className="text">Implementamos medidas técnicas, administrativas y físicas:</p>
            <ul className="list">
              <li>Encriptación de datos en tránsito (HTTPS/TLS)</li>
              <li>Encriptación de datos en reposo</li>
              <li>Control de acceso con autenticación</li>
              <li>Backups automáticos</li>
              <li>Monitoreo de accesos no autorizados</li>
            </ul>
          </div>

          <div className="section">
            <h2 className="section-title">6. Contacto</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={18} color="#3730A3" />
                <span style={{ fontSize: 14, color: '#374151' }}>privacidad@salurama.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={18} color="#3730A3" />
                <span style={{ fontSize: 14, color: '#374151' }}>Ciudad de México, México</span>
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">7. Autoridad competente</h2>
            
            <p className="text">
              La autoridad competente para conocer de controversias en materia de protección de datos personales es:
            </p>
            <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 10, fontSize: 13, color: '#6B7280' }}>
              <p style={{ marginBottom: 4 }}><strong>Secretaría de la Función Pública</strong></p>
              <p style={{ marginBottom: 4 }}>Dirección General de Protección de Datos Personales</p>
              <p style={{ marginBottom: 4 }}>Avenida Insurgentes Sur 1735, Guadalupe Inn</p>
              <p style={{ marginBottom: 4 }}>Ciudad de México, CP 01020</p>
              <p>Teléfono: 55 2000 2000</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 24, marginTop: 32 }}>
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
              © 2026 Salurama S.A.S. de C.V. (en constitución) · Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}