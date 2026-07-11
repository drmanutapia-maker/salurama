// Casos de prueba compartidos entre los scripts de calibración de detección
// de dominio (scripts/calibrate-search-threshold.ts y
// scripts/calibrate-query-rewrite.ts). Uso único — no se integra a producción.

export type Category = 'debe_pasar' | 'debe_fallar'

export type TestCase = {
  question:  string
  category:  Category
  note:      string
}

export const TEST_CASES: TestCase[] = [
  // Debe pasar el piso: seguimientos elípticos legítimos dentro del dominio
  // (dependen del contexto previo para tener sentido, pero el tema de fondo
  // sigue siendo mieloma/hematología).
  { question: '¿Y qué pasa si el paciente tiene insuficiencia renal?',                category: 'debe_pasar', note: 'seguimiento elíptico — comorbilidad' },
  { question: '¿Cuál sería la alternativa en ese caso?',                              category: 'debe_pasar', note: 'seguimiento elíptico — pronombre "ese caso"' },
  { question: '¿Y en pacientes de edad avanzada?',                                    category: 'debe_pasar', note: 'seguimiento elíptico — subgrupo etario' },
  { question: '¿Qué dosis se recomienda entonces?',                                   category: 'debe_pasar', note: 'seguimiento elíptico — dosificación' },
  { question: '¿Eso aplica también a los pacientes con alto riesgo citogenético?',    category: 'debe_pasar', note: 'seguimiento elíptico — subgrupo de riesgo' },
  { question: '¿Y cuáles son los efectos adversos más comunes en ese escenario?',     category: 'debe_pasar', note: 'seguimiento elíptico — toxicidad' },

  // Elípticos extremos: casi sin contenido semántico propio, el caso límite
  // real de lo que un usuario podría escribir como seguimiento legítimo.
  { question: '¿Y eso?',                                                              category: 'debe_pasar', note: 'elíptico extremo — casi sin contenido' },
  { question: '¿Por qué?',                                                            category: 'debe_pasar', note: 'elíptico extremo — casi sin contenido' },
  { question: '¿Hay otra opción?',                                                    category: 'debe_pasar', note: 'elíptico extremo — casi sin contenido' },
  { question: '¿Es seguro?',                                                          category: 'debe_pasar', note: 'elíptico extremo — casi sin contenido' },
  { question: '¿Y si no funciona?',                                                   category: 'debe_pasar', note: 'elíptico extremo — casi sin contenido' },

  // Debe fallar el piso: fuera de dominio, sin relación real con mieloma/hematología.
  { question: '¿Qué es la diabetes tipo 2?',                                          category: 'debe_fallar', note: 'otra condición médica, no oncohematológica' },
  { question: '¿Cuál es la capital de Francia?',                                      category: 'debe_fallar', note: 'trivia, no médico' },
  { question: 'Ayúdame a redactar un correo para mi jefe',                            category: 'debe_fallar', note: 'tarea administrativa, no médica' },
  { question: '¿Cómo hago una pasta carbonara?',                                      category: 'debe_fallar', note: 'cocina' },
  { question: '¿Qué opinas del nuevo iPhone?',                                        category: 'debe_fallar', note: 'consumo/tecnología' },

  // El caso más peligroso: fuera de dominio (no es mieloma) pero comparte
  // vocabulario clínico/oncohematológico con el corpus — el que puede
  // engañar al embedding aislado por jerga compartida en vez de tema real.
  { question: '¿Cuál es el tratamiento de primera línea para la leucemia mieloide aguda?', category: 'debe_fallar', note: 'otra especialidad hematológica — LMA' },
  { question: '¿Qué es el linfoma de Hodgkin?',                                       category: 'debe_fallar', note: 'otra especialidad hematológica — linfoma' },
  { question: '¿Cómo se diagnostica la anemia aplásica?',                             category: 'debe_fallar', note: 'otra especialidad hematológica — anemia aplásica' },
  { question: '¿Cuáles son los criterios de remisión en linfoma no Hodgkin?',         category: 'debe_fallar', note: 'otra especialidad hematológica — linfoma no Hodgkin' },
]
