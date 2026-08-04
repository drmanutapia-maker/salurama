# Salurama — Pendientes activos
_Última actualización: sesión del 2026-07-28 / 08-03. Generado a partir de la memoria del proyecto._

## Estado general
El plan de SEO técnico (sitemap, SSR de perfil/buscar/homepage, ranking de mérito, next/image+font, páginas dedicadas especialidad+estado) y el blog de pacientes (5 partes) están **completos y en producción**. La vulnerabilidad crítica de citas/PII y la de reviews también están **resueltas y verificadas en producción**. Lo que sigue abajo es lo que falta.

---

## 1. Prioridad estratégica actual: crecimiento
- **Rediseño de densidad de upsells/candados** — feedback de médica real: demasiados CTAs "Mejora a Premium" acumulados sesión tras sesión dan sensación de "todo se cobra" y restan protagonismo a lo gratis. Pendiente de resolver **antes** de lanzar el trial (abajo), porque un trial mal comunicado no convierte igual.
- **Trial Premium permanente de 6 meses** para todo médico nuevo (no solo promoción de lanzamiento). Decisión de negocio ya tomada; falta diseñar la mecánica exacta. Bloqueado por el punto anterior.
- **Programa de referidos** médico-médico (ambos ganan tiempo de Premium al referir). Sin diseñar todavía.
- **Chips de especialidades "más buscadas" dinámicos** — hoy no existe ningún tracking de búsquedas en la plataforma. Falta decidir: evento por fila vs. contadores agregados, y si conviene reusar `doctor_search_ranking`. El chip solo debe volverse dinámico con volumen mínimo de datos; mientras tanto se queda la lista curada actual.
- **Páginas dedicadas por especialidad+ciudad**: ya completo para Hematología+Ciudad de México (disparador de 3 médicos alcanzado). Seguir vigilando otras combinaciones — avisar proactivamente cuando otra combinación llegue a 3-5 médicos.

## 2. Idea futura (separada, no empezar sin decisión de negocio explícita)
- Herramienta de creación de contenido para médicos: investiga un tema, escribe artículo, genera guion de redes sociales. Posible feature de pago. Podría reusar la infraestructura de MSL Virtual (preguntas/respuestas). Cada médico responsable de la calidad de su propio contenido (disclaimer, no revisión uno por uno). Merece su propia sesión de decisión de negocio (modelo de cobro, alcance).

## 3. Auditoría de seguridad — sin empezar
- ~43 migraciones fundacionales de HEMA nunca registradas en bitácora remota de Supabase (riesgo con `db push --include-all`, no idempotentes).
- Confirmar si el admin tiene acceso sin restricción a leer `chat_mensajes`/`chat_archivos` vía panel/SQL de Supabase.
- Confirmar qué certificaciones (HIPAA/SOC2/ISO27001) necesita Salurama realmente para su mercado actual.
- Confirmar tratamiento de IVA sobre servicios de proveedores extranjeros (ej. Upstash) bajo reglas SAT.

## 4. Producto sin fecha
- Manual de usuario conciso por página/función.
- Salvaguarda de auto-cierre del chat médico-paciente (hoy depende de que el médico marque "completada" manualmente; sin eso, el chat queda abierto indefinidamente).
- Ajustar copy de marketing del chat: se activa tras cita confirmada, se autoapaga 72h después de "marcar completada" (no "tras la cita").
- Fase 3: botón "Mensajes" con badge en `/dashboard/citas` (reemplaza WhatsApp en planes de pago) + mensaje automático al crear sala de chat.
- Fase 4: Storage real para fotos/documentos del chat médico-paciente (hoy solo metadata, sin bucket).
- CAC y costos administrativos recurrentes — Manuel busca CAC cercano a $0.
- Deuda técnica menor de la vulnerabilidad de citas ya resuelta: `risk_score` y `pending_doctor` son código muerto; citas `pending_verification` vencidas no se limpian.
- Escala de z-index no coordinada en el proyecto (varios componentes usan 9999 de forma independiente).
- Botón "Volver" hardcodeado en `/dashboard/resenas` — auditar todas las páginas del dashboard con botón "Volver" y unificar con `router.back()` + fallback a `/dashboard`.
- Badge "+50% conversión" y otras afirmaciones de marketing existentes — revisar en su propia conversación, no colar en otros ajustes.

## 5. Fuera del alcance de Fable (trabajo directo de Manuel)
- Linkbuilding: colegios/asociaciones médicas, directorios de startups México, pedir a médicos actuales que enlacen su perfil.
- Notas de prensa: ángulo de verificación de credenciales/falsificación de cédulas, medios de salud/tech mexicanos y locales.

---

## 6. Encontrados en esta revisión (2026-08-03), no estaban en la lista original

_Extraídos de memorias de 6 a 34 días de antigüedad — son observaciones puntuales, no estado en vivo. Antes de actuar sobre cualquiera, confirmar contra el código/DB actual, mismo criterio que el resto de este documento. Dos hallazgos falsos positivos (memorias que decían "pendiente" pero ya estaban resueltas — panel de admin duplicado y sistema de credenciales sin commit) se descartaron de esta lista tras verificar contra `git log`; las memorias correspondientes se están corrigiendo aparte._

