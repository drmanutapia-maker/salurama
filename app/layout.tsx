import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediOpen - Directorio Médico",
  description: "Encuentra médicos especialistas verificados",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
    <body className="antialiased">
  {children}
  <footer className="bg-[#0D5C4A] text-white py-10 text-center">
    <p className="text-sm font-medium">
      © 2026 Salurama S.A. de C.V. | Salud en tus manos
    </p>
    <div className="mt-4 flex justify-center gap-8 text-sm">
      <a href="/aviso-de-privacidad.html" className="hover:text-[#F59E0B] hover:underline">
        Aviso de Privacidad
      </a>
      <a href="/terminos-y-condiciones.html" className="hover:text-[#F59E0B] hover:underline">
        Términos y Condiciones
      </a>
    </div>
  </footer>
</body>
    

