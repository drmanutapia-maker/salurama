export default function ComingSoon() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3730A3 0%, #1E1B4B 100%)', fontFamily: "'DM Sans', sans-serif", color: '#fff', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px, 8vw, 48px)', fontWeight: 900, marginBottom: 16 }}>
          Salurama
        </h1>
        <p style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontStyle: 'italic', marginBottom: 24, opacity: 0.9 }}>
          Salud en tus manos
        </p>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '24px 32px', borderRadius: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>🚀 Próximamente</p>
          <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
            Estamos preparando el directorio médico gratuito más grande de México.
            <br />
            <strong>Registro gratuito para médicos · Sin comisiones · Para siempre</strong>
          </p>
        </div>
        <p style={{ fontSize: 13, opacity: 0.6 }}>
            ¿Eres médico? Escríbenos a 
            <a href="mailto:hola@salurama.com" style={{ color: '#F4623A', marginLeft: 4 }}>hola@salurama.com</a>
          </p>
        <p style={{ fontSize: 12, opacity: 0.4, marginTop: 32 }}>
          © 2026 Salurama · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}