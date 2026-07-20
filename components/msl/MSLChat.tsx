'use client'

import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, ArrowLeft } from 'lucide-react'
import BackButton from '@/components/BackButton'

// ── Types ─────────────────────────────────────────────────────────────────────

type Source = {
  title:    string
  authors:  string | null
  journal:  string | null
  year:     number | null
  doi:      string | null
  verified: boolean
  sponsor:  string | null
}

type Message = {
  role:     'user' | 'assistant'
  content:  string
  sources?: Source[]
  isError?: boolean
}

// Eventos NDJSON emitidos por app/api/msl-chat/route.ts (un objeto JSON por
// línea). 'retry' significa que el intento anterior falló a medias — el
// texto acumulado hasta ese punto se descarta sin mostrarse, nunca se
// persiste, y el servidor ya está reintentando desde cero de forma
// transparente. 'done' solo llega tras una respuesta completa y guardada.
type MSLStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'retry' }
  | { type: 'done'; conversationId: string; sources: Source[] }
  | { type: 'error'; message: string }

// ── TypingIndicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-neutral-100 rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-neutral-400 inline-block"
          style={{ animation: `msl-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

// ── SourceCard ────────────────────────────────────────────────────────────────

function SourceCard({ source }: { source: Source }) {
  const meta = [source.authors, source.journal, source.year]
    .filter(Boolean)
    .join(' · ')

  const inner = (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-body font-medium text-sm text-neutral-800 leading-snug">
          {source.title}
        </p>
        {source.verified && (
          <span className="flex items-center gap-1 shrink-0 text-xs font-medium text-tertiary-600 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-500 inline-block" />
            Verificado
          </span>
        )}
      </div>
      {meta && (
        <p className="font-body text-xs text-neutral-500 mt-1">{meta}</p>
      )}
      {source.sponsor && (
        <p className="font-body text-xs font-medium text-amber-600 mt-1">
          Patrocinado por {source.sponsor}
        </p>
      )}
    </div>
  )

  if (source.doi) {
    return (
      <a
        href={`https://doi.org/${source.doi}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-75 transition-opacity"
      >
        {inner}
      </a>
    )
  }

  return <div>{inner}</div>
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2 mb-4`}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed',
          isUser
            ? 'bg-primary-500 text-white rounded-tr-sm'
            : message.isError
              ? 'bg-error-50 text-error-700 border border-error-100 rounded-tl-sm'
              : 'bg-neutral-100 text-neutral-700 rounded-tl-sm',
        ].join(' ')}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-sm font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
              ),
              li: ({ children }) => <li className="text-sm">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-neutral-300 pl-3 my-2 text-neutral-500 italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="text-xs border-collapse w-full">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-neutral-300 px-2 py-1 bg-neutral-200 font-semibold text-left">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-neutral-300 px-2 py-1">{children}</td>
              ),
              code: ({ children }) => (
                <code className="bg-neutral-200 px-1 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="max-w-[85%] w-full space-y-1.5">
          <p className="font-body text-xs text-neutral-400 px-1">Fuentes</p>
          {message.sources.map((src, i) => (
            <SourceCard key={i} source={src} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MSLChat ───────────────────────────────────────────────────────────────────

type MSLChatProps = {
  // Si se da, reemplaza el BackButton (historial-primero) de Salurama por un
  // Link fijo — patrón que ya usa HEMA (ArrowLeft + texto, ruta específica,
  // sin router.back()) en vez del genérico de components/BackButton.tsx.
  backHref?:       string
  backLabel?:      string
  patientContext?: string
}

export default function MSLChat({ backHref, backLabel = 'Volver', patientContext }: MSLChatProps) {
  const [messages, setMessages]           = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [planBlocked, setPlanBlocked]     = useState<string | null>(null)
  // Texto de la respuesta en curso, mientras se recibe por streaming. null =
  // no hay streaming activo (se muestra el indicador de "escribiendo" en su
  // lugar, ya sea porque aún no llega el primer chunk o porque el servidor
  // acaba de reintentar tras un fallo a medias). Solo se vuelve un Message
  // real del array `messages` cuando llega el evento 'done'.
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const bottomRef                         = useRef<HTMLDivElement>(null)
  const streamingBubbleRef                = useRef<HTMLDivElement>(null)
  const textareaRef                       = useRef<HTMLTextAreaElement>(null)
  const scrollRef                         = useRef<HTMLDivElement>(null)
  const scrolledForAnswerRef              = useRef(false)

  // El scroll debe detenerse al INICIO de la respuesta nueva (para que el
  // médico la lea desde el principio) exactamente una vez, en el momento en
  // que llega el primer chunk — no en cada actualización posterior de texto
  // mientras sigue transmitiéndose, y no de nuevo si hay un reintento (la
  // burbuja no cambia de posición en pantalla).
  useEffect(() => {
    if (streamingText !== null && !scrolledForAnswerRef.current) {
      scrolledForAnswerRef.current = true
      streamingBubbleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [streamingText])

  // Mientras se espera el primer chunk (envío inicial o justo después de un
  // reintento invisible, cuando streamingText vuelve a null) el scroll sigue
  // el fondo para revelar el indicador de "escribiendo".
  useEffect(() => {
    if (loading && streamingText === null) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading, streamingText])

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)
    setStreamingText(null)
    scrolledForAnswerRef.current = false

    try {
      const res = await fetch('/api/msl-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, conversationId }),
      })

      // Contrato con el backend: status 200 es SIEMPRE un stream NDJSON;
      // cualquier otro status sigue siendo el JSON plano de error de antes
      // (auth/plan/rate-limit/fallas previas al streaming).
      if (res.status !== 200) {
        const data = await res.json().catch(() => ({} as { error?: string }))

        if (res.status === 401) {
          setMessages(prev => [...prev, {
            role:    'assistant',
            content: 'Tu sesión expiró. Recarga la página para continuar.',
            isError: true,
          }])
          return
        }

        if (res.status === 403) {
          setPlanBlocked(data.error ?? 'MSL Virtual no está incluido en tu plan actual.')
          return
        }

        if (res.status === 429) {
          setMessages(prev => [...prev, {
            role:    'assistant',
            content: data.error ?? 'Alcanzaste el límite de preguntas por hoy.',
            isError: true,
          }])
          return
        }

        setMessages(prev => [...prev, {
          role:    'assistant',
          content: data.error ?? 'No se pudo procesar la pregunta. Intenta de nuevo.',
          isError: true,
        }])
        return
      }

      if (!res.body) throw new Error('Respuesta sin cuerpo de streaming')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer     = ''
      let currentText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newlineIndex: number
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex)
          buffer = buffer.slice(newlineIndex + 1)
          if (!line.trim()) continue

          const event = JSON.parse(line) as MSLStreamEvent

          if (event.type === 'chunk') {
            currentText = event.text
            setStreamingText(currentText)
          } else if (event.type === 'retry') {
            // Reintento invisible: se descarta el texto parcial mostrado
            // hasta ahora sin explicación — el médico solo ve que vuelve el
            // indicador de "escribiendo".
            currentText = ''
            setStreamingText(null)
          } else if (event.type === 'done') {
            if (event.conversationId && !conversationId) {
              setConversationId(event.conversationId)
            }
            setMessages(prev => [...prev, {
              role:    'assistant',
              content: currentText,
              sources: event.sources ?? [],
            }])
            setStreamingText(null)
          } else if (event.type === 'error') {
            setMessages(prev => [...prev, {
              role:    'assistant',
              content: event.message,
              isError: true,
            }])
            setStreamingText(null)
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'No se pudo procesar la pregunta. Intenta de nuevo.',
        isError: true,
      }])
      setStreamingText(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <style>{`
        @keyframes msl-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {/* Parent must be a fixed-height container (e.g. h-[calc(100svh-68px)]) */}
      <div className="flex flex-col h-full max-w-3xl mx-auto">

        {/* ── Back — Link fijo si backHref viene dado (patrón HEMA), si no, BackButton de Salurama ── */}
        <div className="shrink-0 flex items-center px-4 py-3 border-b border-neutral-200">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#1E3A5F' }}
            >
              <ArrowLeft size={16} />
              {backLabel}
            </Link>
          ) : (
            <BackButton fallback="/dashboard" />
          )}
        </div>

        {/* ── Contexto de paciente (solo diagnóstico/estadio/riesgo, sin datos identificables) ── */}
        {patientContext && (
          <div className="shrink-0 px-4 py-2 bg-primary-50 border-b border-primary-100 text-xs text-primary-700">
            <span className="font-semibold">Contexto:</span> {patientContext}
          </div>
        )}

        {/* ── Messages area ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center pt-12 pb-12 px-4">
              <p className="font-headline text-2xl font-semibold text-primary-500 mb-2">
                MSL Virtual
              </p>
              <p className="font-body text-sm text-neutral-500 max-w-xs leading-relaxed">
                Consulta evidencia clínica sobre mieloma múltiple. Las respuestas se basan
                en publicaciones científicas verificadas.
              </p>
              <p className="font-body text-xs text-neutral-400 mt-3 max-w-xs leading-relaxed">
                Solo para profesionales de la salud · Valida siempre con guías clínicas actualizadas
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {streamingText !== null && (
            <div ref={streamingBubbleRef}>
              <MessageBubble message={{ role: 'assistant', content: streamingText }} />
            </div>
          )}

          {loading && streamingText === null && (
            <div className="flex items-start mb-4">
              <TypingIndicator />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input area / bloqueo de plan ──
            pb-20 on mobile (≈80px) clears the BottomNav (~60px + safe-area).
            pb-4 on md+ since BottomNav is md:hidden.                          */}
        {planBlocked ? (
          <div className="shrink-0 border-t border-neutral-200 bg-amber-50 px-4 py-4 pb-20 md:pb-4">
            <p className="font-body text-sm font-semibold text-amber-800 mb-1">
              Función no disponible en tu plan
            </p>
            <p className="font-body text-xs text-amber-700 leading-relaxed">
              {planBlocked}
            </p>
          </div>
        ) : (
          <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-20 md:pb-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); adjustTextarea() }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Pregunta sobre mieloma múltiple..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 font-body text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 transition-colors"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500 text-white disabled:opacity-40 hover:bg-primary-600 active:bg-primary-700 transition-colors"
              >
                <Send size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
