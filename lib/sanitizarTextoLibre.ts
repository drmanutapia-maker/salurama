// Serializa un objeto para insertarlo de forma segura dentro de
// <script type="application/ld+json"> (DoctorProfileClient.tsx, JSON-LD del
// perfil público con dangerouslySetInnerHTML). JSON.stringify() por sí solo
// NO escapa la secuencia "</script>" dentro de un valor de texto -- si un
// campo libre (reseña, biografía) la contiene literalmente, el parser HTML
// cierra el <script> original ahí mismo y cualquier marcado/script que siga
// se ejecuta en el navegador de cualquier visitante del perfil.
//
// Se escapa "<" como < (escape válido de JSON, no de HTML): cualquier
// consumidor real del JSON-LD (Google, u otro parser) sigue viendo el
// carácter "<" verdadero al parsear el string -- solo se vuelve inerte para
// el tokenizador HTML que procesa el contenido crudo del <script>, que es
// exactamente el único punto inseguro. No toca lo que se guarda en la base
// de datos (reviews.comment, doctors.about_me) ni cómo se muestran en
// cualquier otro lado de la app (ahí ya los renderiza JSX normal, que React
// ya escapa solo).
export function jsonLdSeguro(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c')
}
