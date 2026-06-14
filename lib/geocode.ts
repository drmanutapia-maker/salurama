// Servicio de geocodificación gratuito usando Nominatim (OpenStreetMap)
// Rate limit: 1 request por segundo (respetar para no ser bloqueado)

interface GeocodeResult {
  lat: number
  lng: number
  formatted: string
  confidence: number
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const CACHE = new Map<string, GeocodeResult>()

// Delay para respetar rate limit
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
let lastRequest = 0

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length < 5) return null

  const cacheKey = address.toLowerCase().trim()
  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey)!
  }

  // Rate limiting: esperar si es necesario
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequest
  if (timeSinceLastRequest < 1100) {
    await sleep(1100 - timeSinceLastRequest)
  }
  lastRequest = Date.now()

  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'mx', // Priorizar México
      addressdetails: '1',
      'accept-language': 'es'
    })

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'Salurama/1.0 (contact@salurama.com)' // Requerido por Nominatim
      }
    })

    if (!response.ok) {
      console.error('Geocoding error:', response.status)
      return null
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      console.warn('No results for:', address)
      return null
    }

    const result = data[0]
    const geocoded: GeocodeResult = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      formatted: result.display_name,
      confidence: parseFloat(result.importance || '0.5')
    }

    // Validar coordenadas de México (aproximado)
    if (geocoded.lat < 14 || geocoded.lat > 33 || geocoded.lng < -118 || geocoded.lng > -86) {
      console.warn('Coordinates outside Mexico:', geocoded)
      return null
    }

    CACHE.set(cacheKey, geocoded)
    return geocoded

  } catch (error) {
    console.error('Geocoding failed:', error)
    return null
  }
}

// Función helper para construir dirección completa desde datos del doctor
export function buildFullAddress(doctor: {
  clinic_address?: string | null
  location_city?: string | null
  location_state?: string | null
  cp?: string | null
}): string {
  const parts = [
    doctor.clinic_address,
    doctor.location_city,
    doctor.location_state,
    doctor.cp,
    'México'
  ].filter(Boolean)

  return parts.join(', ')
}

// Test function
export async function testGeocode() {
  const test = await geocodeAddress('Av. Paseo de la Reforma 222, Ciudad de México')
  console.log('Test result:', test)
  return test
}