**Urgente / con fecha vencida:**
- **Limpieza de datos demo de MSL Virtual (Novartis)** — para la demo del 20 de julio se insertó un documento y chunk *ficticios* en `msl_documents`/`msl_chunks` (`sponsor = "Farmacéutica Demo"`, IDs `478c3f0b-fd48-4a24-a749-4c0bf3a3d533` y `510f893c-0b16-4b5b-b3e2-587227c4c7ec`) con instrucción explícita de borrarlos después de esa fecha. Hoy es 3 de agosto — si siguen ahí, están contaminando el corpus real de MSL Virtual desde hace dos semanas.

**Pricing / negocio (mismo tema que la sección 1, detalle no capturado ahí):**
- **Rediseño a 2 planes (Profesional gratis / Plus $199 MXN)** — decidido por Manuel el 2026-07-26, `PLAN_CHANGES_FROZEN = true` activo bloqueando `/dashboard/plan` y Stripe mientras tanto. Diseño de código ya resuelto (reusar el código de tier `'349'` existente para representar "Plus", sin migración). Falta implementar.
- **Stripe en modo prueba completo** (productos, 6 precios, webhook, Customer Portal) — funciona en local, pendiente commit + push a producción.
- **Cuenta de prueba de Manuel** (`drmanutapia@gmail.com`) tiene `pricing_tier` forzado manualmente a `'799'`/`'monthly'` — pendiente revertir o probar con pago real de Stripe.
- **Análisis financiero final por médico/mes** — estructura definida, montos sin calcular: falta tarifa real de AWS SNS por SMS, costo real de OpenAI de MSL Virtual (depende de uso real, no del límite teórico), comisión de Stripe (nunca restada del precio original), y costo de telemedicina (depende de investigación regulatoria aún pendiente).
- **Estadísticas con tendencia vs. mes anterior** en `/dashboard/estadisticas` — el cálculo (`mesAnteriorRes`) ya existe en `app/dashboard/page.tsx`, pero el componente visual no está construido (Fase 2 del rediseño de estadísticas).
- **Webhook `invoice.payment_failed`** + correo antes de downgrade automático — sin construir.

**Rediseño de `/dashboard` — plan detallado de 9 puntos, sin implementar** (ver sección 1 para el punto de densidad de upsells, que es parte del mismo esfuerzo):
1. Quitar barra "Perfil completo X%" cuando ya está en 100% (queda duplicada con el banner verde).
2. Resolver botón "Compartir" duplicado (banner 100% + tarjeta de perfil, casi idénticos y pegados en mobile).
3. Si "Solicitudes: 0", reemplazar el número desnudo con mensaje orientado a acción.
4. En el perfil público del médico, el logo "Salurama" del header no es cliqueable.
5. Convertir el dashboard principal en resumen mínimo con link "Ver más" hacia Stats, sin duplicar su lógica.
6. Corregir `Math.random()` en `visitas_crecimiento` (dato falso hoy).
7. "Actividad Reciente" debe mostrar la próxima cita futura agendada en vez de "sin citas hoy" cuando exista.
8. (Solo diseño, no implementar aún) Comparativa Premium contra promedio de médicos de la misma especialidad/ciudad.
9. UI en "Editar Perfil" para subir/gestionar `doctor-documents` y `doctor-photos` (buckets y políticas ya existen en Storage, falta la interfaz).

**Otros:**
- **Recordatorio de cita 24h por correo** — Edge Function `citas-reminder` ya desplegada y probada, pero está inerte: falta que Manuel (1) configure el secreto `RESEND_API_KEY` en Supabase → Edge Functions → `citas-reminder` → Secrets, y (2) corra el `cron.schedule(...)` documentado al final de la migración `20260714000001_citas_reminder_24h.sql`.
- **`clinic_address` desconectado de `professional_title`** — si un médico cambia su título (Dr./Dra.) en editar-perfil, el nombre del consultorio que ya escribió a mano no se actualiza solo. Cosmético, baja prioridad, sin resolver.
- **Fase 4 del roadmap: flujo de gestión multi-médico** — bloqueante para activar el nivel Clínica en Stripe/UI. Sin diseñar.
- **Monetización B2B con labs clínicos y seguros de práctica médica** — mencionado como línea en paralelo, sin ningún diseño todavía.
- **Deuda técnica menor de HEMA** (post Sesión 12): cron de actualización de pruebas OTS de `hema-audit-anchor` (completar proofs tras confirmación Bitcoin, ~1h) sin construir; `createServerClient`+cookies duplicado entre `app/hema/layout.tsx` y `app/hema/admin/layout.tsx`; `protocol_drugs`/`protocol_diagnoses` sin trigger de auditoría (catálogos sin `tenant_id`, necesitarán audit explícito cuando existan RPCs de gestión).

---

## Principios permanentes a respetar en todo lo anterior
- Salurama nunca certifica ni verifica públicamente — el paciente verifica en fuentes oficiales. `verification_status` es solo uso interno, nunca debe afectar visibilidad.
- `pricing_tier` nunca entra en ningún cálculo de ranking/mérito.
- Trabajo con Fable: partes chicas, pausa y resumen tras cada una, aprobación explícita antes de migraciones SQL, nunca instrucciones sin pedirlas explícitamente.
