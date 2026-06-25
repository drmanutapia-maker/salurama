'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import type { LatLng } from 'leaflet'

function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default?.src
      ?? require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png').default?.src
      ?? require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default?.src
      ?? require('leaflet/dist/images/marker-shadow.png'),
  })
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

interface DraggableMarkerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

function DraggableMarker({ lat, lng, onChange }: DraggableMarkerProps) {
  const [position, setPosition] = useState<LatLng | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')

  useEffect(() => {
    setPosition(L.latLng(lat, lng))
  }, [lat, lng, L])

  if (!position) return null

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const newPos = e.target.getLatLng() as LatLng
          setPosition(newPos)
          onChange(newPos.lat, newPos.lng)
        },
      }}
    />
  )
}

export interface LocationPickerProps {
  initialLat: number
  initialLng: number
  zoom?: number
  onLocationChange: (lat: number, lng: number) => void
}

export default function LocationPicker({
  initialLat,
  initialLng,
  zoom = 16,
  onLocationChange,
}: LocationPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng })

  useEffect(() => {
    fixLeafletIcons()
    setMounted(true)
  }, [])

  useEffect(() => {
    setCoords({ lat: initialLat, lng: initialLng })
  }, [initialLat, initialLng])

  if (!mounted) {
    return (
      <div style={{
        width: '100%', height: 300,
        background: '#F3F4F6', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 13, color: '#9CA3AF' }}>Cargando mapa…</span>
      </div>
    )
  }

  return (
    <div>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div style={{ width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap lat={coords.lat} lng={coords.lng} />
          <DraggableMarker
            lat={coords.lat}
            lng={coords.lng}
            onChange={(lat, lng) => {
              setCoords({ lat, lng })
              onLocationChange(lat, lng)
            }}
          />
        </MapContainer>
      </div>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' }}>
        {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
      </p>
    </div>
  )
}
