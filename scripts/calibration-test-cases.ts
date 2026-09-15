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

  // Debe pasar el piso: preguntas reales sobre patologías del corpus ampliado
  // de Componente 1 (27 patologías más allá de mieloma), escritas como un
  // médico las escribiría de verdad — con la sigla en español, no el nombre
  // expandido. Esto es lo que expuso el bug real (MSL Virtual respondía "no
  // tengo contexto" para LLA a pesar de tener 116 chunks ingeridos) — el
  // corpus está en inglés y las siglas en español no comparten texto con su
  // equivalente en inglés, así que estos casos solo pasan de verdad una vez
  // que la búsqueda traduce/normaliza la consulta antes de embeder (ver
  // translateForSearch en app/api/msl-chat/route.ts). No agregar aquí casos
  // de una sola patología puntual — el objetivo es que la calibración quede
  // representativa de "el corpus tiene muchas patologías", no de hematología
  // específicamente, para que siga siendo válida cuando se agreguen otras
  // especialidades.
  { question: 'Esquema de primera línea para LLA',                                    category: 'debe_pasar', note: 'patología del corpus ampliado — sigla en español (leucemia_linfoblastica_aguda)' },
  { question: '¿Cuál es el tratamiento de primera línea para la leucemia mieloide aguda?', category: 'debe_pasar', note: 'patología del corpus ampliado (leucemia_mieloide_aguda)' },
  { question: '¿Qué es el linfoma de Hodgkin?',                                       category: 'debe_pasar', note: 'patología del corpus ampliado (linfoma_hodgkin)' },
  { question: '¿Cuál es la dosis de referencia en LLC?',                              category: 'debe_pasar', note: 'sigla en español — leucemia_linfocitica_cronica' },
  { question: '¿Cómo se trata la PTI en adultos?',                                    category: 'debe_pasar', note: 'sigla en español — purpura_trombocitopenica_inmune' },
  { question: '¿Qué esquemas existen para el síndrome antifosfolípido (SAF)?',        category: 'debe_pasar', note: 'sigla en español — sindrome_antifosfolipido' },

  // Debe fallar el piso: fuera de dominio, sin relación real con el corpus.
  // Deliberadamente NO se usa aquí "otra patología hematológica" como
  // negativo (ese fue el error original de esta calibración: asumía que
  // cualquier patología fuera de mieloma estaba fuera del corpus, lo cual
  // dejó de ser cierto en cuanto Componente 1 ingirió 27 patologías más).
  // Los negativos deben ser géneramente ajenos a cualquier corpus médico,
  // para que sigan siendo válidos sin importar cuántas especialidades se
  // agreguen a futuro.
  { question: '¿Qué es la diabetes tipo 2?',                                          category: 'debe_fallar', note: 'otra condición médica, fuera del alcance actual del corpus' },
  { question: '¿Cuál es la capital de Francia?',                                      category: 'debe_fallar', note: 'trivia, no médico' },
  { question: 'Ayúdame a redactar un correo para mi jefe',                            category: 'debe_fallar', note: 'tarea administrativa, no médica' },
  { question: '¿Cómo hago una pasta carbonara?',                                      category: 'debe_fallar', note: 'cocina' },
  { question: '¿Qué opinas del nuevo iPhone?',                                        category: 'debe_fallar', note: 'consumo/tecnología' },
  { question: '¿Cómo se diagnostica la anemia aplásica?',                             category: 'debe_fallar', note: 'patología hematológica NO presente en el corpus actual' },
]
