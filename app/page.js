import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* HERO SECTION - Manual de Marca */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-6xl font-black text-[#0D5C4A] tracking-tighter mb-4">
            SALURAMA
          </h1>
          <p className="text-3xl font-medium text-[#1A7A62] mb-8">
            Salud en tus manos
          </p>
          <p className="text-xl text-[#1A1A2E] max-w-2xl mx-auto">
            Tu médico de confianza al alcance de tu mano
          </p>
          
          <div className="mt-10 flex justify-center gap-4">
            <Link 
              href="/registro"
              className="bg-[#0D5C4A] text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-[#1A7A62] transition"
            >
              Soy Médico
            </Link>
            <Link 
              href="/"
              className="bg-white border-2 border-[#0D5C4A] text-[#0D5C4A] px-10 py-4 rounded-xl font-semibold text-lg hover:bg-[#E8F5F1]"
            >
              Buscar especialista
            </Link>
          </div>
        </div>
      </section>

      {/* ESPECIALISTAS DESTACADOS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-[#0D5C4A] mb-10 text-center">
          Especialistas Destacados
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Ejemplo de tarjeta (puedes agregar más después) */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-[#E8F5F1] rounded-full flex items-center justify-center text-2xl font-bold text-[#0D5C4A]">
                D
              </div>
              <div>
                <h3 className="font-bold text-xl">Dr. Juan Pérez García</h3>
                <p className="text-[#1A7A62]">Hematología</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-[#475569]">
              <p>📍 Ciudad de México, Polanco</p>
              <p>📜 Cédula: 12345678</p>
              <p>💰 Desde $800 MXN</p>
            </div>

            <Link 
              href="/doctor/1"
              className="mt-6 block w-full bg-[#0D5C4A] text-white text-center py-3.5 rounded-xl font-semibold hover:bg-[#1A7A62]"
            >
              Ver Perfil
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}