'use client'
import Link from 'next/link'
import { WifiOff, ShieldAlert, ServerCrash, SearchX, RefreshCw } from 'lucide-react'

export type PageErrorType = 'network' | 'auth' | 'server' | 'notfound'

const CONFIG: Record<PageErrorType, { icon: typeof WifiOff; title: string; message: string }> = {
  network: {
    icon: WifiOff,
    title: 'Sin conexión',
    message: 'No pudimos conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.',
  },
  auth: {
    icon: ShieldAlert,
    title: 'Tu sesión expiró',
    message: 'Por seguridad, inicia sesión de nuevo para continuar.',
  },
  server: {
    icon: ServerCrash,
    title: 'Algo falló al cargar',
    message: 'Tuvimos un problema al conectar con el servidor. Intenta de nuevo en unos segundos.',
  },
  notfound: {
    icon: SearchX,
    title: 'No encontramos la información',
    message: 'No pudimos encontrar lo que buscabas.',
  },
}

// Detecta el tipo de error a partir de lo que Supabase/fetch realmente
// devuelven, para no mostrar "algo salió mal" genérico sin importar la
// causa real.
//
// Ojo: los errores de supabase-js NO siempre son instancias nativas de
// Error. Los fallos de red en auth-js llegan como AuthRetryableFetchError
// (su propia clase, con .name pero sin pasar `instanceof TypeError`), y los
// errores de PostgREST llegan como objetos planos {message, code, ...} que
// tampoco son `instanceof Error`. Por eso esto lee `.name`/`.message` por
// duck-typing en vez de depender de instanceof — confirmado con una prueba
// real cortando la red hacia Supabase (ver evidencia de /dashboard).
export function classifyError(err: unknown): PageErrorType {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network'
  const obj = err as { name?: unknown; message?: unknown; status?: unknown; code?: unknown } | null
  const name = obj && typeof obj === 'object' && 'name' in obj ? String(obj.name) : ''
  const message = obj && typeof obj === 'object' && 'message' in obj ? String(obj.message) : String(err ?? '')
  const status = obj && typeof obj === 'object' && 'status' in obj ? obj.status : undefined
  const combined = `${name} ${message}`
  if (/fetcherror|failed to fetch|networkerror|network request failed|load failed|err_internet|err_connection/i.test(combined)) return 'network'
  if (status === 401 || /jwt|401|not authenticated|invalid refresh|auth session missing/i.test(combined)) return 'auth'
  if (/pgrst116|not found|404/i.test(combined)) return 'notfound'
  return 'server'
}

export function PageErrorState({
  type,
  onRetry,
  title,
  message,
  compact = false,
}: {
  type: PageErrorType
  onRetry?: () => void
  title?: string
  message?: string
  compact?: boolean
}) {
  const cfg = CONFIG[type]
  const Icon = cfg.icon
  return (
    <div
      role="alert"
      style={{
        textAlign: 'center',
        padding: compact ? '32px 20px' : '56px 24px',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#FEF2F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Icon size={24} color="#DC2626" />
      </div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#1E3A5F', margin: '0 0 8px' }}>
        {title || cfg.title}
      </h2>
      <p style={{ fontSize: 14, color: '#4B5563', margin: '0 0 20px', lineHeight: 1.6 }}>
        {message || cfg.message}
      </p>
      {type === 'auth' ? (
        <Link
          href="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1E3A5F', color: '#fff',
            padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', minHeight: 44,
          }}
        >
          Iniciar sesión
        </Link>
      ) : onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1E3A5F', color: '#fff',
            border: 'none', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44,
          }}
        >
          <RefreshCw size={16} aria-hidden="true" /> Reintentar
        </button>
      ) : null}
    </div>
  )
}
