// lib/locations.ts
// Mapeo de estados de México con sus ciudades más pobladas (5-10 por estado)

export const STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas'
] as const

export type State = typeof STATES[number]

export const CITIES_BY_STATE: Record<State, string[]> = {
  'Aguascalientes': [
    'Aguascalientes',
    'Jesús María',
    'Calvillo',
    'Rincón de Romos',
    'Asientos'
  ],
  'Baja California': [
    'Tijuana',
    'Mexicali',
    'Ensenada',
    'Tecate',
    'Playas de Rosarito',
    'San Felipe'
  ],
  'Baja California Sur': [
    'La Paz',
    'Los Cabos',
    'Comondú',
    'Loreto',
    'Mulegé'
  ],
  'Campeche': [
    'Campeche',
    'Ciudad del Carmen',
    'Champotón',
    'Escárcega',
    'Calkiní'
  ],
  'Chiapas': [
    'Tuxtla Gutiérrez',
    'Tapachula',
    'San Cristóbal de las Casas',
    'Comitán',
    'Ocosingo',
    'Palenque'
  ],
  'Chihuahua': [
    'Chihuahua',
    'Ciudad Juárez',
    'Cuauhtémoc',
    'Delicias',
    'Parral',
    'Nuevo Casas Grandes'
  ],
  'Ciudad de México': [
    'Centro',
    'Polanco',
    'Condesa',
    'Del Valle',
    'Coyoacán',
    'Tlalpan',
    'Iztapalapa',
    'Gustavo A. Madero',
    'Benito Juárez',
    'Cuauhtémoc'
  ],
  'Coahuila': [
    'Saltillo',
    'Torreón',
    'Monclova',
    'Piedras Negras',
    'Acuña',
    'Matamoros'
  ],
  'Colima': [
    'Colima',
    'Manzanillo',
    'Tecomán',
    'Villa de Álvarez',
    'Armería'
  ],
  'Durango': [
    'Durango',
    'Gómez Palacio',
    'Lerdo',
    'Santiago Papasquiaro',
    'Guadalupe Victoria'
  ],
  'Estado de México': [
    'Tlalnepantla',
    'Toluca',
    'Naucalpan',
    'Nezahualcóyotl',
    'Ecatepec',
    'Satélite',
    'Tepotzotlán',
    'Cuautitlán Izcalli',
    'Tultitlán',
    'Coacalco'
  ],
  'Guanajuato': [
    'León',
    'Irapuato',
    'Celaya',
    'Salamanca',
    'Guanajuato',
    'Silao',
    'Pénjamo'
  ],
  'Guerrero': [
    'Acapulco',
    'Chilpancingo',
    'Iguala',
    'Taxco',
    'Zihuatanejo',
    'Tlapa'
  ],
  'Hidalgo': [
    'Pachuca',
    'Tulancingo',
    'Huejutla',
    'Tizayuca',
    'Ixmiquilpan',
    'Tepeji'
  ],
  'Jalisco': [
    'Guadalajara',
    'Zapopan',
    'Tlaquepaque',
    'Tonalá',
    'Tlajomulco',
    'El Salto',
    'Tepatitlán',
    'Lagos de Moreno',
    'Puerto Vallarta',
    'Ocotlán'
  ],
  'Michoacán': [
    'Morelia',
    'Uruapan',
    'Zamora',
    'Lázaro Cárdenas',
    'Zitácuaro',
    'Apatzingán'
  ],
  'Morelos': [
    'Cuernavaca',
    'Jiutepec',
    'Cuautla',
    'Temixco',
    'Yautepec',
    'Emiliano Zapata'
  ],
  'Nayarit': [
    'Tepic',
    'Bahía de Banderas',
    'Santiago Ixcuintla',
    'Compostela',
    'Tecuala'
  ],
  'Nuevo León': [
    'Monterrey',
    'San Pedro Garza García',
    'San Nicolás de los Garza',
    'Apodaca',
    'General Escobedo',
    'Santa Catarina',
    'García',
    'Juárez',
    'Salinas Victoria',
    'Santiago'
  ],
  'Oaxaca': [
    'Oaxaca',
    'Salina Cruz',
    'Juchitán',
    'Tuxtepec',
    'Puerto Escondido',
    'Huajuapan'
  ],
  'Puebla': [
    'Puebla',
    'Tehuacán',
    'San Martín Texmelucan',
    'Atlixco',
    'Cholula',
    'Zacatlán'
  ],
  'Querétaro': [
    'Querétaro',
    'San Juan del Río',
    'Corregidora',
    'El Marqués',
    'Tequisquiapan',
    'Jalpan'
  ],
  'Quintana Roo': [
    'Cancún',
    'Playa del Carmen',
    'Chetumal',
    'Cozumel',
    'Tulum',
    'Felipe Carrillo Puerto'
  ],
  'San Luis Potosí': [
    'San Luis Potosí',
    'Soledad',
    'Ciudad Valles',
    'Matehuala',
    'Rioverde',
    'Tamazunchale'
  ],
  'Sinaloa': [
    'Culiacán',
    'Mazatlán',
    'Los Mochis',
    'Guasave',
    'Guamúchil',
    'Escuinapa'
  ],
  'Sonora': [
    'Hermosillo',
    'Ciudad Obregón',
    'Nogales',
    'San Luis Río Colorado',
    'Navojoa',
    'Guaymas',
    'Puerto Peñasco'
  ],
  'Tabasco': [
    'Villahermosa',
    'Cárdenas',
    'Comalcalco',
    'Huimanguillo',
    'Macuspana',
    'Paraíso'
  ],
  'Tamaulipas': [
    'Reynosa',
    'Matamoros',
    'Tampico',
    'Nuevo Laredo',
    'Ciudad Victoria',
    'Altamira',
    'Madero'
  ],
  'Tlaxcala': [
    'Tlaxcala',
    'Huamantla',
    'Apizaco',
    'Chiautempan',
    'Papalotla'
  ],
  'Veracruz': [
    'Veracruz',
    'Xalapa',
    'Coatzacoalcos',
    'Córdoba',
    'Poza Rica',
    'Orizaba',
    'Minatitlán',
    'Papantla'
  ],
  'Yucatán': [
    'Mérida',
    'Valladolid',
    'Progreso',
    'Tizimín',
    'Motul',
    'Ticul'
  ],
  'Zacatecas': [
    'Zacatecas',
    'Fresnillo',
    'Guadalupe',
    'Jerez',
    'Río Grande',
    'Sombrerete'
  ]
}

// Helper functions
export function getCitiesForState(state: string): string[] {
  return CITIES_BY_STATE[state as State] || []
}

export function getAllCities(): string[] {
  return Object.values(CITIES_BY_STATE).flat()
}

export function searchCities(query: string, state?: string): string[] {
  const cities = state ? getCitiesForState(state) : getAllCities()
  return cities.filter(city =>
    city.toLowerCase().includes(query.toLowerCase())
  )
}