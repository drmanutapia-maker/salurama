// Pantalla propia de Salurama (HTML/CSS/SVG) -- Next.js la muestra sola,
// automáticamente, mientras el segmento /dashboard/* está resolviendo del
// lado del servidor (el chequeo de sesión async en app/dashboard/layout.tsx)
// o esperando datos con Suspense. Es DISTINTA del splash nativo del sistema
// operativo que genera Chrome/Android para la PWA instalada (a partir de
// app/manifest.ts: ícono + background_color) -- ese splash nativo no se
// puede animar ni tocar desde código, lo compone el propio SO antes de que
// cualquier HTML de Salurama llegue a pintarse. Esta pantalla es lo que se
// ve justo DESPUÉS de que ese splash nativo entrega el control a la app,
// mientras el contenido real de Inicio termina de cargar -- aquí sí se
// puede animar.
//
// Todo en un solo <svg viewBox="0 0 640 200">, valores exactos acordados:
// wordmark "Salurama" (Fraunces 900 64px) con baseline en y=110, línea de
// pulso en y=125 (pegada, 15px debajo). Las 8 posiciones x de las letras
// están MEDIDAS con Playwright/Chromium real (Fraunces 900 64px cargada de
// verdad, getBoundingClientRect() por letra sobre un contenedor de 640px
// centrado) -- no son una estimación de métricas de otra fuente.
//
// Una sola pasada, no loop, 3.5s en total:
//   Segmento 1 (0.0s-0.5s, 0%-14.2857%): complejo QRS se dibuja completo en
//     x=0-60 -- puntos exactos: (0,125)->(35,125)->(40,118)[Q]->(45,125)
//     ->(48,40)[R]->(51,125)->(56,140)[S]->(60,125).
//   Segmento 2 (0.5s-3.0s, 14.2857%-85.7143%): línea recta en y=125 (sin
//     ningún otro pico) se dibuja de x=60 a x=640 a velocidad constante.
//     Cada letra pasa de opacity:0 a opacity:1 en el instante exacto en que
//     la punta de esa línea cruza su centro medido -- ver LETRAS abajo,
//     timestamps calculados con tiempo = 0.5 + 2.5*(x-60)/580.
//   Segmento 3 (3.0s-3.5s, 85.7143%-100%): el trazo completo (QRS + línea)
//     se desvanece a opacity:0 -- el wordmark se queda visible, quieto, en
//     sus colores finales.
const LETRAS = [
  { ch: 'S', x: 159.796875, color: '#FFFFFF', delay: 1.019 },
  { ch: 'a', x: 201.21875,  color: '#FFFFFF', delay: 1.191 },
  { ch: 'l', x: 239.5625,   color: '#FFFFFF', delay: 1.322 },
  { ch: 'u', x: 262,        color: '#FFFFFF', delay: 1.463 },
  { ch: 'r', x: 305.015625, color: '#2A9D8F', delay: 1.630 },
  { ch: 'a', x: 339.109375, color: '#2A9D8F', delay: 1.786 },
  { ch: 'm', x: 377.453125, color: '#2A9D8F', delay: 2.007 },
  { ch: 'a', x: 441.84375,  color: '#2A9D8F', delay: 2.229 },
]

export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1E3A5F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="status"
      aria-label="Cargando Salurama"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&display=swap');

        /* Dibuja el trazo completo -- dashoffset 640 (nada) -> 580 (solo el
           QRS, x=0-60) en 0%-14.2857% (0-0.5s), luego 580 -> 0 (el resto,
           x=60-640) en 14.2857%-85.7143% (0.5s-3.0s) a velocidad constante,
           que es justo lo que asume la fórmula de los timestamps de las
           letras. Separado de la opacidad (ver ecg-fade) para que ese
           avance quede puramente lineal en cada tramo. */
        @keyframes ecg-draw {
          0%       { stroke-dashoffset: 640; }
          14.2857% { stroke-dashoffset: 580; }
          85.7143% { stroke-dashoffset: 0; }
          100%     { stroke-dashoffset: 0; }
        }
        @keyframes ecg-fade {
          0%, 85.7143% { opacity: 1; }
          100%         { opacity: 0; }
        }
        /* Cada letra: opacity:0 -> opacity:1, con animation-delay = su
           timestamp exacto (ver LETRAS) y fill-mode "both" -- invisible
           antes de su turno, visible en su color final después, sin efecto
           adicional (según lo acordado esta vez). */
        @keyframes letra-encender {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <svg
        viewBox="0 0 640 200"
        style={{ width: 'min(640px, 92vw)', height: 'auto' }}
        role="img"
        aria-label="Salurama"
      >
        <text
          y={110}
          style={{ fontFamily: "'Fraunces', serif", fontSize: 64, fontWeight: 900 }}
        >
          {LETRAS.map((l, i) => (
            <tspan
              key={i}
              x={l.x}
              fill={l.color}
              style={{ opacity: 0, animation: `letra-encender 0.06s linear ${l.delay}s both` }}
            >
              {l.ch}
            </tspan>
          ))}
        </text>

        <path
          pathLength={640}
          d="M0,125 L35,125 L40,118 L45,125 L48,40 L51,125 L56,140 L60,125 L640,125"
          fill="none"
          stroke="#2A9D8F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={640}
          style={{ animation: 'ecg-draw 3.5s linear forwards, ecg-fade 3.5s linear forwards' }}
        />
      </svg>
    </div>
  )
}
