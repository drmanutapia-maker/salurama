'use client'

// Bloque de skeleton reutilizable — usado como placeholder mientras cada
// página del dashboard carga sus datos reales. aria-hidden porque es
// puramente visual; el contenedor que lo usa debe anunciar el estado de
// carga por separado (ver DashboardSkeletonShell / aria-busy en cada página).
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style = {},
}: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      className="skeleton-block"
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #EEF0F2 25%, #E2E5E9 37%, #EEF0F2 63%)',
        backgroundSize: '400% 100%',
        animation: 'skeletonShimmer 1.4s ease infinite',
        ...style,
      }}
    />
  )
}

// Envoltura semántica para una sección en carga: le da al lector de
// pantalla un anuncio único ("Cargando…") en vez de que intente leer cada
// rectángulo gris individualmente.
export function SkeletonSection({
  label = 'Cargando contenido',
  children,
  style = {},
}: {
  label?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div role="status" aria-label={label} style={style}>
      {children}
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        {label}
      </span>
    </div>
  )
}
