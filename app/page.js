import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      
      {/* NAVEGACIÓN SUPERIOR */}
      <nav className="bg-white shadow-sm py-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-[#0D5C4A] tracking-tighter">SALURAMA</h1>
            <span className="text-[#1A7A62] font-medium text-lg">Salud en tus manos</span>
          </div>
          
          <Link 
            href="/registro"
            className="bg-[#0D5C4A] hover:bg-[#1A7A62] text-white px-8 py-3 rounded-2xl font-semibold flex items-center gap-2 transition"
          >
            👨‍⚕️ Soy Médico
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-white py-20 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-5xl font-black text-[#0D5C4A] mb-4">
            Salud en tus manos
          </h2>
          <p className="text-2xl text-[#1A1A2E] mb-10">
            Tu médico de confianza al alcance de tu mano
          </p>
        </div>
      </section>

      {/* BARRA DE BÚSQUEDA GRANDE */}
      <div className="max-w-4xl mx-auto -mt-8 px-6 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Especialidad (ej: Hematología)" 
              className="border border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-[#0D5C4A]"
            />
            <input 
              type="text" 
              placeholder="Ubicación (ej: Polanco, CDMX)" 
              className="border border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-[#0D5C4A]"
            />
            <button className="bg-[#0D5C4A] hover:bg-[#1A7A62] text-white font-semibold text-lg py-4 rounded-2xl transition">
              Buscar especialistas
            </button>
          </div>
        </div>
      </div>

      {/* ESPECIALISTAS DESTACADOS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center text-[#0D5C4A] mb-12">
          Especialistas Destacados
        </h3>
        {/* Aquí puedes ir agregando más tarjetas después */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Tarjeta de ejemplo */}
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[#E8F5F1] rounded-2xl flex items-center justify-center text-4xl font-bold text-[#0D5C4A]">D</div>
              <div>
                <h4 className="font-bold text-2xl">Dr. Juan Pérez García</h4>
                <p className="text-[#1A7A62]">Hematología</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">📍 Polanco, CDMX</p>
            <p className="text-sm text-gray-600">💰 Desde $800 MXN</p>
            <Link href="/doctor/1" className="mt-8 block w-full bg-[#0D5C4A] text-white text-center py-4 rounded-2xl font-semibold">
              Ver Perfil
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}