'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { MapPin, Stethoscope, Calendar, Search, UserPlus } from 'lucide-react'

export default function Home() {
  const [doctors, setDoctors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .eq('is_active', true)
          .eq('license_verified', true)
          .limit(9)
        
        if (error) throw error
        setDoctors(data || [])
      } catch (err) {
        console.error('Error cargando médicos:', err)
        setError('No se pudieron cargar los médicos.')
      } finally {
        setLoading(false)
      }
    }
    fetchDoctors()
  }, [])

  const filteredDoctors = doctors.filter(doc => 
    doc?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc?.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#0D5C4A]">Salurama</h1>
          <nav className="hidden md:flex gap-6 text-[#475569]">
            <a href="#" className="hover:text-[#0D5C4A] transition">Especialidades</a>
            <a href="#" className="hover:text-[#0D5C4A] transition">Sobre Nosotros</a>
          </nav>
          
          <a 
            href="/registro" 
            className="bg-[#0D5C4A] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#1A7A62] transition inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Soy Médico
          </a>
        </div>
      </header>

      {/* Alerta de Error */}
      {error && isClient && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-center text-sm text-red-800">
          ⚠️ {error}
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#E8F5F1] to-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A2E] mb-6">
            Encuentra tu médico ideal, <span className="text-[#0D5C4A]">sin costos ocultos</span>
          </h2>
          <p className="text-xl text-[#475569] mb-8">
            Tu médico de confianza al alcance de tu mano 🩺
          </p>
          
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-4 text-[#475569] w-6 h-6" />
            <input
              type="text"
              placeholder="Buscar por nombre, especialidad o clínica..."
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#CBD5E1] shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C4A] text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {['Cardiología', 'Pediatría', 'Dermatología', 'Ginecología', 'Hematología'].map((spec) => (
              <button 
                key={spec} 
                onClick={() => setSearchTerm(spec)}
                className="px-4 py-2 bg-white border border-[#CBD5E1] rounded-full text-[#475569] hover:border-[#0D5C4A] hover:text-[#0D5C4A] transition text-sm"
              >
                {spec}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Listado de Médicos */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-[#1A1A2E]">Especialistas Destacados</h3>
          {loading && <span className="text-[#0D5C4A] text-sm">Cargando...</span>}
        </div>
        
        {!isClient ? (
          <div className="text-center py-12 text-[#475569]">Cargando...</div>
        ) : loading ? (
          <div className="text-center py-12 text-[#475569]">Cargando médicos...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-12 text-[#475569]">
            <p>No se encontraron médicos. ¡Sé el primero en registrarte!</p>
            <a href="/registro" className="text-[#0D5C4A] hover:underline mt-2 inline-block">
              Registrar un médico →
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <article key={doc.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border border-[#CBD5E1]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-[#E8F5F1] rounded-full flex items-center justify-center text-[#0D5C4A] font-bold text-xl">
                    {doc.full_name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-[#1A1A2E]">{doc.full_name}</h4>
                    <p className="text-[#0D5C4A] font-medium">{doc.specialty}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-[#475569] text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{doc.location_city}, {doc.location_neighborhood}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    <span>Cédula: {doc.professional_license}</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-[#1A1A2E]">
                    <Calendar className="w-4 h-4" />
                    <span>Desde ${doc.consultation_price} MXN</span>
                  </div>
                </div>

                <a 
                  href={`/doctor/${doc.id}`}
                  className="w-full mt-4 bg-[#0D5C4A] text-white py-2 rounded-lg font-medium hover:bg-[#1A7A62] transition text-center block"
                >
                  Ver Perfil
                </a>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A2E] text-white py-8 text-center">
        <p>© {new Date().getFullYear()} Salurama. Salud al alcance de todos.</p>
        <p className="text-sm text-[#475569] mt-2">Tu médico de confianza al alcance de tu mano 🩺</p>
      </footer>
    </main>
  )
}