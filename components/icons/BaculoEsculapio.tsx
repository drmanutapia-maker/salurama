// Báculo de Esculapio (una sola serpiente enrollada en un bastón, sin alas
// — a propósito no es el caduceo de Hermes, que sí lleva alas y es símbolo
// de comercio, no de medicina). Trazo simple sin relleno pesado, mismo
// estilo que los íconos de lucide-react ya usados en el resto del perfil.
export default function BaculoEsculapio({ size = 16, color = 'currentColor', className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <path d="M12 5 C16.2 6, 16.2 9, 12 10 C7.8 11, 7.8 14, 12 15 C16.2 16, 16.2 18.5, 13 19.3" />
      <circle cx="12" cy="4.3" r="1.1" fill={color} stroke="none" />
    </svg>
  )
}
