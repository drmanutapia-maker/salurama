import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      
      {/* NAVEGACIÓN SUPERIOR - Sticky */}
      <nav className="bg-white shadow-sm py-5 sticky top-0 z-50 border-b border-[#E8F5F1]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-[#0D5C4A]">SALURAMA</h1>
            <span className="text-[#1A7A62] font-medium text-lg hidden md:block">Salud en tus manos</span>
          </div>
          
          <Link 
            href="/registro"
            className="bg-[#0D5C4A] hover:bg-[#1A7A62] text-white px-8 py-3.5 rounded-2xl font-semibold flex items-center gap-2 transition-all"
          >
            👨‍⚕️ Soy Médico
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-white pt-16 pb-10 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-6xl font-black text-[#0D5C4A] tracking-tighter mb-3">
            Salud en tus manos
          </h1>
          <p className="text-2xl text-[#1A1A2E] font-medium">
            Tu médico de confianza al alcance de tu mano
          </p>
        </div>
      </section>

      {/* BARRA DE BÚSQUEDA PRINCIPAL - Muy visible y grande */}
      <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-[#E8F5F1]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <input 
                type="text" 
                placeholder="Especialidad (ej: Hematología)" 
                className="w-full border border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-[#0D5C4A] placeholder:text-gray-400"
              />
            </div>
            <div>
              <input 
                type="text" 
                placeholder="Ubicación (ej: Polanco, CDMX)" 
                className="w-full border border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-[#0D5C4A] placeholder:text-gray-400"
              />
            </div>
            <button className="bg-[#0D5C4A] hover:bg-[#1A7A62] text-white font-semibold text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
              🔍 Buscar especialistas
            </button>
          </div>
          <p className="text-center text-xs text-[#6B7280] mt-4">Búsqueda gratuita • Especialistas verificados</p>
        </div>
      </div>

      {/* ESPECIALISTAS DESTACADOS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-[#0D5C4A] mb-12 text-center">Especialistas Destacados</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Tarjeta ejemplo */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 bg-[#E8F5F1] rounded-2xl flex items-center justify-center text-4xl font-bold text-[#0D5C4A]">D</div>
              <div>
                <h3 className="font-bold text-2xl">Dr. Juan Pérez García</h3>
                <p className="text-[#1A7A62]">Hematología</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">📍 Polanco, CDMX</p>
            <p className="text-sm text-gray-600">💰 Desde $800 MXN</p>
            <Link href="/doctor/1" className="mt-8 block w-full bg-[#0D5C4A] text-white text-center py-4 rounded-2xl font-semibold hover:bg-[#1A7A62]">
              Ver Perfil
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}